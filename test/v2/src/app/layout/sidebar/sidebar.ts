import { Component, inject, input, output, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { DashboardStore } from '../../core/dashboard-store';
import { Icon } from '../../shared/icon/icon';

interface NavItem {
  label: string;
  /** Chemin de route si l'écran existe déjà, sinon l'entrée reste affichée mais inactive. */
  link?: string;
}
interface NavGroup {
  id: string;
  label: string;
  icon: string;
  items: NavItem[];
}

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive, Icon],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
  host: { class: 'block' },
})
export class Sidebar {
  readonly open = input(false);
  readonly closed = output<void>();
  protected readonly store = inject(DashboardStore);

  /** Un seul groupe ouvert à la fois : le menu reste court et lisible. */
  protected readonly expanded = signal<string | null>('compta');

  protected readonly groups: NavGroup[] = [
    {
      id: 'compta',
      label: 'Comptabilité générale',
      icon: 'book',
      items: [
        { label: 'Saisie des écritures', link: '/ecritures/nouvelle' },
        { label: 'Journaux' },
        { label: 'Grand livre' },
        { label: 'Balance' },
      ],
    },
    { id: 'tiers', label: 'Tiers & pièces', icon: 'users', items: [{ label: 'Clients' }, { label: 'Fournisseurs' }, { label: 'Factures et pièces' }, { label: 'Échéances' }] },
    { id: 'tresorerie', label: 'Trésorerie & banque', icon: 'bank', items: [{ label: 'Règlements' }, { label: 'Rapprochement bancaire' }, { label: 'Comptes bancaires' }] },
    { id: 'analytique', label: 'Analytique & budget', icon: 'chart', items: [{ label: 'Budgets' }, { label: 'Centres de coûts' }, { label: 'Analyse des écarts' }] },
    { id: 'immo', label: 'Immobilisations', icon: 'box', items: [{ label: 'Registre des immobilisations' }, { label: 'Amortissements' }] },
    { id: 'fiscalite', label: 'Fiscalité', icon: 'percent', items: [{ label: 'Déclarations de TVA' }, { label: 'Autres déclarations' }] },
    { id: 'controle', label: 'Contrôle & conformité', icon: 'shield', items: [{ label: 'Clôtures de période' }, { label: "Journal d'audit" }, { label: 'Documents justificatifs' }] },
    {
      id: 'param',
      label: 'Dossier & paramétrage',
      icon: 'sliders',
      items: [{ label: 'Nouveau dossier comptable', link: '/dossiers/nouveau' }, { label: 'Plan comptable' }, { label: 'Utilisateurs et droits' }],
    },
  ];

  protected toggle(id: string) {
    this.expanded.update((current) => (current === id ? null : id));
  }
}
