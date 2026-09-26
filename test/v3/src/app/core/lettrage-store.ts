import { Injectable, computed, signal } from '@angular/core';
import { WizardStepMeta } from './dossier-wizard-store';
import { initialLettrageLines, buildTiers } from './lettrage-data';
import { allocate, allocatedTotal, evaluateMatch, nextLettrageCode } from './lettrage-logic';
import { LettrageAuditEntry, LettrageLine, LettrageRecord, LettrageSide } from './models';
import { roundMoney, sumMoney } from './money';

const byDateThenRef = (a: LettrageLine, b: LettrageLine) =>
  a.date.localeCompare(b.date) || a.reference.localeCompare(b.reference) || a.id.localeCompare(b.id);

const todayIso = () => new Date().toISOString().slice(0, 10);

/**
 * Parcours 3 : « Lettrer un règlement avec une facture ».
 *
 * 4 étapes : choix du tiers, lignes à lettrer (avec indicateur de
 * correspondance en temps réel), confirmation (uniquement pour un lettrage
 * PARTIEL, un lettrage exact se fait en un clic), résultat.
 *
 * Tout est en signaux : aucune valeur de formulaire n'est lue dans un
 * `computed()`, ce qui évite le piège qui figeait les signaux du parcours 1.
 */
@Injectable({ providedIn: 'root' })
export class LettrageStore {
  readonly tiers = buildTiers();

  readonly steps: WizardStepMeta[] = [
    { index: 1, label: 'Choix du tiers' },
    { index: 2, label: 'Lignes à lettrer' },
    { index: 3, label: 'Confirmation' },
    { index: 4, label: 'Résultat' },
  ];

  /* ---- Données (en attendant l'API : tout vit en mémoire) ---- */
  readonly lines = signal<LettrageLine[]>(initialLettrageLines());
  readonly records = signal<LettrageRecord[]>([]);
  readonly auditTrail = signal<LettrageAuditEntry[]>([]);

  /* ---- État de l'assistant ---- */
  readonly currentStep = signal(1);
  readonly tiersId = signal('');
  readonly tiersTouched = signal(false);
  readonly selectedIds = signal<readonly string[]>([]);
  readonly error = signal<string | null>(null);

  /** Dernier lettrage effectué, affiché à l'étape 4. */
  readonly result = signal<LettrageRecord | null>(null);
  /** Confirmation dédiée avant d'annuler un lettrage (action tracée). */
  readonly cancelPending = signal(false);

  /* ---- Dérivés ---- */
  readonly selectedTiers = computed(() => this.tiers.find((t) => t.id === this.tiersId()) ?? null);

  /** Lignes du tiers courant qui ne sont pas entièrement lettrées, les plus anciennes d'abord. */
  readonly openLines = computed(() =>
    this.lines()
      .filter((l) => l.tiersId === this.tiersId() && l.restant > 0)
      .sort(byDateThenRef),
  );
  readonly factures = computed(() => this.openLines().filter((l) => l.side === 'facture'));
  readonly paiements = computed(() => this.openLines().filter((l) => l.side === 'paiement'));
  readonly hasOpenLines = computed(() => this.openLines().length > 0);

  /** Nombre de lignes en attente par tiers, pour la liste de choix de l'étape 1. */
  readonly tiersSummaries = computed(() => {
    const all = this.lines();
    return this.tiers.map((t) => ({
      tiers: t,
      openCount: all.filter((l) => l.tiersId === t.id && l.restant > 0).length,
    }));
  });

  private readonly selectedSet = computed(() => new Set(this.selectedIds()));
  readonly selectedFactures = computed(() => this.factures().filter((l) => this.selectedSet().has(l.id)));
  readonly selectedPaiements = computed(() => this.paiements().filter((l) => this.selectedSet().has(l.id)));

  readonly match = computed(() => {
    const f = this.selectedFactures();
    const p = this.selectedPaiements();
    return evaluateMatch(
      sumMoney(f.map((l) => l.restant)),
      sumMoney(p.map((l) => l.restant)),
      f.length,
      p.length,
    );
  });
  readonly canLetter = computed(() => this.match().state === 'exact' || this.match().state === 'partial');

