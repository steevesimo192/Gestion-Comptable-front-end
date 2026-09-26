import { Component, inject, output } from '@angular/core';
import { DossierWizardStore } from '../../core/dossier-wizard-store';
import { Icon } from '../../shared/icon/icon';

@Component({
  selector: 'app-wizard-confirmation',
  imports: [Icon],
  templateUrl: './wizard-confirmation.html',
  styleUrl: './wizard-confirmation.css',
})
export class WizardConfirmation {
  protected readonly store = inject(DossierWizardStore);
  readonly accessDossier = output<void>();
  readonly createAnother = output<void>();
}
