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

  // Basés sur les signaux réactifs du store (jamais sur `.value` directement).
  protected readonly multiActif = computed(() => this.store.devisesValue().multiActif);
  protected readonly secondaryCodes = computed(() => this.store.devisesValue().secondaires);

  protected readonly available = computed<CurrencyOption[]>(() => {
    const used = new Set(this.secondaryCodes());
    const functional = this.store.referentielValue().deviseFonctionnelleId;
    return this.store.currencies.filter((c) => c.code !== functional && !used.has(c.code));
  });

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
