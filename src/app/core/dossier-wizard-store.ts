import { Injectable, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ValidationErrors, Validators } from '@angular/forms';
import { COMPANIES, CURRENCIES, EXISTING_CODES, MONTHS, REFERENTIALS, TIMEZONES } from './wizard-data';

export interface WizardStepMeta {
  index: number;
  label: string;
  optional?: boolean;
}

interface DraftShape {
  step: number;
  value: {
    informations: { entrepriseId: string; code: string; libelle: string };
    referentiel: { referentielId: string; deviseFonctionnelleId: string; fuseauHoraire: string };
    devises: { multiActif: boolean; secondaires: string[] };
    exercice: { debut: string; fin: string; moisDebut: string };
  };
}

const DRAFT_KEY = 'gc.dossier-wizard.draft.v1';

/** Un code de dossier ne peut pas déjà être utilisé par un autre dossier. */
function codeTakenValidator(control: AbstractControl): ValidationErrors | null {
  const value = (control.value ?? '').trim().toUpperCase();
  if (!value) return null;
  return EXISTING_CODES.includes(value) ? { taken: true } : null;
}

/**
 * Parcours 1 : « Créer et paramétrer un dossier comptable ».
 * Centralise le formulaire en 4 étapes, la navigation entre étapes et la
 * conservation d'un brouillon si l'utilisateur quitte en cours de route.
 */
@Injectable({ providedIn: 'root' })
export class DossierWizardStore {
  private readonly fb = inject(FormBuilder);

  readonly companies = COMPANIES;
  readonly referentials = REFERENTIALS;
  readonly currencies = CURRENCIES;
  readonly timezones = TIMEZONES;
  readonly months = MONTHS;

  readonly steps: WizardStepMeta[] = [
    { index: 1, label: 'Informations du dossier' },
    { index: 2, label: 'Référentiel & devises' },
    { index: 3, label: 'Multi-devises', optional: true },
    { index: 4, label: 'Exercice comptable' },
  ];

  readonly form = this.fb.nonNullable.group({
    informations: this.fb.nonNullable.group({
      entrepriseId: ['', Validators.required],
      code: ['', [Validators.required, Validators.pattern(/^[A-Z0-9-]{3,12}$/), codeTakenValidator]],
      libelle: ['', Validators.required],
    }),
    referentiel: this.fb.nonNullable.group({
      referentielId: ['', Validators.required],
      deviseFonctionnelleId: ['', Validators.required],
      fuseauHoraire: ['Africa/Douala', Validators.required],
    }),
    devises: this.fb.nonNullable.group({
      multiActif: [false],
      secondaires: this.fb.nonNullable.array<string>([]),
    }),
    exercice: this.fb.nonNullable.group({
      debut: ['', Validators.required],
      fin: ['', Validators.required],
      moisDebut: ['', Validators.required],
    }),
  });

  readonly currentStep = signal(1);
  readonly furthestStep = signal(1);
  readonly submitted = signal(false);
  readonly hasDraft = signal(false);
  private pendingDraft: DraftShape | null = null;

  readonly informationsValue = toSignal(this.form.controls.informations.valueChanges, {
    initialValue: this.form.controls.informations.getRawValue(),
  });
  readonly referentielValue = toSignal(this.form.controls.referentiel.valueChanges, {
    initialValue: this.form.controls.referentiel.getRawValue(),
  });
  readonly devisesValue = toSignal(this.form.controls.devises.valueChanges, {
    initialValue: this.form.controls.devises.getRawValue(),
  });
  readonly exerciceValue = toSignal(this.form.controls.exercice.valueChanges, {
    initialValue: this.form.controls.exercice.getRawValue(),
  });

  readonly selectedCompany = computed(() => this.companies.find((c) => c.id === this.informationsValue().entrepriseId) ?? null);
  readonly selectedReferentiel = computed(
    () => this.referentials.find((r) => r.id === this.referentielValue().referentielId) ?? null,
  );
  readonly selectedDeviseFonctionnelle = computed(
    () => this.currencies.find((c) => c.code === this.referentielValue().deviseFonctionnelleId) ?? null,
  );

