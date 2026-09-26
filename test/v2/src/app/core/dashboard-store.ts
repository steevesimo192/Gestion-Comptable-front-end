import { Injectable, computed, signal } from '@angular/core';
import { Role } from './models';
import { SEEDS, buildDashboard } from './mock-data';

@Injectable({
  providedIn: 'root',
})
export class DashboardStore {
  readonly dossiers = SEEDS.map((s) => s.dossier);
  readonly dossierId = signal(SEEDS[0].dossier.id);
  readonly role = signal<Role>('comptable');

  readonly data = computed(() => {
    const seed = SEEDS.find((s) => s.dossier.id === this.dossierId()) ?? SEEDS[0];
    return buildDashboard(seed);
  });

  readonly user = computed(() => ({
    name: 'Steeve Joel',
    first: 'Steeve',
    initials: 'SJ',
    title: this.role() === 'comptable' ? 'Comptable' : 'Dirigeant',
  }));

  /** Nombre d'alertes urgentes visibles pour le profil courant (pastille de la cloche). */
  readonly urgentCount = computed(
    () =>
      this.data().tasks.filter(
        (t) => t.urgency === 'urgent' && (this.role() === 'comptable' || t.audience === 'tous'),
      ).length,
  );

  selectDossier(id: string) {
    this.dossierId.set(id);
  }

  setRole(role: Role) {
    this.role.set(role);
  }
}
