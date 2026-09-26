/**
 * Logique métier du rapprochement bancaire, sans aucune dépendance Angular :
 * elle se teste seule et le store ne fait que l'appeler.
 *
 * Convention de signe, identique côté relevé et côté comptabilité :
 * montant positif = entrée d'argent, montant négatif = sortie d'argent.
 */
import { BankOperation, BankStatement, MatchMode, OperationStatus, TreasuryEntry } from './models';
import { formatDateFr } from './lettrage-logic';
import { roundMoney, sumMoney } from './money';

const NBSP = '\u00a0';
const MINUS = '\u2212';
const amountFormat = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });

const norm = (n: number): number => (n === 0 ? 0 : n);
const pad2 = (n: number): string => String(n).padStart(2, '0');

/* ==========================================================================
   Formats
   ========================================================================== */

/** « 1 250 000 FCFA » ; un montant négatif prend un vrai signe moins. */
export function formatFcfa(value: number): string {
  const n = roundMoney(value);
  const digits = amountFormat.format(Math.abs(n)).replace(/[\u202f\u00a0]/g, NBSP);
  return `${n < 0 ? MINUS : ''}${digits}${NBSP}FCFA`;
}

/** « +250 000 FCFA » / « −76 000 FCFA » : le signe est toujours écrit. */
export function formatSignedFcfa(value: number): string {
  const n = roundMoney(value);
  if (n === 0) return formatFcfa(0);
  return `${n > 0 ? '+' : ''}${formatFcfa(n)}`;
}

/* ==========================================================================
   Lecture des montants et des dates saisis à la main ou lus dans un fichier
   ========================================================================== */

/**
 * Lit un montant tel qu'on l'écrit en français ou dans un export bancaire :
 * « 1 250 000 », « -45000 », « 1.250.000 », « 12,5 », « (1500) », « 3 000 FCFA ».
 * Renvoie null si le texte n'est pas un montant lisible.
 */
export function parseAmount(raw: unknown): number | null {
  if (typeof raw === 'number') return Number.isFinite(raw) ? norm(roundMoney(raw)) : null;
  if (typeof raw !== 'string') return null;

  let s = raw.replace(/[\s\u00a0\u202f]/g, '').replace(/(fcfa|xaf|xof|f)$/i, '');
  if (s === '') return null;

  let negative = false;
  if (/^\(.+\)$/.test(s)) {
    negative = true;
    s = s.slice(1, -1);
  }
  s = s.replace(/[\u2212\u2013\u2014]/g, '-');
  if (s.startsWith('-')) {
    negative = !negative;
    s = s.slice(1);
  } else if (s.startsWith('+')) {
    s = s.slice(1);
  }
  if (!/^[\d.,]+$/.test(s) || !/\d/.test(s)) return null;

  const lastDot = s.lastIndexOf('.');
  const lastComma = s.lastIndexOf(',');
  let normalized: string;
  if (lastDot >= 0 && lastComma >= 0) {
    const decimal = lastDot > lastComma ? '.' : ',';
    const thousands = decimal === '.' ? ',' : '.';
    normalized = s.split(thousands).join('').replace(decimal, '.');
  } else if (lastDot >= 0 || lastComma >= 0) {
    const sep = lastDot >= 0 ? '.' : ',';
    const parts = s.split(sep);
    const groupsOfThousands =
      parts.length > 2 || (parts[0] !== '0' && parts[0].length >= 1 && parts[0].length <= 3 && parts[1].length === 3);
    normalized = groupsOfThousands ? parts.join('') : parts.join('.');
  } else {
    normalized = s;
  }
  if (!/^\d+(\.\d+)?$/.test(normalized)) return null;
  const value = Number(normalized);
  if (!Number.isFinite(value)) return null;
  return norm(roundMoney(negative ? -value : value));
}

