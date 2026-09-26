import { Component, computed, inject } from '@angular/core';
import { DossierWizardStore } from '../../core/dossier-wizard-store';
import { CurrencyOption } from '../../core/models';
import { Icon } from '../../shared/icon/icon';

@Component({
  selector: 'app-wizard-step-devises',
  imports: [Icon],
  templateUrl: './wizard-step-devises.html',
  styleUrl: './wizard-step-devises.css',
})
export class WizardStepDevises {
  protected readonly store = inject(DossierWizardStore);
  protected readonly group = this.store.form.controls.devises;

  // protected readonly multiActif = computed(() => this.group.controls.multiActif.value);
  // protected readonly secondaryCodes = computed(() => this.group.controls.secondaires.value);

  protected readonly multiActif =
  this.store.multiDevisesActif;

protected readonly secondaryCodes =
  this.store.secondaryCodes;

protected readonly available = computed<CurrencyOption[]>(() => {
  const used = new Set(this.secondaryCodes());

  const functional =
    this.store.form.controls.referentiel.controls.deviseFonctionnelleId.value;

  return this.store.currencies.filter(
    (currency) =>
      currency.code !== functional &&
      !used.has(currency.code)
  );
});
  // protected readonly available = computed<CurrencyOption[]>(() => {
  //   const used = new Set(this.secondaryCodes());
  //   const functional = this.store.form.controls.referentiel.controls.deviseFonctionnelleId.value;
  //   return this.store.currencies.filter((c) => c.code !== functional && !used.has(c.code));
  // });

  protected toggle() {
    this.group.controls.multiActif.setValue(!this.multiActif());
  }

  protected label(code: string): string {
    return this.store.currencies.find((c) => c.code === code)?.label ?? code;
  }

  protected add(code: string) {
    this.store.addSecondaryCurrency(code);
  }

  protected remove(index: number) {
    this.store.removeSecondaryCurrency(index);
  }
}
