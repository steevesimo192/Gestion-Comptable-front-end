import { Component, inject, output, signal } from '@angular/core';
import { formatFcfa, formatSignedFcfa } from '../../core/bank-logic';
import { BankReconciliationStore } from '../../core/bank-store';
import { downloadText } from '../../core/download';
import { formatDateFr } from '../../core/lettrage-logic';
import { Icon } from '../../shared/icon/icon';

@Component({
  selector: 'app-bank-step-result',
  imports: [Icon],
  templateUrl: './bank-step-result.html',
  styleUrl: './bank-step-result.css',
})
export class BankStepResult {
  protected readonly store = inject(BankReconciliationStore);

  readonly another = output<void>();
  readonly goDashboard = output<void>();

  protected readonly showDetail = signal(false);
  protected readonly exportFailed = signal(false);

  protected readonly summary = this.store.summary;
  protected readonly fmt = formatFcfa;
  protected readonly fmtSigned = formatSignedFcfa;
  protected readonly date = formatDateFr;

  protected toggleDetail() {
    this.showDetail.update((v) => !v);
  }

  protected exportReport() {
    this.exportFailed.set(!downloadText(this.store.reportFileName(), this.store.reportCsv()));
  }
}