/** Date lue en AAAA-MM-JJ (ou JJ/MM/AAAA, JJ-MM-AAAA, JJ.MM.AAAA, JJ/MM/AA). Null si elle n'existe pas au calendrier. */
export function parseDate(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const s = raw.trim();
  let y: number;
  let m: number;
  let d: number;
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:$|[T ])/.exec(s);
  if (iso) {
    y = Number(iso[1]);
    m = Number(iso[2]);
    d = Number(iso[3]);
  } else {
    const fr = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})$/.exec(s);
    if (!fr) return null;
    d = Number(fr[1]);
    m = Number(fr[2]);
    y = Number(fr[3]);
    if (fr[3].length === 2) y += 2000;
  }
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
  return `${String(y).padStart(4, '0')}-${pad2(m)}-${pad2(d)}`;
}

export function daysBetween(a: string, b: string): number {
  const toMs = (iso: string) => {
    const [y, m, d] = iso.split('-').map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round(Math.abs(toMs(a) - toMs(b)) / 86_400_000);
}

export function lastDayOfMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Période à proposer d'après les dates lues : le mois entier si tout tient dans un mois, sinon de la première à la dernière date. */
export function suggestPeriod(dates: readonly string[]): { debut: string; fin: string } | null {
  const valid = dates.filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort();
  if (!valid.length) return null;
  const first = valid[0];
  const last = valid[valid.length - 1];
  if (first.slice(0, 7) === last.slice(0, 7)) {
    const [y, m] = first.split('-').map(Number);
    return { debut: `${y}-${pad2(m)}-01`, fin: `${y}-${pad2(m)}-${pad2(lastDayOfMonth(y, m))}` };
  }
  return { debut: first, fin: last };
}

/** « Relevé 09/2026 » pour un mois entier, sinon « Relevé du 01/09/2026 au 15/09/2026 ». */
export function statementLabel(debut: string, fin: string): string {
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(debut);
  const f = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fin);
  if (!d || !f) return 'Relevé bancaire';
  const sameMonth = d[1] === f[1] && d[2] === f[2];
  const fullMonth = sameMonth && d[3] === '01' && Number(f[3]) === lastDayOfMonth(Number(f[1]), Number(f[2]));
  return fullMonth ? `Relevé ${d[2]}/${d[1]}` : `Relevé du ${formatDateFr(debut)} au ${formatDateFr(fin)}`;
}

/* ==========================================================================
   Lecture d'un fichier CSV de relevé
   ========================================================================== */
export interface ParsedOperation {
  date: string;
  libelle: string;
  montant: number;
}

export interface CsvResult {
  operations: ParsedOperation[];
  errors: string[];
}

export const MAX_CSV_LINES = 5000;

const simplify = (text: string): string =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');

function splitCsvLine(line: string, delimiter: string): string[] {
  const cells: string[] = [];
  let current = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quoted) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        current += c;
      }
    } else if (c === '"') {
      quoted = true;
    } else if (c === delimiter) {
      cells.push(current.trim());
      current = '';
    } else {
      current += c;
    }
  }
  cells.push(current.trim());
  return cells;
}

function detectDelimiter(line: string): string {
  const count = (ch: string) => line.split(ch).length - 1;
  if (count(';') > 0) return ';';
  if (count('\t') > 0) return '\t';
  return ',';
}

const HEADER_NAMES = {
  date: ['date', 'datecomptable', 'dateoperation', 'datevaleur'],
  libelle: ['libelle', 'libelleoperation', 'description', 'intitule', 'operation', 'details', 'detail', 'designation'],
  montant: ['montant', 'amount'],
  sortie: ['debit', 'sortie', 'sorties', 'retrait', 'retraits'],
  entree: ['credit', 'entree', 'entrees', 'encaissement', 'depot', 'depots'],
};

function findColumn(headers: string[], names: string[]): number {
  return headers.findIndex((h) => names.includes(h));
}

/**
 * Lit un relevé au format CSV (séparateur « ; », tabulation ou « , »).
 * Colonnes reconnues : Date, Libellé, puis soit Montant (signé), soit Débit et Crédit
 * (ou Sortie et Entrée). L'en-tête est facultatif. Tout est vérifié ligne par ligne :
 * si une seule ligne est illisible, aucune opération n'est renvoyée et chaque erreur
 * est expliquée avec son numéro de ligne.
 */
