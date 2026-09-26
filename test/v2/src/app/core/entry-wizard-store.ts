import { Injectable, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ValidationErrors, Validators } from '@angular/forms';
import { WizardStepMeta } from './dossier-wizard-store';
import { AccountOption } from './models';
import { CHART_OF_ACCOUNTS, JOURNALS, LOCKED_MONTHS } from './entry-wizard-data';

interface DraftShape {
  informations: { journalId: string; date: string; piece: string; libelle: string };
  lignes: { compte: string; libelle: string; debit: number | null; credit: number | null }[];
}

const DRAFT_KEY = 'gc.entry-wizard.draft.v1';

/** Une ligne d'écriture doit avoir un débit OU un crédit, jamais les deux, jamais aucun. */
function oneOfDebitCreditValidator(control: AbstractControl): ValidationErrors | null {
  const debit = Number(control.get('debit')?.value) || 0;
  const credit = Number(control.get('credit')?.value) || 0;
  if (debit > 0 && credit > 0) return { both: true };
  if (debit <= 0 && credit <= 0) return { none: true };
  return null;
}

function emptyLine(fb: FormBuilder) {
  return fb.nonNullable.group(
    {
      compte: ['', Validators.required],
      libelle: [''],
      debit: fb.control<number | null>(null),
      credit: fb.control<number | null>(null),
    },
    { validators: oneOfDebitCreditValidator },
  );
}

/**
 * Parcours 2 : « Saisir une écriture comptable ».
 * 4 étapes : informations générales, lignes de l'écriture (avec équilibre en
 * temps réel), confirmation (uniquement pour comptabiliser, une écriture en
 * brouillon saute cette étape), résultat.
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

  readonly lignes = this.fb.array([emptyLine(this.fb), emptyLine(this.fb)]);

  readonly informationsValue = toSignal(this.informations.valueChanges, { initialValue: this.informations.getRawValue() });
  readonly lignesValue = toSignal(this.lignes.valueChanges, { initialValue: this.lignes.getRawValue() });
  // 👉 Ajoute cette ligne pour écouter les changements de validité du FormArray
  readonly lignesStatus = toSignal(this.lignes.statusChanges, { initialValue: this.lignes.status });

  readonly currentStep = signal(1);
  readonly submitted = signal<'brouillon' | 'comptabilisee' | null>(null);
  readonly hasDraft = signal(false);
  private pendingDraft: DraftShape | null = null;

  readonly selectedJournal = computed(() => this.journals.find((j) => j.id === this.informationsValue().journalId) ?? null);

  /** AAAA-MM à partir de la date comptable choisie, pour vérifier le verrouillage de la période. */
  readonly periodOfDate = computed(() => this.informationsValue().date?.slice(0, 7) ?? '');
  readonly periodLocked = computed(() => LOCKED_MONTHS.includes(this.periodOfDate()));

  readonly totalDebit = computed(() => this.lignesValue().reduce((sum, l) => sum + (Number(l.debit) || 0), 0));
  readonly totalCredit = computed(() => this.lignesValue().reduce((sum, l) => sum + (Number(l.credit) || 0), 0));
  readonly gap = computed(() => this.totalDebit() - this.totalCredit());
  readonly balanced = computed(() => this.totalDebit() > 0 && this.totalDebit() === this.totalCredit());

  // readonly linesReady = computed(() => this.lignes.valid && this.lignesValue().length >= 2);
  // ✅ Nouvelle ligne corrigée :
  readonly linesReady = computed(() => this.lignesStatus() === 'VALID' && this.lignesValue().length >= 2);
  readonly canPost = computed(() => this.linesReady() && this.balanced() && !this.periodLocked());
  readonly canSaveDraft = computed(() => this.informations.valid && this.lignesValue().some((l) => l.compte));

  /** Compte de tiers utilisé dans l'écriture, s'il y en a un : sert de « Tiers » dans le récapitulatif. */
  readonly tiers = computed(() => {
    const line = this.lignesValue().find((l) => {
      const acc = this.accounts.find((a) => a.code === l.compte);
      return acc?.kind === 'tiers-client' || acc?.kind === 'tiers-fournisseur';
    });
    if (!line) return null;
    return this.accounts.find((a) => a.code === line.compte) ?? null;
  });

  readonly reference = computed(() => {
    const j = this.selectedJournal();
    const prefix = j ? j.label.slice(0, 2).toUpperCase() : 'EC';
    return `${prefix}-${Math.floor(1000 + Math.random() * 9000)}`;
  });

  constructor() {
    this.restoreDraft();
    this.informations.valueChanges.subscribe(() => this.saveDraft());
    this.lignes.valueChanges.subscribe(() => this.saveDraft());
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
    this.lignes.push(emptyLine(this.fb));
  }

  removeLine(index: number) {
    if (this.lignes.length > 2) this.lignes.removeAt(index);
  }

  goToStep1() {
    this.informations.markAllAsTouched();
    if (this.informations.invalid || this.periodLocked()) return;
    this.currentStep.set(2);
  }

  backToInfo() {
    this.currentStep.set(1);
  }

  requestPost() {
    this.lignes.markAllAsTouched();
    if (!this.canPost()) return;
    this.currentStep.set(3);
  }

  cancelConfirm() {
    this.currentStep.set(2);
  }

  confirmPost() {
    this.submitted.set('comptabilisee');
    this.currentStep.set(4);
    this.clearDraft();
  }

  saveAsDraft() {
    this.informations.markAllAsTouched();
    if (!this.canSaveDraft()) return;
    this.submitted.set('brouillon');
    this.currentStep.set(4);
    this.clearDraft();
  }

  continueEditingDraft() {
    this.submitted.set(null);
    this.currentStep.set(2);
  }

  reset() {
    this.informations.reset({ journalId: '', date: '', piece: '', libelle: '' });
    this.lignes.clear();
    this.lignes.push(emptyLine(this.fb));
    this.lignes.push(emptyLine(this.fb));
    this.currentStep.set(1);
    this.submitted.set(null);
    this.clearDraft();
  }

  applyDraft() {
    if (this.pendingDraft) {
      const draft = this.pendingDraft;
      this.informations.patchValue(draft.informations);
      this.lignes.clear();
      (draft.lignes.length ? draft.lignes : [{ compte: '', libelle: '', debit: null, credit: null }, { compte: '', libelle: '', debit: null, credit: null }]).forEach(
        (l) => this.lignes.push(this.fb.nonNullable.group({ compte: l.compte, libelle: l.libelle, debit: this.fb.control(l.debit), credit: this.fb.control(l.credit) }, { validators: oneOfDebitCreditValidator })),
      );
      this.currentStep.set(2);
    }
    this.hasDraft.set(false);
    this.pendingDraft = null;
  }

  discardDraft() {
    this.hasDraft.set(false);
    this.pendingDraft = null;
    this.clearDraft();
  }

  private saveDraft() {
    if (this.submitted()) return;
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
      const parsed = JSON.parse(raw) as DraftShape;
      if (!parsed?.informations) return;
      const hasContent = parsed.informations.libelle || parsed.informations.journalId || parsed.lignes.some((l) => l.compte);
      if (!hasContent) return;
      this.pendingDraft = parsed;
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
