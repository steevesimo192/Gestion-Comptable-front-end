import { Component, OnInit, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { BankReconciliationStore } from '../../core/bank-store';
import { Icon } from '../../shared/icon/icon';
import { BankStepClose } from '../../widgets/bank-step-close/bank-step-close';
import { BankStepImport } from '../../widgets/bank-step-import/bank-step-import';
import { BankStepManual } from '../../widgets/bank-step-manual/bank-step-manual';
import { BankStepRecap } from '../../widgets/bank-step-recap/bank-step-recap';
import { BankStepResult } from '../../widgets/bank-step-result/bank-step-result';
import { BankStepSuggestions } from '../../widgets/bank-step-suggestions/bank-step-suggestions';
import { WizardProgress } from '../../widgets/wizard-progress/wizard-progress';

@Component({
  selector: 'app-bank-wizard',
  imports: [
    RouterLink,
    WizardProgress,
    BankStepImport,
    BankStepSuggestions,
    BankStepManual,
    BankStepRecap,
    BankStepClose,
    BankStepResult,
    Icon,
  ],
  templateUrl: './bank-wizard.html',
  styleUrl: './bank-wizard.css',
})
export class BankWizard implements OnInit {
  protected readonly store = inject(BankReconciliationStore);
  private readonly router = inject(Router);

  protected readonly currentLabel = computed(
    () => this.store.steps.find((s) => s.index === this.store.currentStep())?.label ?? '',
  );

  /** Au résultat, les cinq étapes s'affichent comme terminées et plus aucune n'est cliquable. */
  protected readonly progressCurrent = computed(() => (this.store.currentStep() === 6 ? 6 : this.store.currentStep()));
  protected readonly progressFurthest = computed(() => (this.store.currentStep() === 6 ? 0 : this.store.currentStep()));

  /** On n'affiche jamais le résultat d'un ancien rapprochement en revenant sur la page. */
  ngOnInit() {
    this.store.enter();
  }

  protected importStatement() {
    this.store.submitImport();
  }

  protected toManual() {
    this.store.toManual();
  }

  protected toRecap() {
    this.store.toRecap();
  }

  protected requestClose() {
    this.store.requestClose();
  }

  protected cancelClose() {
    this.store.cancelClose();
  }

  protected confirmClose() {
    this.store.confirmClose();
  }

  protected goToStep(step: number) {
    this.store.goBackTo(step);
  }

  protected another() {
    this.store.startNew();
  }

  protected goToDashboard() {
    this.router.navigateByUrl('/');
  }
}