export function parseStatementCsv(text: string): CsvResult {
  const lines = text.replace(/^\uFEFF/, '').split(/\r\n|\n|\r/);
  const rows = lines.map((content, index) => ({ content, number: index + 1 })).filter((l) => l.content.trim() !== '');
  if (!rows.length) return { operations: [], errors: ['Le fichier est vide.'] };
  if (rows.length > MAX_CSV_LINES + 1) {
    return { operations: [], errors: [`Le fichier contient plus de ${MAX_CSV_LINES} lignes : découpez-le par période.`] };
  }

  const delimiter = detectDelimiter(rows[0].content);
  const firstCells = splitCsvLine(rows[0].content, delimiter);
  const hasHeader = parseDate(firstCells[0]) === null;

  let dateCol = 0;
  let labelCol = 1;
  let amountCol = -1;
  let outCol = -1;
  let inCol = -1;
  const errors: string[] = [];

  if (hasHeader) {
    const headers = firstCells.map(simplify);
    dateCol = findColumn(headers, HEADER_NAMES.date);
    labelCol = findColumn(headers, HEADER_NAMES.libelle);
    amountCol = findColumn(headers, HEADER_NAMES.montant);
    outCol = findColumn(headers, HEADER_NAMES.sortie);
    inCol = findColumn(headers, HEADER_NAMES.entree);
    if (dateCol < 0 || labelCol < 0) {
      return { operations: [], errors: ['La première ligne doit nommer au moins les colonnes « Date » et « Libellé ».'] };
    }
    if (amountCol < 0 && outCol < 0 && inCol < 0) {
      return {
        operations: [],
        errors: ['Aucune colonne de montant reconnue : ajoutez « Montant », ou « Débit » et « Crédit ».'],
      };
    }
  } else if (firstCells.length >= 4) {
    outCol = 2;
    inCol = 3;
  } else if (firstCells.length === 3) {
    amountCol = 2;
  } else {
    return {
      operations: [],
      errors: ['Il faut au moins trois colonnes : Date, Libellé et Montant (ou Débit et Crédit).'],
    };
  }

  const operations: ParsedOperation[] = [];
  const dataRows = hasHeader ? rows.slice(1) : rows;
  for (const row of dataRows) {
    const cells = splitCsvLine(row.content, delimiter);
    const where = `Ligne ${row.number}`;
    const date = parseDate(cells[dateCol] ?? '');
    const libelle = (cells[labelCol] ?? '').replace(/\s+/g, ' ').trim();
    if (!date) {
      errors.push(`${where} : la date « ${cells[dateCol] ?? ''} » est illisible (attendu JJ/MM/AAAA).`);
      continue;
    }
    if (!libelle) {
      errors.push(`${where} : le libellé est manquant.`);
      continue;
    }

    let montant: number | null = null;
    if (amountCol >= 0) {
      montant = parseAmount(cells[amountCol] ?? '');
      if (montant === null) {
        errors.push(`${where} : le montant « ${cells[amountCol] ?? ''} » est illisible.`);
        continue;
      }
    } else {
      const outRaw = outCol >= 0 ? (cells[outCol] ?? '') : '';
      const inRaw = inCol >= 0 ? (cells[inCol] ?? '') : '';
      const out = outRaw.trim() === '' ? 0 : parseAmount(outRaw);
      const inc = inRaw.trim() === '' ? 0 : parseAmount(inRaw);
      if (out === null || inc === null) {
        errors.push(`${where} : un montant est illisible.`);
        continue;
      }
      if (Math.abs(out) > 0 && Math.abs(inc) > 0) {
        errors.push(`${where} : renseignez une seule colonne (sortie ou entrée), pas les deux.`);
        continue;
      }
      montant = norm(roundMoney(Math.abs(inc) - Math.abs(out)));
    }
    if (montant === 0) {
      errors.push(`${where} : le montant est nul.`);
      continue;
    }
    operations.push({ date, libelle, montant });
  }

  if (errors.length) return { operations: [], errors };
  if (!operations.length) return { operations: [], errors: ['Le fichier ne contient aucune opération.'] };
  operations.sort((a, b) => a.date.localeCompare(b.date));
  return { operations, errors: [] };
}

