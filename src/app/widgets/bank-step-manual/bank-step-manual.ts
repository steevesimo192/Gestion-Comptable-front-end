import { Component, computed, inject, signal } from '@angular/core';
import { formatFcfa, formatSignedFcfa } from '../../core/bank-logic';
import { BankReconciliationStore, CreateForm } from '../../core/bank-store';
import { formatDateFr } from '../../core/lettrage-logic';
import { BankOperation } from '../../core/models';
import { roundMoney } from '../../core/money';
import { Icon } from '../../shared/icon/icon';

const simplify = (text: string): string =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

/** Vrai si la recherche se retrouve dans le libellé (sans accents ni majuscules), la référence ou le montant. */
function matches(query: string, montant: number, ...texts: string[]): boolean {
  const q = simplify(query).trim();
  if (!q) return true;
  const digits = q.replace(/\D/g, '');
  if (digits && String(Math.abs(Math.round(montant))).includes(digits)) return true;
  return texts.some((t) => simplify(t).includes(q));
}

@Component({
  selector: 'app-bank-step-manual',
  imports: [Icon],
  templateUrl: './bank-step-manual.html',
  styleUrl: './bank-step-manual.css',
})
export class BankStepManual {
  protected readonly store = inject(BankReconciliationStore);

  protected readonly opQuery = signal('');
  protected readonly entryQuery = signal('');

  protected readonly fmt = formatFcfa;
  protected readonly fmtSigned = formatSignedFcfa;
  protected readonly date = formatDateFr;

  protected readonly visibleOps = computed(() =>
    this.store.openOps().filter((o) => matches(this.opQuery(), o.montant, o.libelle)),
  );
  protected readonly visibleEntries = computed(() =>
    this.store.rankedEntries().filter((e) => matches(this.entryQuery(), e.montant, e.libelle, e.reference)),
  );
  protected readonly checked = computed(() => new Set(this.store.selectedEntryIds()));
  private readonly refById = computed(() => new Map(this.store.entries().map((e) => [e.id, e.reference])));

  protected readonly selectedKind = computed(() => {
    const op = this.store.selectedOp();
    return op ? (op.montant > 0 ? 'Encaissement' : 'Décaissement') : '';
  });

  protected sameAmount(montant: number): boolean {
    const op = this.store.selectedOp();
    return op !== null && roundMoney(op.montant) === roundMoney(montant);
  }

  protected refs(op: BankOperation): string {
    return op.entryIds.map((id) => this.refById().get(id) ?? id).join(', ');
  }

  protected onQuery(target: 'op' | 'entry', event: Event) {
    const value = (event.target as HTMLInputElement).value;
    (target === 'op' ? this.opQuery : this.entryQuery).set(value);
  }

  protected onCreateField(field: keyof CreateForm, event: Event) {
    this.store.setCreateField(field, (event.target as HTMLInputElement | HTMLSelectElement).value);
  }

  protected onNote(event: Event) {
    this.store.setNote((event.target as HTMLTextAreaElement).value);
  }
}
