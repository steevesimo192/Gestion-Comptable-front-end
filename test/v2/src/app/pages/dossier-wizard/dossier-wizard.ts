import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { DossierWizardStore } from '../../core/dossier-wizard-store';
import { WizardProgress } from '../../widgets/wizard-progress/wizard-progress';
import { WizardStepInfo } from '../../widgets/wizard-step-info/wizard-step-info';
import { WizardStepReferentiel } from '../../widgets/wizard-step-referentiel/wizard-step-referentiel';
import { WizardStepDevises } from '../../widgets/wizard-step-devises/wizard-step-devises';
import { WizardStepExercice } from '../../widgets/wizard-step-exercice/wizard-step-exercice';
import { WizardConfirmation } from '../../widgets/wizard-confirmation/wizard-confirmation';
import { Icon } from '../../shared/icon/icon';

@Component({
  selector: 'app-dossier-wizard',
  imports: [
    RouterLink,
    WizardProgress,
    WizardStepInfo,
    WizardStepReferentiel,
    WizardStepDevises,
    WizardStepExercice,
    WizardConfirmation,
    Icon,
  ],
  templateUrl: './dossier-wizard.html',
  styleUrl: './dossier-wizard.css',
})
export class DossierWizard {
  protected readonly store = inject(DossierWizardStore);
  private readonly router = inject(Router);

  protected readonly currentLabel = computed(
    () => this.store.steps.find((s) => s.index === this.store.currentStep())?.label ?? '',
  );

  protected next() {
    this.store.goNext();
  }

  protected back() {
    this.store.goBack();
  }

  protected skip() {
    this.store.skipStep();
  }

  protected goToStep(step: number) {
    this.store.goToStep(step);
  }

  protected useDraft() {
    this.store.applyDraft();
  }

  protected discardDraft() {
    this.store.discardDraft();
  }

  protected goToDashboard() {
    this.router.navigateByUrl('/');
  }

  protected createAnother() {
    this.store.reset();
  }
}