/* ==========================================================================
   Saisie manuelle
   ========================================================================== */
export interface ManualRowInput {
  date: string;
  libelle: string;
  sortie: string;
  entree: string;
}

export type ManualRowState = { kind: 'empty' } | { kind: 'error'; message: string } | { kind: 'op'; op: ParsedOperation };

export function analyseManualRow(row: ManualRowInput): ManualRowState {
  const blank = [row.date, row.libelle, row.sortie, row.entree].every((v) => v.trim() === '');
  if (blank) return { kind: 'empty' };

  const date = parseDate(row.date);
  if (!date) return { kind: 'error', message: 'Indiquez une date valide.' };
  const libelle = row.libelle.replace(/\s+/g, ' ').trim();
  if (!libelle) return { kind: 'error', message: 'Indiquez le libellé de la banque.' };

  const out = row.sortie.trim() === '' ? null : parseAmount(row.sortie);
  const inc = row.entree.trim() === '' ? null : parseAmount(row.entree);
  if ((row.sortie.trim() !== '' && out === null) || (row.entree.trim() !== '' && inc === null)) {
    return { kind: 'error', message: 'Un montant est illisible.' };
  }
  if ((out ?? 0) < 0 || (inc ?? 0) < 0) return { kind: 'error', message: 'Saisissez des montants positifs.' };
  if ((out ?? 0) > 0 && (inc ?? 0) > 0) return { kind: 'error', message: 'Une seule colonne : sortie ou entrée.' };
  if ((out ?? 0) === 0 && (inc ?? 0) === 0) return { kind: 'error', message: 'Indiquez un montant.' };
  return { kind: 'op', op: { date, libelle, montant: norm(roundMoney((inc ?? 0) - (out ?? 0))) } };
}

/* ==========================================================================
   Contrôle avant import
   ========================================================================== */
export type ImportField = 'compteId' | 'debut' | 'fin' | 'soldeInitial' | 'soldeFinal';

export interface ImportForm {
  compteId: string;
  debut: string;
  fin: string;
  soldeInitial: string;
  soldeFinal: string;
}

export interface ImportCheck {
  fieldErrors: Partial<Record<ImportField, string>>;
  /** Blocages qui ne tiennent pas à un champ précis (pas d'opération, soldes qui ne collent pas). */
  issues: string[];
  warnings: string[];
  soldeInitial: number | null;
  soldeFinal: number | null;
  totalEntrees: number;
  totalSorties: number;
  /** Solde initial + opérations, quand le solde initial est lisible. */
  calculatedFinal: number | null;
  balanced: boolean;
  valid: boolean;
}

