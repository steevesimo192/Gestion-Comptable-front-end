import { Component, OnInit, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { EntryWizardStore } from '../../core/entry-wizard-store';
import { WizardProgress } from '../../widgets/wizard-progress/wizard-progress';
import { EntryStepInfo } from '../../widgets/entry-step-info/entry-step-info';
import { EntryStepLines } from '../../widgets/entry-step-lines/entry-step-lines';
import { EntryStepConfirm } from '../../widgets/entry-step-confirm/entry-step-confirm';
import { EntryStepResult } from '../../widgets/entry-step-result/entry-step-result';
import { Icon } from '../../shared/icon/icon';

@Component({
  selector: 'app-entry-wizard',
  imports: [RouterLink, WizardProgress, EntryStepInfo, EntryStepLines, EntryStepConfirm, EntryStepResult, Icon],
  templateUrl: './entry-wizard.html',
  styleUrl: './entry-wizard.css',
})
export class EntryWizard implements OnInit {
  protected readonly store = inject(EntryWizardStore);
  private readonly router = inject(Router);

  protected readonly currentLabel = computed(
    () => this.store.steps.find((s) => s.index === this.store.currentStep())?.label ?? '',
  );

  /** On n'affiche jamais l'écran de résultat d'une saisie précédente en revenant sur la page. */
  ngOnInit() {
    this.store.enter();
  }

  protected next() {
    this.store.goToStep1();
  }

  protected back() {
    this.store.backToInfo();
  }

  /** Les points de progression ne permettent que de revenir à l'étape 1 depuis l'étape 2, jamais de sauter en avant. */
  protected goToStep(step: number) {
    if (step === 1 && this.store.currentStep() === 2) this.store.backToInfo();
  }

  protected postRequest() {
    this.store.requestPost();
  }

  protected saveDraft() {
    this.store.saveAsDraft();
  }

  protected cancelConfirm() {
    this.store.cancelConfirm();
  }

  protected confirmPost() {
    this.store.confirmPost();
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

  /** Repart d'une saisie vierge, sans perdre un brouillon qu'on vient d'enregistrer. */
  protected startAnother() {
    this.store.startNew();
  }

  /**
   * « Voir l'écriture » ne rouvre l'édition que pour un brouillon : une
   * écriture comptabilisée est immuable, son récapitulatif ci-dessus suffit
   * (pas de vue détail dédiée dans cette maquette).
   */
  protected viewEntry() {
    if (this.store.submitted() === 'brouillon') this.store.continueEditingDraft();
  }
}
