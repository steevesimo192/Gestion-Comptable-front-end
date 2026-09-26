import { Injectable, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ValidationErrors, Validators } from '@angular/forms';
import { map } from 'rxjs';
import { LineValue, computeTotals, describeLineIssue } from './entry-logic';
import { WizardStepMeta } from './dossier-wizard-store';
import { AccountOption } from './models';
import { CHART_OF_ACCOUNTS, JOURNALS, LOCKED_MONTHS } from './entry-wizard-data';

interface DraftShape {
  informations: { journalId: string; date: string; piece: string; libelle: string };
  lignes: LineValue[];
}

const DRAFT_KEY = 'gc.entry-wizard.draft.v1';

/** Une ligne d'écriture doit avoir un débit OU un crédit, jamais les deux, jamais aucun, jamais négatif. */
function oneOfDebitCreditValidator(control: AbstractControl): ValidationErrors | null {
  const debit = Number(control.get('debit')?.value) || 0;
  const credit = Number(control.get('credit')?.value) || 0;
  if (debit < 0 || credit < 0) return { negative: true };
  if (debit > 0 && credit > 0) return { both: true };
  if (debit === 0 && credit === 0) return { none: true };
  return null;
}

/**
 * Fabrique UNE ligne d'écriture, avec toujours les mêmes règles (compte obligatoire,
 * débit xor crédit). Utilisée partout : ligne vide, ajout, reprise d'un brouillon.
 * (Avant, la reprise d'un brouillon recréait les lignes sans « compte obligatoire » :
 * une ligne sans compte pouvait alors être comptabilisée.)
 */
function buildLine(fb: FormBuilder, value: Partial<LineValue> = {}) {
  return fb.nonNullable.group(
    {
      compte: [value.compte ?? '', Validators.required],
      libelle: [value.libelle ?? ''],
      debit: fb.control<number | null>(value.debit ?? null),
      credit: fb.control<number | null>(value.credit ?? null),
    },
    { validators: oneOfDebitCreditValidator },
  );
}

/**
 * Parcours 2 : « Saisir une écriture comptable ».
 * 4 étapes : informations générales, lignes de l'écriture (avec équilibre en
 * temps réel), confirmation (uniquement pour comptabiliser, une écriture en
 * brouillon saute cette étape), résultat.
 *
 * RÈGLE D'OR de ce fichier : `FormControl.value`, `.valid`, `.status`... ne sont
 * PAS des signaux. Les lire dans un `computed()` ne crée aucune dépendance, et le
 * résultat se fige. On passe donc toujours par les signaux ci-dessous
 * (`informationsValue`, `lignesValue`, `informationsStatus`, `lignesStatus`).
 */
@Injectable({ providedIn: 'root' })
export class EntryWizardStore {
  private readonly fb = inject(FormBuilder);

  readonly journals = JOURNALS;
  readonly accounts = CHART_OF_ACCOUNTS;

  readonly steps: WizardStepMeta[] = [
    { index: 1, label: 'Informations générales' },
    { index: 2, label: "Lignes de l'écriture" },
    { index: 3, label: 'Confirmation' },
    { index: 4, label: 'Résultat' },
  ];

  readonly informations = this.fb.nonNullable.group({
    journalId: ['', Validators.required],
    date: ['', Validators.required],
    piece: [''],
    libelle: ['', Validators.required],
  });

  readonly lignes = this.fb.array([buildLine(this.fb), buildLine(this.fb)]);

  // `getRawValue()` (et non la valeur émise par valueChanges) : le type est complet, sans `undefined`,
  // ce qui évite les `!` et les `?? ''` dans les gabarits.
  readonly informationsValue = toSignal(
    this.informations.valueChanges.pipe(map(() => this.informations.getRawValue())),
    { initialValue: this.informations.getRawValue() },
  );
  readonly lignesValue = toSignal(this.lignes.valueChanges.pipe(map(() => this.lignes.getRawValue())), {
    initialValue: this.lignes.getRawValue(),
  });
  readonly informationsStatus = toSignal(this.informations.statusChanges, { initialValue: this.informations.status });
  readonly lignesStatus = toSignal(this.lignes.statusChanges, { initialValue: this.lignes.status });

  readonly currentStep = signal(1);
  readonly submitted = signal<'brouillon' | 'comptabilisee' | null>(null);
  readonly hasDraft = signal(false);
  /** Référence attribuée au moment de la comptabilisation (et non recalculée à chaque affichage). */
  readonly reference = signal('');
  /** Message affiché à l'étape 2 quand la comptabilisation a été refusée au dernier moment. */
  readonly postError = signal<string | null>(null);

  private pendingDraft: DraftShape | null = null;
  /** Vrai pendant qu'on modifie le formulaire par programme : on n'écrit alors pas de brouillon intermédiaire. */
  private suspendDraft = false;