export function checkImport(form: ImportForm, operations: readonly ParsedOperation[]): ImportCheck {
  const fieldErrors: ImportCheck['fieldErrors'] = {};
  const issues: string[] = [];
  const warnings: string[] = [];

  if (!form.compteId) fieldErrors.compteId = 'Choisissez le compte bancaire.';
  const debut = parseDate(form.debut);
  const fin = parseDate(form.fin);
  if (!debut) fieldErrors.debut = 'Indiquez la date de début.';
  if (!fin) fieldErrors.fin = 'Indiquez la date de fin.';
  if (debut && fin && debut > fin) fieldErrors.fin = 'La date de fin doit être après la date de début.';

  const soldeInitial = form.soldeInitial.trim() === '' ? null : parseAmount(form.soldeInitial);
  const soldeFinal = form.soldeFinal.trim() === '' ? null : parseAmount(form.soldeFinal);
  if (soldeInitial === null) fieldErrors.soldeInitial = 'Indiquez le solde initial du relevé (un nombre).';
  if (soldeFinal === null) fieldErrors.soldeFinal = 'Indiquez le solde final du relevé (un nombre).';

  const totalEntrees = sumMoney(operations.filter((o) => o.montant > 0).map((o) => o.montant));
  const totalSorties = sumMoney(operations.filter((o) => o.montant < 0).map((o) => -o.montant));
  const calculatedFinal = soldeInitial === null ? null : roundMoney(soldeInitial + totalEntrees - totalSorties);
  const balanced = calculatedFinal !== null && soldeFinal !== null && calculatedFinal === soldeFinal;

  if (!operations.length) {
    issues.push('Ajoutez au moins une opération : importez un fichier ou saisissez-les à la main.');
  } else if (calculatedFinal !== null && soldeFinal !== null && !balanced) {
    issues.push(
      `Le solde final ne correspond pas aux opérations : ${formatFcfa(soldeInitial as number)} ${
        totalEntrees - totalSorties < 0 ? MINUS : '+'
      } ${formatFcfa(Math.abs(roundMoney(totalEntrees - totalSorties)))} = ${formatFcfa(calculatedFinal)}, ` +
        `alors que vous avez indiqué ${formatFcfa(soldeFinal)} (écart de ${formatFcfa(roundMoney(soldeFinal - calculatedFinal))}). ` +
        `Vérifiez les soldes ou les lignes.`,
    );
  }

  if (debut && fin && debut <= fin) {
    const outside = operations.filter((o) => o.date < debut || o.date > fin).length;
    if (outside) {
      warnings.push(
        `${outside} opération${outside > 1 ? 's sont datées' : ' est datée'} en dehors de la période du ${formatDateFr(debut)} au ${formatDateFr(fin)}.`,
      );
    }
  }

  return {
    fieldErrors,
    issues,
    warnings,
    soldeInitial,
    soldeFinal,
    totalEntrees,
    totalSorties,
    calculatedFinal,
    balanced,
    valid: Object.keys(fieldErrors).length === 0 && issues.length === 0,
  };
}

/** Empreinte d'un jeu d'opérations, pour repérer un relevé importé deux fois. */
export function fingerprintOperations(ops: readonly { date: string; libelle: string; montant: number }[]): string {
  return ops
    .map((o) => `${o.date}|${simplify(o.libelle)}|${roundMoney(o.montant)}`)
    .sort()
    .join('\n');
}

/** Relevé déjà importé pour le même compte : même période, ou exactement les mêmes opérations. */
export function findDuplicate(
  statements: readonly BankStatement[],
  compteId: string,
  debut: string,
  fin: string,
  operations: readonly ParsedOperation[],
): BankStatement | null {
  const print = operations.length ? fingerprintOperations(operations) : '';
  return (
    statements.find(
      (s) =>
        s.compteId === compteId &&
        ((s.debut === debut && s.fin === fin) || (print !== '' && fingerprintOperations(s.operations) === print)),
    ) ?? null
  );
}

/* ==========================================================================
   Suggestions automatiques : montant identique + date proche + libellé proche
   ========================================================================== */
const STOP_WORDS = new Set([
  'vir', 'virement', 'prlv', 'prelevement', 'reglement', 'paiement', 'facture', 'remise', 'cheque',
  'les', 'des', 'sur', 'par', 'pour', 'avec', 'client', 'fournisseur', 'the',
]);

export function labelTokens(text: string): string[] {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/[^a-z0-9]+/)
    .map((t) => (t.length > 4 && t.endsWith('s') ? t.slice(0, -1) : t))
    .filter((t) => t.length >= 3 && !STOP_WORDS.has(t));
}

/** 0 à 1 : part des mots du libellé le plus court qui se retrouvent dans l'autre. */
export function labelSimilarity(a: string, b: string): number {
  const ta = new Set(labelTokens(a));
  const tb = new Set(labelTokens(b));
  if (!ta.size || !tb.size) return 0;
  let common = 0;
  ta.forEach((t) => {
    if (tb.has(t)) common++;
  });
  return common / Math.min(ta.size, tb.size);
}

export interface SuggestOp {
  id: string;
  date: string;
  libelle: string;
  montant: number;
}