  /** Restauration du signal secondaryCurrencies attendu par le composant de confirmation */
readonly secondaryCurrencies = computed(() =>
    (this.devisesValue()?.secondaires ?? [])
      .map((code) => this.currencies.find((c) => c.code === code))
      .filter((c): c is (typeof this.currencies)[number] => !!c),
  );

  readonly exerciceYear = computed(() => {
    const debut = this.exerciceValue().debut;
    return debut ? new Date(debut).getFullYear() : new Date().getFullYear();
  });

  constructor() {
    this.restoreDraft();
    this.form.valueChanges.subscribe(() => {
      if (!this.submitted()) this.saveDraft();
    });
  }

  private groupFor(step: number) {
    switch (step) {
      case 1:
        return this.form.controls.informations;
      case 2:
        return this.form.controls.referentiel;
      case 3:
        return this.form.controls.devises;
      default:
        return this.form.controls.exercice;
    }
  }

  goNext() {
    const group = this.groupFor(this.currentStep());
    group.markAllAsTouched();
    if (group.invalid) return;
    if (this.currentStep() < this.steps.length) {
      const next = this.currentStep() + 1;
      this.currentStep.set(next);
      this.furthestStep.set(Math.max(this.furthestStep(), next));
    } else {
      this.submit();
    }
  }

  skipStep() {
    if (this.currentStep() !== 3) return;
    this.currentStep.set(4);
    this.furthestStep.set(Math.max(this.furthestStep(), 4));
  }

  goBack() {
    if (this.currentStep() > 1) this.currentStep.update((s) => s - 1);
  }

  goToStep(step: number) {
    if (step <= this.furthestStep()) this.currentStep.set(step);
  }

  addSecondaryCurrency(code: string) {
    if (!code) return;
    const array = this.form.controls.devises.controls.secondaires;
    if (!array.value.includes(code)) array.push(this.fb.nonNullable.control(code));
  }

  removeSecondaryCurrency(index: number) {
    this.form.controls.devises.controls.secondaires.removeAt(index);
  }

  private submit() {
    this.submitted.set(true);
    this.clearDraft();
  }

  reset() {
    this.form.controls.devises.controls.secondaires.clear();
    this.form.reset({
      informations: { entrepriseId: '', code: '', libelle: '' },
      referentiel: { referentielId: '', deviseFonctionnelleId: '', fuseauHoraire: 'Africa/Douala' },
      devises: { multiActif: false, secondaires: [] },
      exercice: { debut: '', fin: '', moisDebut: '' },
    });
    this.currentStep.set(1);
    this.furthestStep.set(1);
    this.submitted.set(false);
    this.clearDraft();
  }

  applyDraft() {
    if (this.pendingDraft) {
      const draft = this.pendingDraft;
      const secondaires = this.form.controls.devises.controls.secondaires;
      secondaires.clear();
      draft.value.devises.secondaires.forEach((code) => secondaires.push(this.fb.nonNullable.control(code)));
      this.form.patchValue({
        informations: draft.value.informations,
        referentiel: draft.value.referentiel,
        devises: { multiActif: draft.value.devises.multiActif },
        exercice: draft.value.exercice,
      });
      this.currentStep.set(draft.step);
      this.furthestStep.set(draft.step);
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
    try {
      const shape: DraftShape = { step: this.currentStep(), value: this.form.getRawValue() };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(shape));
    } catch {
      // Stockage local indisponible
    }
  }

  private restoreDraft() {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as DraftShape;
      if (!parsed?.value?.informations) return;
      this.pendingDraft = parsed;
      this.hasDraft.set(true);
    } catch {
      // Brouillon illisible
    }
  }

  private clearDraft() {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      // Rien à faire
    }
  }

}
