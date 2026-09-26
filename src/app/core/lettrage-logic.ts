import { LettrageAllocation, LettrageSide } from './models';
import { roundMoney, sumMoney } from './money';

/**
 * Règles du lettrage, sans dépendance Angular pour pouvoir les tester seules.
 *
 * - « exact »   : les deux côtés sélectionnés totalisent exactement le même montant
 * - « partiel » : les totaux diffèrent ; on ne peut lettrer que le plus petit des deux
 * - « incomplet »: un seul côté est coché
 * - « vide »    : rien n'est coché
 */
export type MatchState = 'idle' | 'incomplete' | 'exact' | 'partial';

export interface MatchSummary {
  state: MatchState;
  totalFactures: number;
  totalPaiements: number;
  /** Montant maximum lettrable : jamais au-delà du plus petit des deux totaux. */
  lettrable: number;
  /** Ce qui restera non lettré après l'opération. */
  reste: number;
  /** Côté qui garde le reste : les factures (reste dû) ou les paiements (trop-perçu). */
  resteSide: LettrageSide | null;
}

export function evaluateMatch(
  totalFactures: number,
  totalPaiements: number,
  nbFactures: number,
  nbPaiements: number,
): MatchSummary {
  const f = roundMoney(totalFactures);
  const p = roundMoney(totalPaiements);
  const base = { totalFactures: f, totalPaiements: p, lettrable: 0, reste: 0, resteSide: null };

  if (nbFactures === 0 && nbPaiements === 0) return { ...base, state: 'idle' };
  if (nbFactures === 0 || nbPaiements === 0 || f <= 0 || p <= 0) return { ...base, state: 'incomplete' };

  const lettrable = Math.min(f, p);
  if (f === p) return { ...base, state: 'exact', lettrable };
  return {
    ...base,
    state: 'partial',
    lettrable,
    reste: roundMoney(Math.abs(f - p)),
    resteSide: f > p ? 'facture' : 'paiement',
  };
}

export interface AllocatableLine {
  id: string;
  date: string;
  reference: string;
  restant: number;
}

/**
 * Répartit `amount` sur les lignes, les plus anciennes d'abord (date, puis
 * référence, puis id pour rester déterministe). Une ligne n'est jamais
 * consommée au-delà de son `restant`.
 */
export function allocate(lines: readonly AllocatableLine[], amount: number): LettrageAllocation[] {
  const ordered = [...lines].sort(
    (a, b) => a.date.localeCompare(b.date) || a.reference.localeCompare(b.reference) || a.id.localeCompare(b.id),
  );
  let left = roundMoney(amount);
  const result: LettrageAllocation[] = [];
  for (const line of ordered) {
    if (left <= 0) break;
    const take = roundMoney(Math.min(left, line.restant));
    if (take <= 0) continue;
    result.push({ ligneId: line.id, montant: take });
    left = roundMoney(left - take);
  }
  return result;
}

export function allocatedTotal(allocations: readonly LettrageAllocation[]): number {
  return sumMoney(allocations.map((a) => a.montant));
}

/** 0 → A, 25 → Z, 26 → AA, 27 → AB... (numérotation habituelle des lettrages). */
export function nextLettrageCode(index: number): string {
  let n = Math.max(0, Math.floor(index));
  let code = '';
  do {
    code = String.fromCharCode(65 + (n % 26)) + code;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return code;
}

/** AAAA-MM-JJ → JJ/MM/AAAA. Renvoie le texte tel quel s'il n'a pas ce format. */
export function formatDateFr(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}