  readonly selectedJournal = computed(() => this.journals.find((j) => j.id === this.informationsValue().journalId) ?? null);

  /** AAAA-MM à partir de la date comptable choisie, pour vérifier le verrouillage de la période. */
  readonly periodOfDate = computed(() => this.informationsValue().date.slice(0, 7));
  readonly periodLocked = computed(() => LOCKED_MONTHS.includes(this.periodOfDate()));

  private readonly totals = computed(() => computeTotals(this.lignesValue()));
  readonly totalDebit = computed(() => this.totals().debit);
  readonly totalCredit = computed(() => this.totals().credit);
  readonly gap = computed(() => this.totals().gap);
  readonly balanced = computed(() => this.totals().balanced);

  readonly linesReady = computed(() => this.lignesStatus() === 'VALID' && this.lignesValue().length >= 2);
  readonly canPost = computed(() => this.linesReady() && this.balanced() && !this.periodLocked());
  readonly canSaveDraft = computed(() => this.informationsStatus() === 'VALID' && this.lignesValue().some((l) => l.compte));

  /** L'utilisateur a commencé à saisir des lignes : à partir de là, on explique ce qui bloque « Comptabiliser ». */
  private readonly started = computed(() => this.lignesValue().some((l) => l.compte || l.debit || l.credit));

  /** Raisons (en clair) pour lesquelles « Comptabiliser » est indisponible. Vide si tout est bon ou si rien n'est saisi. */
  readonly postBlockers = computed<string[]>(() => {
    if (this.canPost() || !this.started()) return [];
    const reasons: string[] = [];
    if (this.periodLocked()) reasons.push('la période de la date comptable est clôturée.');
    const lines = this.lignesValue();
    if (lines.length < 2) reasons.push('une écriture comporte au moins deux lignes.');
    lines.forEach((l, i) => {
      const issue = describeLineIssue(l);
      if (issue) reasons.push(`ligne ${i + 1} : ${issue}`);
    });
    if (!this.balanced() && this.totalDebit() + this.totalCredit() > 0) reasons.push('le débit et le crédit doivent être égaux.');
    return reasons;
  });

  /** Compte de tiers utilisé dans l'écriture, s'il y en a un : sert de « Tiers » dans le récapitulatif. */
  readonly tiers = computed(() => {
    const line = this.lignesValue().find((l) => {
      const acc = this.accounts.find((a) => a.code === l.compte);
      return acc?.kind === 'tiers-client' || acc?.kind === 'tiers-fournisseur';
    });
    if (!line) return null;
    return this.accounts.find((a) => a.code === line.compte) ?? null;
  });

  constructor() {
    this.restoreDraft();
    this.informations.valueChanges.subscribe(() => this.autoSave());
    this.lignes.valueChanges.subscribe(() => this.autoSave());
  }

  accountLabel(code: string): string {
    return this.accounts.find((a) => a.code === code)?.label ?? code;
  }

  /** Comptes dont le code ou le libellé correspond à la recherche ; sert aussi de suggestion si rien n'est trouvé. */
  searchAccounts(query: string): AccountOption[] {
    const q = query.trim().toLowerCase();
    if (!q) return this.accounts;
    return this.accounts.filter((a) => a.code.includes(q) || a.label.toLowerCase().includes(q));
  }

  addLine() {
    this.lignes.push(buildLine(this.fb));
  }

  removeLine(index: number) {
    if (this.lignes.length > 2) this.lignes.removeAt(index);
  }

  /** Étape 1 → 2. */
  goToStep1() {
    this.informations.markAllAsTouched();
    if (this.informations.invalid || this.periodLocked()) return;
    this.postError.set(null);
    this.currentStep.set(2);
  }

  backToInfo() {
    this.currentStep.set(1);
  }

  /** Points de progression : on peut revenir en arrière, jamais sauter en avant ni quitter un résultat. */
  goBackTo(step: number) {
    if (this.submitted() || step < 1 || step >= this.currentStep()) return;
    this.currentStep.set(step);
  }

  requestPost() {
    this.lignes.markAllAsTouched();
    this.postError.set(null);
    if (!this.canPost()) return;
    this.currentStep.set(3);
  }

  cancelConfirm() {
    this.currentStep.set(2);
  }

  confirmPost() {
    // Un double clic sur « Confirmer » ne doit jamais comptabiliser deux fois.
    if (this.currentStep() !== 3 || this.submitted()) return;
    // Parcours 2 : la période peut avoir été verrouillée entre-temps ; on revérifie au dernier moment.
    if (!this.canPost()) {
      this.postError.set(
        this.periodLocked()
          ? 'Cette écriture ne peut plus être comptabilisée : la période de sa date comptable vient d\'être clôturée.'
          : "Cette écriture ne peut plus être comptabilisée : elle n'est plus équilibrée ou une ligne est incomplète.",
      );
      this.currentStep.set(2);
      return;
    }
    this.reference.set(this.makeReference());
    this.submitted.set('comptabilisee');
    this.currentStep.set(4);
    this.clearDraft();
  }

