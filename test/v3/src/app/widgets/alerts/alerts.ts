import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Role, Task, Urgency } from '../../core/models';
import { Icon } from '../../shared/icon/icon';

const RANK: Record<Urgency, number> = { urgent: 0, soon: 1, normal: 2 };
const MAX_SHOWN = 5;

const STYLE: Record<Urgency, { label: string; tile: string; chip: string }> = {
  urgent: { label: 'Urgent', tile: 'bg-bad-bg text-bad', chip: 'bg-bad-bg text-bad' },
  soon: { label: 'Bientôt', tile: 'bg-white text-warn', chip: 'bg-white text-warn' },
  normal: { label: 'À prévoir', tile: 'bg-brand-100 text-brand-700', chip: 'bg-white text-brand-700' },
};

@Component({
  selector: 'app-alerts',
  imports: [Icon, RouterLink],
  templateUrl: './alerts.html',
  styleUrl: './alerts.css',
})
export class Alerts {
  readonly tasks = input.required<Task[]>();
  readonly role = input.required<Role>();
  protected readonly style = STYLE;

  /** Toutes les alertes du profil, triées de la plus urgente à la moins urgente. */
  protected readonly all = computed(() =>
    this.tasks()
      .filter((t) => this.role() === 'comptable' || t.audience === 'tous')
      .sort((a, b) => RANK[a.urgency] - RANK[b.urgency]),
  );
  protected readonly shown = computed(() => this.all().slice(0, MAX_SHOWN));
  protected readonly hidden = computed(() => this.all().length - this.shown().length);
}
