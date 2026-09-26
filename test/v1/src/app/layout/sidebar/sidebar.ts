import { Component, inject, input, output, signal } from '@angular/core';
import { DashboardStore } from '../../core/dashboard-store';
import { Icon } from '../../shared/icon/icon';

interface NavGroup {
  id: string;
  label: string;
  icon: string;
  items: string[];
}

@Component({
  selector: 'app-sidebar',
  imports: [Icon],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
  host: { class: 'block' },
})
export class Sidebar {
  readonly open = input(false);
  readonly closed = output<void>();
  protected readonly store = inject(DashboardStore);

  /** Un seul groupe ouvert à la fois : le menu reste court et lisible. */
  protected readonly expanded = signal<string | null>(null);

  protected readonly groups: NavGroup[] = [
    { id: 'compta', label: 'Comptabilité générale', icon: 'book', items: ['Saisie des écritures', 'Journaux', 'Grand livre', 'Balance'] },
    { id: 'tiers', label: 'Tiers & pièces', icon: 'users', items: ['Clients', 'Fournisseurs', 'Factures et pièces', 'Échéances'] },
    { id: 'tresorerie', label: 'Trésorerie & banque', icon: 'bank', items: ['Règlements', 'Rapprochement bancaire', 'Comptes bancaires'] },
    { id: 'analytique', label: 'Analytique & budget', icon: 'chart', items: ['Budgets', 'Centres de coûts', 'Analyse des écarts'] },
    { id: 'immo', label: 'Immobilisations', icon: 'box', items: ['Registre des immobilisations', 'Amortissements'] },
    { id: 'fiscalite', label: 'Fiscalité', icon: 'percent', items: ['Déclarations de TVA', 'Autres déclarations'] },
    { id: 'controle', label: 'Contrôle & conformité', icon: 'shield', items: ['Clôtures de période', "Journal d'audit", 'Documents justificatifs'] },
    { id: 'param', label: 'Dossier & paramétrage', icon: 'sliders', items: ['Dossier et exercice', 'Plan comptable', 'Utilisateurs et droits'] },
  ];

  protected toggle(id: string) {
    this.expanded.update((current) => (current === id ? null : id));
  }
}
