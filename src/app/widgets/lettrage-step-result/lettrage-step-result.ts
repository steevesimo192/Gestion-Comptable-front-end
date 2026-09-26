import { Component, computed, inject, output } from '@angular/core';
import { FcfaPipe } from '../../core/fcfa-pipe';
import { formatDateFr } from '../../core/lettrage-logic';
import { LettrageStore } from '../../core/lettrage-store';
import { Icon } from '../../shared/icon/icon';

@Component({
  selector: 'app-lettrage-step-result',
  imports: [Icon, FcfaPipe],
  templateUrl: './lettrage-step-result.html',
  styleUrl: './lettrage-step-result.css',
})
export class LettrageStepResult {
  protected readonly store = inject(LettrageStore);
  readonly another = output<void>();
  readonly changeTiers = output<void>();
  readonly goDashboard = output<void>();

  protected readonly formatDate = formatDateFr;
  protected readonly record = this.store.result;

  /** Ce qui reste dû (ou disponible) sur le compte du tiers une fois le lettrage fait, en langage courant. */
  protected readonly position = computed(() => {
    const tiers = this.store.selectedTiers();
    const { net } = this.store.position();
    const client = tiers?.kind !== 'fournisseur';
    if (net > 0) return { label: client ? 'Reste dû par ce client' : 'Reste à payer à ce fournisseur', amount: net };
    if (net < 0) return { label: client ? 'Trop-perçu à affecter ou rembourser' : 'Avance versée à ce fournisseur', amount: -net };
    return { label: 'Le compte de ce tiers est soldé', amount: 0 };
  });
}