export interface SuggestEntry {
  id: string;
  date: string;
  libelle: string;
  montant: number;
}

export type Confidence = 'haute' | 'moyenne';

export interface MatchSuggestion {
  opId: string;
  entryId: string;
  days: number;
  labelScore: number;
  score: number;
  confidence: Confidence;
  reason: string;
  /** Autres écritures possibles pour la même opération. */
  alternatives: number;
}

export const pairKey = (opId: string, entryId: string): string => `${opId}|${entryId}`;

export const SUGGESTION_WINDOW_DAYS = 7;

/**
 * Propose, pour chaque opération, l'écriture de même montant la plus proche.
 * Chaque écriture n'est proposée qu'une fois (attribution du meilleur score d'abord).
 * « Haute » = correspondance sûre à valider d'un clic ; « moyenne » = à vérifier.
 */
export function suggestMatches(
  ops: readonly SuggestOp[],
  entries: readonly SuggestEntry[],
  rejected: ReadonlySet<string> = new Set<string>(),
  maxDays = SUGGESTION_WINDOW_DAYS,
): MatchSuggestion[] {
  interface Pair {
    op: SuggestOp;
    entry: SuggestEntry;
    days: number;
    label: number;
    score: number;
  }
  const pairs: Pair[] = [];
  const byOp = new Map<string, Pair[]>();

  for (const op of ops) {
    for (const entry of entries) {
      if (roundMoney(op.montant) !== roundMoney(entry.montant)) continue;
      if (rejected.has(pairKey(op.id, entry.id))) continue;
      const days = daysBetween(op.date, entry.date);
      if (days > maxDays) continue;
      const label = labelSimilarity(op.libelle, entry.libelle);
      const score = 0.6 * (1 - days / (maxDays + 1)) + 0.4 * label;
      const pair = { op, entry, days, label, score };
      pairs.push(pair);
      byOp.set(op.id, [...(byOp.get(op.id) ?? []), pair]);
    }
  }

  pairs.sort(
    (a, b) =>
      b.score - a.score || a.days - b.days || a.op.id.localeCompare(b.op.id) || a.entry.id.localeCompare(b.entry.id),
  );

  const usedOps = new Set<string>();
  const usedEntries = new Set<string>();
  const result: MatchSuggestion[] = [];
  for (const p of pairs) {
    if (usedOps.has(p.op.id) || usedEntries.has(p.entry.id)) continue;
    usedOps.add(p.op.id);
    usedEntries.add(p.entry.id);

    const rivals = (byOp.get(p.op.id) ?? []).filter((x) => x.entry.id !== p.entry.id);
    const bestRival = rivals.reduce((m, x) => Math.max(m, x.score), -1);
    const ambiguous = rivals.length > 0 && p.score - bestRival < 0.2;

    let confidence: Confidence;
    let reason: string;
    if (ambiguous) {
      confidence = 'moyenne';
      reason = `${rivals.length + 1} écritures ont ce même montant : vérifiez laquelle correspond.`;
    } else if (p.days <= 1 || (p.label >= 0.5 && p.days <= 3)) {
      confidence = 'haute';
      reason =
        (p.days === 0 ? 'Même montant et même date' : `Même montant, date à ${p.days} jour${p.days > 1 ? 's' : ''}`) +
        (p.label >= 0.5 ? ', libellés proches.' : '.');
    } else {
      confidence = 'moyenne';
      reason = `Même montant, mais les dates sont éloignées de ${p.days} jours.`;
    }
    result.push({
      opId: p.op.id,
      entryId: p.entry.id,
      days: p.days,
      labelScore: p.label,
      score: p.score,
      confidence,
      reason,
      alternatives: rivals.length,
    });
  }

  const dateOf = new Map(ops.map((o) => [o.id, o.date]));
  return result.sort(
    (a, b) => (dateOf.get(a.opId) ?? '').localeCompare(dateOf.get(b.opId) ?? '') || a.opId.localeCompare(b.opId),
  );
}

