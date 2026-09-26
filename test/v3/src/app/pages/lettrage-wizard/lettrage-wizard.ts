import { Component, OnInit, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { LettrageStore } from '../../core/lettrage-store';
import { Icon } from '../../shared/icon/icon';
import { LettrageStepConfirm } from '../../widgets/lettrage-step-confirm/lettrage-step-confirm';
import { LettrageStepLignes } from '../../widgets/lettrage-step-lignes/lettrage-step-lignes';
import { LettrageStepResult } from '../../widgets/lettrage-step-result/lettrage-step-result';
import { LettrageStepTiers } from '../../widgets/lettrage-step-tiers/lettrage-step-tiers';
import { WizardProgress } from '../../widgets/wizard-progress/wizard-progress';

@Component({
  selector: 'app-lettrage-wizard',
  imports: [RouterLink, WizardProgress, LettrageStepTiers, LettrageStepLignes, LettrageStepConfirm, LettrageStepResult, Icon],
  templateUrl: './lettrage-wizard.html',
  styleUrl: './lettrage-wizard.css',
})
export class LettrageWizard implements OnInit {
  protected readonly store = inject(LettrageStore);
  private readonly router = inject(Router);

  protected readonly currentLabel = computed(
    () => this.store.steps.find((s) => s.index === this.store.currentStep())?.label ?? '',
  );

  /** Au résultat, les quatre étapes s'affichent comme terminées et plus aucune n'est cliquable. */
  protected readonly progressCurrent = computed(() => (this.store.currentStep() === 4 ? 5 : this.store.currentStep()));
  protected readonly progressFurthest = computed(() => (this.store.currentStep() === 4 ? 0 : this.store.currentStep()));

  ngOnInit() {
    this.store.enter();
  }

  protected next() {
    this.store.goToLines();
  }

  protected back() {
    this.store.backToTiers();
  }

  protected letter() {
    this.store.requestLettrage();
  }

  protected goToStep(step: number) {
    this.store.goBackTo(step);
  }

  protected cancelConfirm() {
    this.store.cancelConfirm();
  }

  protected confirmPartial() {
    this.store.confirmPartial();
  }

  protected another() {
    this.store.startAnother();
  }

  protected changeTiers() {
    this.store.changeTiers();
  }

  protected goToDashboard() {
    this.router.navigateByUrl('/');
  }
}