  saveAsDraft() {
    this.informations.markAllAsTouched();
    if (!this.canSaveDraft()) return;
    // La copie locale tient lieu de brouillon enregistré (pas encore d'API) : on la garde,
    // elle sera proposée à la reprise si l'utilisateur quitte puis revient.
    this.persistDraft();
    this.submitted.set('brouillon');
    this.currentStep.set(4);
  }

  continueEditingDraft() {
    this.submitted.set(null);
    this.currentStep.set(2);
  }

  /** À l'arrivée sur la page : on n'affiche jamais l'écran de résultat d'une saisie précédente. */
  enter() {
    if (!this.submitted()) return;
    this.resetForm();
    this.restoreDraft();
  }

  reset() {
    this.resetForm();
    this.clearDraft();
  }

  /**
   * « Saisir une nouvelle écriture ». Si l'écriture qu'on vient de quitter était un brouillon
   * enregistré, on le garde et on propose de le reprendre : l'enregistrer puis le perdre en
   * démarrant une autre saisie serait une mauvaise surprise.
   */
  startNew() {
    const keepSavedDraft = this.submitted() === 'brouillon';
    this.resetForm();
    if (keepSavedDraft) this.restoreDraft();
    else this.clearDraft();
  }

  applyDraft() {
    const draft = this.pendingDraft;
    if (draft) {
      this.suspendDraft = true;
      try {
        this.informations.patchValue(draft.informations);
        this.lignes.clear();
        const lines: Partial<LineValue>[] = draft.lignes.length ? draft.lignes : [{}, {}];
        lines.forEach((l) => this.lignes.push(buildLine(this.fb, l)));
      } finally {
        this.suspendDraft = false;
      }
      // Un brouillon incomplet ou daté d'une période depuis clôturée reprend à l'étape 1.
      this.currentStep.set(this.informations.valid && !this.periodLocked() ? 2 : 1);
    }
    this.hasDraft.set(false);
    this.pendingDraft = null;
  }

  discardDraft() {
    this.hasDraft.set(false);
    this.pendingDraft = null;
    this.clearDraft();
  }

  private makeReference(): string {
    const j = this.selectedJournal();
    const prefix = j ? j.label.slice(0, 2).toUpperCase() : 'EC';
    return `${prefix}-${Math.floor(1000 + Math.random() * 9000)}`;
  }

  /** Remet le formulaire à blanc sans toucher au brouillon conservé dans le navigateur. */
  private resetForm() {
    this.suspendDraft = true;
    try {
      this.informations.reset({ journalId: '', date: '', piece: '', libelle: '' });
      this.lignes.clear();
      this.lignes.push(buildLine(this.fb));
      this.lignes.push(buildLine(this.fb));
    } finally {
      this.suspendDraft = false;
    }
    this.currentStep.set(1);
    this.submitted.set(null);
    this.reference.set('');
    this.postError.set(null);
    this.hasDraft.set(false);
    this.pendingDraft = null;
  }

  private autoSave() {
    if (this.suspendDraft || this.submitted()) return;
    this.persistDraft();
  }

  private persistDraft() {
    try {
      const shape: DraftShape = { informations: this.informations.getRawValue(), lignes: this.lignes.getRawValue() };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(shape));
    } catch {
      // Stockage local indisponible (navigation privée, quota) : on continue sans brouillon persistant.
    }
  }

  private restoreDraft() {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<DraftShape> | null;
      if (!parsed?.informations) return;
      // On normalise tout : un brouillon abîmé (champ manquant, texte à la place d'un nombre) ne doit jamais casser le formulaire.
      const text = (v: unknown) => (typeof v === 'string' ? v : '');
      const amount = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
      const info = parsed.informations;
      const draft: DraftShape = {
        informations: { journalId: text(info.journalId), date: text(info.date), piece: text(info.piece), libelle: text(info.libelle) },
        lignes: (Array.isArray(parsed.lignes) ? parsed.lignes : []).map((l) => ({
          compte: text(l?.compte),
          libelle: text(l?.libelle),
          debit: amount(l?.debit),
          credit: amount(l?.credit),
        })),
      };
      const hasContent = draft.informations.libelle || draft.informations.journalId || draft.lignes.some((l) => l.compte);
      if (!hasContent) return;
      this.pendingDraft = draft;
      this.hasDraft.set(true);
    } catch {
      // Brouillon corrompu ou illisible : ignoré, l'utilisateur repart à zéro.
    }
  }

  private clearDraft() {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      // Rien à faire si le stockage local n'est pas disponible.
    }
  }
}
