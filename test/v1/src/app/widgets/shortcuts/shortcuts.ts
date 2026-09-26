import { Component, computed, input } from '@angular/core';
import { Role } from '../../core/models';
import { Icon } from '../../shared/icon/icon';

interface Shortcut {
  label: string;
  icon: string;
  primary: boolean;
}

const BY_ROLE: Record<Role, Shortcut[]> = {
  comptable: [
    { label: 'Nouvelle écriture', icon: 'pen', primary: true },
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
  imports: [Icon],
  templateUrl: './shortcuts.html',
  styleUrl: './shortcuts.css',
})
export class Shortcuts {
  readonly role = input.required<Role>();
  protected readonly items = computed(() => BY_ROLE[this.role()]);
}
