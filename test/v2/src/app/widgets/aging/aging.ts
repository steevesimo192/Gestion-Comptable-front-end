import { Component, computed, input } from '@angular/core';
import { AgingSummary } from '../../core/models';
import { FcfaPipe } from '../../core/fcfa-pipe';

const COLORS = ['bg-brand-200', 'bg-brand-400', 'bg-warn-mark', 'bg-bad'];

@Component({
  selector: 'app-aging',
  imports: [FcfaPipe],
  templateUrl: './aging.html',
  styleUrl: './aging.css',
})
export class Aging {
  readonly receivables = input.required<AgingSummary>();
  readonly payables = input.required<AgingSummary>();

  protected readonly blocks = computed(() =>
    [this.receivables(), this.payables()].map((data) => ({
      data,
      latePct: data.total ? Math.round((data.late / data.total) * 100) : 0,
      segments: data.buckets.map((b, i) => ({ ...b, color: COLORS[i] })),
    })),
  );
}