/** Compte de charge proposé pour une écriture manquante d'après le libellé de la banque. */
export function suggestCounterpart(libelle: string, montant: number): string {
  if (montant < 0 && /frais|commission|agios|tenue de compte|cotisation/i.test(libelle)) return '627000';
  return '';
}

/* ==========================================================================
   Avancement et soldes
   ========================================================================== */
export interface OperationProgress {
  total: number;
  matched: number;
  auto: number;
  manuelle: number;
  investigate: number;
  remaining: number;
  /** Rapprochées ou marquées à investiguer : plus rien à faire dessus. */
  treated: number;
}

export function progressOf(ops: readonly BankOperation[]): OperationProgress {
  const matched = ops.filter((o) => o.statut === 'rapprochee');
  const investigate = ops.filter((o) => o.statut === 'a-investiguer').length;
  const remaining = ops.filter((o) => o.statut === 'a-rapprocher').length;
  return {
    total: ops.length,
    matched: matched.length,
    auto: matched.filter((o) => o.mode === 'auto').length,
    manuelle: matched.filter((o) => o.mode === 'manuelle').length,
    investigate,
    remaining,
    treated: ops.length - remaining,
  };
}

/**
 * Écritures de trésorerie qui concernent ce relevé : celles de la période qui ne sont
 * rapprochées nulle part ailleurs, celles déjà rapprochées ici, et celles créées pour lui.
 */
export function poolFor(
  statement: BankStatement,
  entries: readonly TreasuryEntry[],
  matchedEverywhere: ReadonlySet<string>,
): TreasuryEntry[] {
  const here = new Set(statement.operations.flatMap((o) => o.entryIds));
  return entries
    .filter(
      (e) =>
        e.compteId === statement.compteId &&
        (here.has(e.id) ||
          (!matchedEverywhere.has(e.id) &&
            (e.releveId === statement.id || (e.date >= statement.debut && e.date <= statement.fin)))),
    )
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
}

export interface StatementBalances {
  /** Solde final du relevé de la banque. */
  bank: number;
  /** Solde initial + écritures de la période. */
  book: number;
  /** bank − book : ce qu'il reste à expliquer. */
  gap: number;
  opsTotal: number;
  /** Solde final indiqué − (solde initial + opérations) ; 0 si le relevé est cohérent. */
  statementGap: number;
  /** Opérations bancaires marquées « à investiguer ». */
  investigateTotal: number;
  /** Opérations bancaires encore à traiter. */
  untreatedTotal: number;
  /** Écritures de la comptabilité qui ne figurent pas sur le relevé. */
  unmatchedEntriesTotal: number;
}

export function computeBalances(input: {
  soldeInitial: number;
  soldeFinal: number;
  operations: readonly BankOperation[];
  pool: readonly TreasuryEntry[];
  matchedEntryIds: ReadonlySet<string>;
}): StatementBalances {
  const opsTotal = sumMoney(input.operations.map((o) => o.montant));
  const book = roundMoney(input.soldeInitial + sumMoney(input.pool.map((e) => e.montant)));
  return {
    bank: input.soldeFinal,
    book,
    gap: norm(roundMoney(input.soldeFinal - book)),
    opsTotal,
    statementGap: norm(roundMoney(input.soldeFinal - (input.soldeInitial + opsTotal))),
    investigateTotal: sumMoney(input.operations.filter((o) => o.statut === 'a-investiguer').map((o) => o.montant)),
    untreatedTotal: sumMoney(input.operations.filter((o) => o.statut === 'a-rapprocher').map((o) => o.montant)),
    unmatchedEntriesTotal: sumMoney(input.pool.filter((e) => !input.matchedEntryIds.has(e.id)).map((e) => e.montant)),
  };
}

/* ==========================================================================
   Vérification des données rechargées (localStorage)
   ========================================================================== */
const isObject = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);
const isIso = (x: unknown): x is string => typeof x === 'string' && parseDate(x) === x;
const isNum = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);

const OP_STATUSES: OperationStatus[] = ['a-rapprocher', 'rapprochee', 'a-investiguer'];
const MATCH_MODES: MatchMode[] = ['auto', 'manuelle'];

