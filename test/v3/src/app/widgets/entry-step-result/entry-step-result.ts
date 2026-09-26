import { Component, computed, inject, output } from '@angular/core';
import { EntryWizardStore } from '../../core/entry-wizard-store';
import { Icon } from '../../shared/icon/icon';
import { FcfaPipe } from '../../core/fcfa-pipe';

interface BalanceRow {
  code: string;
  label: string;
  delta: number;
}

@Component({
  selector: 'app-entry-step-result',
  imports: [Icon, FcfaPipe],
  templateUrl: './entry-step-result.html',
  styleUrl: './entry-step-result.css',
})
export class EntryStepResult {
  protected readonly store = inject(EntryWizardStore);
  readonly viewEntry = output<void>();
  readonly newEntry = output<void>();
  readonly goDashboard = output<void>();

  protected readonly posted = computed(() => this.store.submitted() === 'comptabilisee');

  /** Comptes réellement mouvementés (montant renseigné), pour l'aperçu « soldes mis à jour ». */
 /** Comptes réellement mouvementés (montant renseigné), pour l'aperçu « soldes mis à jour ». */
  protected readonly movedAccounts = computed<BalanceRow[]>(() =>
    this.store
      .lignesValue()
      .filter((l) => !!l.compte && (l.debit || l.credit))
      .map((l) => ({
        code: l.compte ?? '',
        label: this.store.accountLabel(l.compte ?? ''),
        delta: (l.debit ?? 0) - (l.credit ?? 0),
      })),
  );
}
