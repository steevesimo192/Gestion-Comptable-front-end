import { Component, computed, inject, signal } from '@angular/core';
import { MatchSuggestion, formatFcfa, formatSignedFcfa } from '../../core/bank-logic';
import { BankReconciliationStore } from '../../core/bank-store';
import { formatDateFr } from '../../core/lettrage-logic';
import { BankOperation, TreasuryEntry } from '../../core/models';
import { Icon } from '../../shared/icon/icon';

interface SuggestionRow {
  suggestion: MatchSuggestion;
  op: BankOperation;
  entry: TreasuryEntry;
}

@Component({
  selector: 'app-bank-step-suggestions',
  imports: [Icon],
  templateUrl: './bank-step-suggestions.html',
  styleUrl: './bank-step-suggestions.css',
})
export class BankStepSuggestions {
  protected readonly store = inject(BankReconciliationStore);

  /** Message de confirmation après « Valider les correspondances sûres ». */
  protected readonly feedback = signal<string | null>(null);

  protected readonly fmt = formatFcfa;
  protected readonly fmtSigned = formatSignedFcfa;
  protected readonly date = formatDateFr;

  protected readonly safeRows = computed(() => this.rows(this.store.safeSuggestions()));
  protected readonly reviewRows = computed(() => this.rows(this.store.reviewSuggestions()));
  protected readonly percent = computed(() => {
    const p = this.store.progress();
    return p.total ? Math.round((p.treated / p.total) * 100) : 0;
  });

  private rows(list: readonly MatchSuggestion[]): SuggestionRow[] {
    const ops = new Map(this.store.operations().map((o) => [o.id, o]));
    const entries = new Map(this.store.openEntries().map((e) => [e.id, e]));
    return list.flatMap((suggestion) => {
      const op = ops.get(suggestion.opId);
      const entry = entries.get(suggestion.entryId);
      return op && entry ? [{ suggestion, op, entry }] : [];
    });
  }

  protected validateAll() {
    const n = this.store.validateAllSafe();
    this.feedback.set(n > 0 ? `${n} correspondance${n > 1 ? 's' : ''} validée${n > 1 ? 's' : ''}.` : null);
  }

  protected validate(opId: string) {
    if (this.store.validateSuggestion(opId)) this.feedback.set('Correspondance validée.');
  }

  protected reject(opId: string) {
    this.store.rejectSuggestion(opId);
    this.feedback.set(null);
  }

  protected restore() {
    this.store.restoreRejected();
    this.feedback.set(null);
  }
}
