import { Component, inject, output } from '@angular/core';
import { formatFcfa } from '../../core/bank-logic';
import { BankReconciliationStore } from '../../core/bank-store';
import { Icon } from '../../shared/icon/icon';

@Component({
  selector: 'app-bank-step-close',
  imports: [Icon],
  templateUrl: './bank-step-close.html',
  styleUrl: './bank-step-close.css',
})
export class BankStepClose {
  protected readonly store = inject(BankReconciliationStore);

  readonly cancelled = output<void>();
  readonly confirmed = output<void>();

  protected readonly fmt = formatFcfa;
}