export function isBankOperation(x: unknown): x is BankOperation {
  if (!isObject(x)) return false;
  return (
    typeof x['id'] === 'string' &&
    isIso(x['date']) &&
    typeof x['libelle'] === 'string' &&
    isNum(x['montant']) &&
    OP_STATUSES.includes(x['statut'] as OperationStatus) &&
    (x['mode'] === null || MATCH_MODES.includes(x['mode'] as MatchMode)) &&
    Array.isArray(x['entryIds']) &&
    (x['entryIds'] as unknown[]).every((id) => typeof id === 'string') &&
    typeof x['note'] === 'string' &&
    (x['createdEntryId'] === null || typeof x['createdEntryId'] === 'string')
  );
}

export function isBankStatement(x: unknown): x is BankStatement {
  if (!isObject(x)) return false;
  return (
    typeof x['id'] === 'string' &&
    typeof x['compteId'] === 'string' &&
    isIso(x['debut']) &&
    isIso(x['fin']) &&
    isNum(x['soldeInitial']) &&
    isNum(x['soldeFinal']) &&
    Array.isArray(x['operations']) &&
    (x['operations'] as unknown[]).every(isBankOperation) &&
    Array.isArray(x['rejected']) &&
    (x['rejected'] as unknown[]).every((k) => typeof k === 'string') &&
    (x['statut'] === 'en-cours' || x['statut'] === 'cloture') &&
    isIso(x['creeLe']) &&
    (x['clotureLe'] === null || isIso(x['clotureLe']))
  );
}

export function isTreasuryEntry(x: unknown): x is TreasuryEntry {
  if (!isObject(x)) return false;
  return (
    typeof x['id'] === 'string' &&
    typeof x['compteId'] === 'string' &&
    isIso(x['date']) &&
    typeof x['reference'] === 'string' &&
    typeof x['libelle'] === 'string' &&
    isNum(x['montant'])
  );
}

/* ==========================================================================
   Rapport exportable
   ========================================================================== */
const csvCell = (value: string | number): string => {
  const text = typeof value === 'number' ? String(value).replace('.', ',') : value;
  return /[;"\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const STATUS_LABEL: Record<OperationStatus, string> = {
  'a-rapprocher': 'À traiter',
  rapprochee: 'Rapprochée',
  'a-investiguer': 'À investiguer',
};

export function buildReportCsv(input: {
  statement: BankStatement;
  entries: readonly TreasuryEntry[];
  accountLabel: string;
  balances: StatementBalances;
}): string {
  const { statement: st, entries, accountLabel, balances } = input;
  const refOf = new Map(entries.map((e) => [e.id, e.reference]));
  const line = (...cells: (string | number)[]) => cells.map(csvCell).join(';');
  const lines: string[] = [
    line('Rapport de rapprochement bancaire'),
    line('Relevé', statementLabel(st.debut, st.fin)),
    line('Compte', `${st.compteId} ${accountLabel}`),
    line('Période', `du ${formatDateFr(st.debut)} au ${formatDateFr(st.fin)}`),
    line('Statut', st.statut === 'cloture' && st.clotureLe ? `Clôturé le ${formatDateFr(st.clotureLe)}` : 'En cours'),
    line('Solde initial (FCFA)', st.soldeInitial),
    line('Solde du relevé (FCFA)', balances.bank),
    line('Solde comptable (FCFA)', balances.book),
    line('Écart (FCFA)', balances.gap),
    '',
    line('Date', 'Libellé', 'Montant (FCFA)', 'Statut', 'Mode', 'Écritures rapprochées', 'Note'),
  ];
  for (const op of st.operations) {
    lines.push(
      line(
        formatDateFr(op.date),
        op.libelle,
        op.montant,
        STATUS_LABEL[op.statut],
        op.mode === 'auto' ? 'Automatique' : op.mode === 'manuelle' ? 'Manuel' : '',
        op.entryIds.map((id) => refOf.get(id) ?? id).join(', '),
        op.note,
      ),
    );
  }
  return lines.join('\r\n');
}