  /** Ce que le tiers doit encore (factures) moins ce qu'il a déjà réglé sans affectation (paiements). */
  readonly position = computed(() => {
    const due = sumMoney(this.factures().map((l) => l.restant));
    const paid = sumMoney(this.paiements().map((l) => l.restant));
    return { due, paid, net: roundMoney(due - paid) };
  });

  readonly canGoNext = computed(() => this.tiersId() !== '');

  /* ---- Étape 1 ---- */
  selectTiers(id: string) {
    if (!this.tiers.some((t) => t.id === id)) return;
    this.tiersId.set(id);
    this.tiersTouched.set(true);
    this.selectedIds.set([]);
    this.error.set(null);
  }

  goToLines() {
    this.tiersTouched.set(true);
    if (!this.canGoNext()) return;
    this.error.set(null);
    this.currentStep.set(2);
  }

  /* ---- Étape 2 ---- */
  isSelected(id: string): boolean {
    return this.selectedSet().has(id);
  }

  toggleLine(id: string) {
    if (this.currentStep() !== 2) return;
    // Seules les lignes encore ouvertes du tiers courant peuvent être cochées.
    if (!this.openLines().some((l) => l.id === id)) return;
    this.error.set(null);
    this.selectedIds.update((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  }

  selectAll(side: LettrageSide) {
    if (this.currentStep() !== 2) return;
    const sideIds = (side === 'facture' ? this.factures() : this.paiements()).map((l) => l.id);
    this.error.set(null);
    this.selectedIds.update((ids) => [...ids.filter((id) => !sideIds.includes(id)), ...sideIds]);
  }

  clearSelection(side: LettrageSide) {
    const sideIds = (side === 'facture' ? this.factures() : this.paiements()).map((l) => l.id);
    this.selectedIds.update((ids) => ids.filter((id) => !sideIds.includes(id)));
  }

  backToTiers() {
    this.selectedIds.set([]);
    this.error.set(null);
    this.currentStep.set(1);
  }

  /** « Lettrer » (exact) fait le lettrage tout de suite ; un lettrage partiel passe par la confirmation. */
  requestLettrage() {
    if (this.currentStep() !== 2) return;
    const state = this.match().state;
    if (state === 'exact') this.commit();
    else if (state === 'partial') this.currentStep.set(3);
  }

  /* ---- Étape 3 ---- */
  cancelConfirm() {
    this.currentStep.set(2);
  }

  confirmPartial() {
    if (this.currentStep() !== 3) return;
    if (this.match().state !== 'partial') {
      // La sélection a changé depuis l'écran de confirmation : on ne lettre rien en silence.
      this.error.set('La sélection a changé depuis la confirmation. Vérifiez-la avant de lettrer.');
      this.currentStep.set(2);
      return;
    }
    this.commit();
  }

  /* ---- Étape 4 ---- */
  /** « Lettrer un autre règlement » : même tiers, on retourne directement à la liste des lignes. */
  startAnother() {
    this.clearResult();
    this.selectedIds.set([]);
    this.currentStep.set(2);
  }

  changeTiers() {
    this.clearResult();
    this.selectedIds.set([]);
    this.tiersId.set('');
    this.tiersTouched.set(false);
    this.currentStep.set(1);
  }

  requestCancel() {
    const rec = this.result();
    if (rec && !rec.annule) this.cancelPending.set(true);
  }

  abortCancel() {
    this.cancelPending.set(false);
  }

  /** Annule le dernier lettrage : les lignes redeviennent non lettrées et l'action est tracée. */
  confirmCancel() {
    const rec = this.result();
    if (!rec || rec.annule) return;
    // Le lettrage à annuler doit encore être actif dans le registre (jamais annuler deux fois).
    const stored = this.records().find((r) => r.tiersId === rec.tiersId && r.code === rec.code);
    if (!stored || stored.annule) return;

    this.lines.update((ls) =>
      ls.map((l) => {
        const a = rec.lignes.find((x) => x.ligneId === l.id);
        return a ? { ...l, restant: Math.min(l.montant, roundMoney(l.restant + a.montant)) } : l;
      }),
    );
    const cancelled: LettrageRecord = { ...stored, annule: true };
    this.records.update((rs) => rs.map((r) => (r === stored ? cancelled : r)));
    this.result.set(cancelled);
    this.cancelPending.set(false);
    const code = this.tiers.find((t) => t.id === rec.tiersId)?.code ?? rec.tiersId;
    this.log(`Lettrage ${rec.code} annulé sur le compte ${code}, ${rec.montant} FCFA redevenus non lettrés`);
  }

  /* ---- Cycle de vie ---- */
  /** À l'arrivée sur la page : on ne réaffiche pas l'écran de résultat d'un lettrage précédent. */
  enter() {
    if (this.currentStep() === 4) this.reset();
  }

  /** Repart de l'étape 1 sans toucher aux données de lettrage. */
  reset() {
    this.clearResult();
    this.selectedIds.set([]);
    this.tiersId.set('');
    this.tiersTouched.set(false);
    this.error.set(null);
    this.currentStep.set(1);
  }

  /** Remet aussi les données de démonstration à zéro (tests, démonstration). */
  resetData() {
    this.lines.set(initialLettrageLines());
    this.records.set([]);
    this.auditTrail.set([]);
    this.reset();
  }

  /** Pour les points de progression : on peut revenir en arrière, jamais sauter en avant. */
  goBackTo(step: number) {
    const current = this.currentStep();
    if (current >= 4 || step < 1 || step >= current) return;
    this.error.set(null);
    this.currentStep.set(step);
  }

  /* ---- Interne ---- */
  private commit() {
    const tiers = this.selectedTiers();
    const match = this.match();
    if (!tiers) return;
    if (match.state !== 'exact' && match.state !== 'partial') {
      this.error.set('Cochez au moins une ligne de chaque côté avant de lettrer.');
      this.currentStep.set(2);
      return;
    }

    // Les lignes cochées doivent toujours être disponibles (une autre saisie peut les avoir lettrées entre-temps).
    const stillOpen = this.selectedFactures().length + this.selectedPaiements().length;
    if (stillOpen !== this.selectedIds().length) {
      this.selectedIds.update((ids) => ids.filter((id) => this.openLines().some((l) => l.id === id)));
      this.error.set('Certaines lignes cochées ne sont plus disponibles : elles ont déjà été lettrées. Vérifiez votre sélection.');
      this.currentStep.set(2);
      return;
    }

    // Jamais au-delà du montant disponible : on répartit puis on vérifie que tout a bien été affecté.
    const allocFactures = allocate(this.selectedFactures(), match.lettrable);
    const allocPaiements = allocate(this.selectedPaiements(), match.lettrable);
    if (allocatedTotal(allocFactures) !== match.lettrable || allocatedTotal(allocPaiements) !== match.lettrable) {
      this.error.set(`Le montant maximum lettrable est de ${match.lettrable} FCFA.`);
      this.currentStep.set(2);
      return;
    }

    const all = [...allocFactures, ...allocPaiements];
    this.lines.update((ls) =>
      ls.map((l) => {
        const a = all.find((x) => x.ligneId === l.id);
        return a ? { ...l, restant: roundMoney(l.restant - a.montant) } : l;
      }),
    );

    const record: LettrageRecord = {
      code: nextLettrageCode(this.records().filter((r) => r.tiersId === tiers.id).length),
      tiersId: tiers.id,
      date: todayIso(),
      montant: match.lettrable,
      reste: match.reste,
      resteSide: match.resteSide,
      statut: match.state === 'exact' ? 'total' : 'partiel',
      lignes: all,
      annule: false,
    };
    this.records.update((rs) => [...rs, record]);
    this.result.set(record);
    this.cancelPending.set(false);
    this.selectedIds.set([]);
    this.error.set(null);
    this.currentStep.set(4);
    this.log(
      `Lettrage ${record.code} ${record.statut === 'total' ? 'total' : 'partiel'} créé sur le compte ${tiers.code}, ${record.montant} FCFA lettrés`,
    );
  }

  private clearResult() {
    this.result.set(null);
    this.cancelPending.set(false);
  }

  private log(what: string) {
    this.auditTrail.update((t) => [...t, { when: new Date().toISOString(), what }]);
  }
}
