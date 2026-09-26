import { Component, inject } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { DossierWizardStore } from '../../core/dossier-wizard-store';
import { MONTHS } from '../../core/wizard-data';

@Component({
  selector: 'app-wizard-step-exercice',
  imports: [ReactiveFormsModule],
  templateUrl: './wizard-step-exercice.html',
  styleUrl: './wizard-step-exercice.css',
})
export class WizardStepExercice {
  protected readonly store = inject(DossierWizardStore);
  protected readonly group = this.store.form.controls.exercice;
  protected readonly months = MONTHS;

  /**
   * À la saisie de la date de début, propose une date de fin un an plus tard
   * et le mois de début d'exercice correspondant, sans écraser une valeur
   * que l'utilisateur aurait déjà choisie lui-même.
   */
  protected onDebutChange() {
    const debut = this.group.controls.debut.value;
    if (!debut) return;

    if (this.group.controls.fin.pristine || !this.group.controls.fin.value) {
      const d = new Date(debut);
      d.setFullYear(d.getFullYear() + 1);
      d.setDate(d.getDate() - 1);
      this.group.controls.fin.setValue(d.toISOString().slice(0, 10));
    }

    if (this.group.controls.moisDebut.pristine || !this.group.controls.moisDebut.value) {
      this.group.controls.moisDebut.setValue(debut.slice(5, 7));
    }
  }
}
