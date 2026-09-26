import { Component, computed, input } from '@angular/core';
import { Kpi, KpiTone } from '../../core/models';
import { FcfaPipe } from '../../core/fcfa-pipe';
import { Icon } from '../../shared/icon/icon';

const TONE: Record<KpiTone, string> = {
  brand: 'bg-brand-600 text-white',
  deep: 'bg-brand-800 text-white',
  amber: 'bg-warn-mark text-brand-950',
  green: 'bg-ok text-white',
};

@Component({
  selector: 'app-kpi-card',
  imports: [FcfaPipe, Icon],
  templateUrl: './kpi-card.html',
  styleUrl: './kpi-card.css',
  host: { class: 'block' },
})
export class KpiCard {
  readonly kpi = input.required<Kpi>();

  protected readonly tone = computed(() => TONE[this.kpi().tone]);
  protected readonly up = computed(() => this.kpi().delta >= 0);
  protected readonly deltaText = computed(() => {
    const d = this.kpi().delta;
    return `${d > 0 ? '+' : d < 0 ? '−' : ''}${Math.abs(d)} %`;
  });
}
