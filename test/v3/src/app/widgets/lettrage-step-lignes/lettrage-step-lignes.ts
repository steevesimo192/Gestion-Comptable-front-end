import { Component, computed, inject } from '@angular/core';
import { FcfaPipe } from '../../core/fcfa-pipe';
import { LettrageStore } from '../../core/lettrage-store';
import { formatDateFr } from '../../core/lettrage-logic';
import { LettrageLine, LettrageSide } from '../../core/models';
import { Icon } from '../../shared/icon/icon';

interface Panel {
  side: LettrageSide;
  title: string;
  empty: string;
  lines: LettrageLine[];
  selectedCount: number;
  total: number;
  allSelected: boolean;
}

@Component({
  selector: 'app-lettrage-step-lignes',
  imports: [Icon, FcfaPipe],
  templateUrl: './lettrage-step-lignes.html',
  styleUrl: './lettrage-step-lignes.css',
})
export class LettrageStepLignes {
  protected readonly store = inject(LettrageStore);
  protected readonly formatDate = formatDateFr;

  /** Les deux colonnes de la maquette : factures à gauche, paiements et avoirs à droite. */
  protected readonly panels = computed<Panel[]>(() => {
    const store = this.store;
    const m = store.match();
    const factures = store.factures();
    const paiements = store.paiements();
    return [
      {
        side: 'facture',
        title: 'Factures en attente',
        empty: 'Aucune facture en attente pour ce tiers.',
        lines: factures,
        selectedCount: store.selectedFactures().length,
        total: m.totalFactures,
        allSelected: factures.length > 0 && store.selectedFactures().length === factures.length,
      },
      {
        side: 'paiement',
        title: 'Paiements disponibles',
        empty: 'Aucun paiement ni avoir disponible pour ce tiers.',
        lines: paiements,
        selectedCount: store.selectedPaiements().length,
        total: m.totalPaiements,
        allSelected: paiements.length > 0 && store.selectedPaiements().length === paiements.length,
      },
    ];
  });

  /** Les lignes cochées prennent la couleur du verdict : vert = exact, orange = partiel. */
  protected rowClass(id: string): string {
    if (!this.store.isSelected(id)) return 'hover:bg-brand-50';
    switch (this.store.match().state) {
      case 'exact':
        return 'bg-ok-bg';
      case 'partial':
        return 'bg-warn-bg';
      default:
        return 'bg-brand-100';
    }
  }

  protected toggleAll(panel: Panel) {
    if (panel.allSelected) this.store.clearSelection(panel.side);
    else this.store.selectAll(panel.side);
  }

  /** Message quand un seul côté est coché : dit précisément ce qui manque. */
  protected readonly missingHint = computed(() => {
    const m = this.store.match();
    if (m.state !== 'incomplete') return '';
    return this.store.selectedFactures().length === 0
      ? 'Cochez aussi au moins une facture pour pouvoir lettrer.'
      : 'Cochez aussi au moins un paiement ou un avoir pour pouvoir lettrer.';
  });
}
