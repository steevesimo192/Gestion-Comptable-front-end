import { Component, computed, input } from '@angular/core';
import { BudgetLine } from '../../core/models';
import { FcfaPipe } from '../../core/fcfa-pipe';

type BudgetState = 'ok' | 'warn' | 'bad';

const STATE: Record<BudgetState, { label: string; text: string; fill: string }> = {
  ok: { label: 'Dans le rythme', text: 'text-ok', fill: 'bg-brand-600' },
  warn: { label: 'Dépense plus vite que prévu', text: 'text-warn', fill: 'bg-warn-mark' },
  bad: { label: 'Budget dépassé', text: 'text-bad', fill: 'bg-bad' },
};

@Component({
  selector: 'app-budget',
  imports: [FcfaPipe],
  templateUrl: './budget.html',
  styleUrl: './budget.css',
})
export class Budget {
  readonly budget = input.required<BudgetLine[]>();
  readonly elapsedShare = input.required<number>();

  protected readonly elapsedPct = computed(() => Math.round(this.elapsedShare() * 100));

  protected readonly lines = computed(() =>
    this.budget().map((l) => {
      const ratio = l.spent / l.budget;
      const key: BudgetState = ratio > 1 ? 'bad' : ratio > this.elapsedShare() + 0.1 ? 'warn' : 'ok';
      return {
        ...l,
        key,
        pct: Math.round(ratio * 100),
        fillPct: Math.min(ratio, 1) * 100,
        ...STATE[key],
      };
    }),
  );
}
