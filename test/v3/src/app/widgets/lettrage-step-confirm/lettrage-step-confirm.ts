import { Component, computed, inject, output } from '@angular/core';
import { FcfaPipe } from '../../core/fcfa-pipe';
import { LettrageStore } from '../../core/lettrage-store';
import { Icon } from '../../shared/icon/icon';

@Component({
  selector: 'app-lettrage-step-confirm',
  imports: [Icon, FcfaPipe],
  templateUrl: './lettrage-step-confirm.html',
  styleUrl: './lettrage-step-confirm.css',
})
export class LettrageStepConfirm {
  protected readonly store = inject(LettrageStore);
  readonly cancelled = output<void>();
  readonly confirmed = output<void>();

  protected readonly factureRefs = computed(() => this.store.selectedFactures().map((l) => l.reference).join(', '));
  protected readonly paiementRefs = computed(() => this.store.selectedPaiements().map((l) => l.reference).join(', '));
}
