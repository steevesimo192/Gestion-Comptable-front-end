import { Component, computed, inject } from '@angular/core';
import { formatFcfa, formatSignedFcfa } from '../../core/bank-logic';
import { BankReconciliationStore } from '../../core/bank-store';
import { formatDateFr } from '../../core/lettrage-logic';
import { Icon } from '../../shared/icon/icon';

@Component({
  selector: 'app-bank-step-recap',
  imports: [Icon],
  templateUrl: './bank-step-recap.html',
  styleUrl: './bank-step-recap.css',
})
export class BankStepRecap {
  protected readonly store = inject(BankReconciliationStore);

  protected readonly fmt = formatFcfa;
  protected readonly fmtSigned = formatSignedFcfa;
  protected readonly date = formatDateFr;

  protected readonly createdCount = computed(
    () => this.store.operations().filter((o) => o.createdEntryId !== null).length,
  );
}
