import { Component, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter } from 'rxjs';
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
  /** Filet de séparation au-dessus du groupe (paramétrage, rangé à part car d'usage rare). */
  separated?: boolean;
}

/**
 * Menu aligné sur l'architecture de l'information (§3.1 et §8) :
 * 9 domaines dans l'ordre de fréquence d'usage, le tableau de bord en tête,
 * le paramétrage isolé en bas. Les libellés suivent la table de labellisation (§4).
 */
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
  private readonly router = inject(Router);

  /** Un seul groupe ouvert à la fois : le menu reste court et lisible. */
  protected readonly expanded = signal<string | null>('compta');

  protected readonly groups: NavGroup[] = [
    {
      id: 'compta',
      label: 'Comptabilité générale',
      icon: 'book',
      items: [
        { label: 'Plan de comptes' },
        { label: 'Journaux' },
        { label: 'Écritures', link: '/ecritures/nouvelle' },
        { label: 'Grand livre & soldes' },
      ],
    },
    {
      id: 'tiers',
      label: 'Tiers & pièces',
      icon: 'users',
      items: [
        { label: 'Répertoire des tiers' },
        { label: 'Coordonnées bancaires' },
        { label: 'Factures & pièces justificatives' },
        { label: 'Échéances' },
      ],
    },
    {
      id: 'tresorerie',
      label: 'Trésorerie & banque',
      icon: 'bank',
      items: [
        { label: 'Comptes de trésorerie' },
        { label: 'Paiements' },
        { label: 'Lettrage', link: '/tresorerie/lettrages' },
        { label: 'Relevés & rapprochement bancaire' },
      ],
    },
    {
      id: 'analytique',
      label: 'Analytique & budget',
      icon: 'chart',
      items: [{ label: 'Centres de coûts / Projets' }, { label: 'Budgets' }],
    },
    {
      id: 'immo',
      label: 'Immobilisations',
      icon: 'box',
      items: [{ label: "Catégories d'immobilisations" }, { label: 'Registre des immobilisations' }, { label: 'Amortissements' }],
    },
    {
      id: 'fiscalite',
      label: 'Fiscalité',
      icon: 'percent',
      items: [{ label: 'Taxes' }, { label: 'Déclarations fiscales' }],
    },
    {
      id: 'controle',
      label: 'Contrôle & conformité',
      icon: 'shield',
      items: [
        { label: 'Exercices & périodes' },
        { label: 'Clôture de période' },
        { label: "Journal d'audit" },
        { label: 'Documents comptables' },
        { label: 'Écritures récurrentes' },
      ],
    },
    {
      id: 'param',
      label: 'Dossier & paramétrage',
      icon: 'sliders',
      separated: true,
      items: [
        { label: 'Nouveau dossier comptable', link: '/dossiers/nouveau' },
        { label: 'Informations du dossier' },
        { label: 'Référentiel comptable & version' },
        { label: 'Devises & taux de change' },
      ],
    },
  ];

  constructor() {
    // Ouvre le groupe qui contient la page affichée (lien direct, retour arrière, rechargement).
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe((e) => this.syncWithUrl(e.urlAfterRedirects));
  }

  protected toggle(id: string) {
    this.expanded.update((current) => (current === id ? null : id));
  }

  private syncWithUrl(url: string) {
    const path = url.split(/[?#]/)[0];
    const group = this.groups.find((g) => g.items.some((i) => i.link === path));
    if (group) this.expanded.set(group.id);
  }
}
