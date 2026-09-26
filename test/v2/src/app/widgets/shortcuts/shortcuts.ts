import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Role } from '../../core/models';
import { Icon } from '../../shared/icon/icon';

interface Shortcut {
  label: string;
  icon: string;
  primary: boolean;
  /** Chemin de route si l'écran existe déjà, sinon le raccourci reste affiché mais inactif. */
  link?: string;
}

const BY_ROLE: Record<Role, Shortcut[]> = {
  comptable: [
    { label: 'Nouvelle écriture', icon: 'pen', primary: true, link: '/ecritures/nouvelle' },
    { label: 'Nouveau paiement', icon: 'cash', primary: true },
    { label: 'Rapprocher la banque', icon: 'bank', primary: false },
    { label: 'Clôturer la période', icon: 'lock', primary: false },
  ],
  dirigeant: [
    { label: 'Valider des paiements', icon: 'check', primary: true },
    { label: 'Nouveau paiement', icon: 'cash', primary: true },
    { label: 'Relancer des clients', icon: 'users', primary: false },
  ],
};

@Component({
  selector: 'app-shortcuts',
  imports: [RouterLink, Icon],
  templateUrl: './shortcuts.html',
  styleUrl: './shortcuts.css',
})
export class Shortcuts {
  readonly role = input.required<Role>();
  protected readonly items = computed(() => BY_ROLE[this.role()]);
}
