import { positiveAmount, roundMoney } from './money';

/** Valeur d'une ligne d'écriture, telle que la lit le formulaire. */
export interface LineValue {
  compte: string;
  libelle: string;
  debit: number | null;
  credit: number | null;
}

/**
 * Pourquoi une ligne d'écriture est invalide, en langage courant (ou null si elle est correcte).
 * Une ligne doit avoir un compte et un montant au débit OU au crédit, jamais les deux.
 */
export function describeLineIssue(line: Pick<LineValue, 'compte' | 'debit' | 'credit'>): string | null {
  const debit = Number(line.debit) || 0;
  const credit = Number(line.credit) || 0;
  if (!line.compte) return 'choisissez un compte.';
  if (debit < 0 || credit < 0) return 'les montants ne peuvent pas être négatifs.';
  if (debit > 0 && credit > 0) return 'renseignez le débit ou le crédit, pas les deux.';
  if (debit === 0 && credit === 0) return 'renseignez un montant au débit ou au crédit.';
  return null;
}

export interface EntryTotals {
  debit: number;
  credit: number;
  gap: number;
  balanced: boolean;
}

/** Totaux et équilibre. Les montants négatifs ou illisibles comptent pour 0 : la ligne est signalée à part. */
export function computeTotals(lines: readonly Pick<LineValue, 'debit' | 'credit'>[]): EntryTotals {
  const debit = roundMoney(lines.reduce((sum, l) => sum + positiveAmount(l.debit), 0));
  const credit = roundMoney(lines.reduce((sum, l) => sum + positiveAmount(l.credit), 0));
  return { debit, credit, gap: roundMoney(debit - credit), balanced: debit > 0 && debit === credit };
}
