import { Component, inject } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { DossierWizardStore } from '../../core/dossier-wizard-store';
import { Icon } from '../../shared/icon/icon';

@Component({
  selector: 'app-wizard-step-referentiel',
  imports: [ReactiveFormsModule, Icon],
  templateUrl: './wizard-step-referentiel.html',
  styleUrl: './wizard-step-referentiel.css',
})
export class WizardStepReferentiel {
  protected readonly store = inject(DossierWizardStore);
  protected readonly group = this.store.form.controls.referentiel;

  protected pickReferentiel(id: string) {
    this.group.controls.referentielId.setValue(id);
    this.group.controls.referentielId.markAsTouched();
  }
}
