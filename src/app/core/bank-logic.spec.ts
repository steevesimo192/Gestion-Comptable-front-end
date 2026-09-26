import {
  analyseManualRow,
  buildReportCsv,
  checkImport,
  computeBalances,
  daysBetween,
  findDuplicate,
  formatFcfa,
  formatSignedFcfa,
  isBankOperation,
  isBankStatement,
  isTreasuryEntry,
  labelSimilarity,
  pairKey,
  parseAmount,
  parseDate,
  parseStatementCsv,
  poolFor,
  progressOf,
  statementLabel,
  suggestCounterpart,
  suggestMatches,
  suggestPeriod,
} from './bank-logic';
import { SAMPLE_CSV, SAMPLE_OPERATIONS, SAMPLE_STATEMENT, SEED_ENTRIES, SEED_STATEMENTS } from './bank-data';
import { BankOperation, BankStatement } from './models';

const NBSP = '\u00a0';

const op = (patch: Partial<BankOperation> & { id: string }): BankOperation => ({
  date: '2026-09-10',
  libelle: 'X',
  montant: 100,
  statut: 'a-rapprocher',
  mode: null,
  entryIds: [],
  note: '',
  createdEntryId: null,
  ...patch,
});

describe('bank-logic', () => {
  describe('formats', () => {
    it('should write amounts with a real minus sign and non-breaking spaces', () => {
      expect(formatFcfa(1250000)).toBe(`1${NBSP}250${NBSP}000${NBSP}FCFA`);
      expect(formatFcfa(-76000)).toBe(`\u221276${NBSP}000${NBSP}FCFA`);
      expect(formatFcfa(0)).toBe(`0${NBSP}FCFA`);
    });

    it('should always write the sign of a signed amount', () => {
      expect(formatSignedFcfa(250000)).toBe(`+250${NBSP}000${NBSP}FCFA`);
      expect(formatSignedFcfa(-45000)).toBe(`\u221245${NBSP}000${NBSP}FCFA`);
      expect(formatSignedFcfa(0)).toBe(`0${NBSP}FCFA`);
    });
  });

  describe('parseAmount', () => {
    it('should read amounts the way people write them', () => {
      expect(parseAmount('1250000')).toBe(1250000);
      expect(parseAmount('1 250 000')).toBe(1250000);
      expect(parseAmount(`1${NBSP}250${NBSP}000 FCFA`)).toBe(1250000);
      expect(parseAmount('1.250.000')).toBe(1250000);
      expect(parseAmount('1.250,50')).toBe(1250.5);
      expect(parseAmount('1,250.50')).toBe(1250.5);
      expect(parseAmount('12,5')).toBe(12.5);
      expect(parseAmount('1.500')).toBe(1500);
      expect(parseAmount('0.500')).toBe(0.5);
    });

    it('should read negative amounts', () => {
      expect(parseAmount('-45000')).toBe(-45000);
      expect(parseAmount('\u221245 000')).toBe(-45000);
      expect(parseAmount('(1500)')).toBe(-1500);
      expect(parseAmount('+300')).toBe(300);
    });

    it('should refuse what is not an amount', () => {
      expect(parseAmount('')).toBeNull();
      expect(parseAmount('abc')).toBeNull();
      expect(parseAmount('12a')).toBeNull();
      expect(parseAmount('1e5')).toBeNull();
      expect(parseAmount('--5')).toBeNull();
      expect(parseAmount(null)).toBeNull();
      expect(parseAmount(NaN)).toBeNull();
    });

    it('should never return a negative zero', () => {
      expect(parseAmount('-0')).toBe(0);
    });
  });

  describe('parseDate', () => {
    it('should accept the usual formats', () => {
      expect(parseDate('2026-09-24')).toBe('2026-09-24');
      expect(parseDate('24/09/2026')).toBe('2026-09-24');
      expect(parseDate('24-09-2026')).toBe('2026-09-24');
      expect(parseDate('24.09.2026')).toBe('2026-09-24');
      expect(parseDate('4/9/26')).toBe('2026-09-04');
      expect(parseDate('2026-09-24T10:00:00')).toBe('2026-09-24');
    });

    it('should refuse dates that do not exist', () => {
      expect(parseDate('31/02/2026')).toBeNull();
      expect(parseDate('2026-13-01')).toBeNull();
      expect(parseDate('hier')).toBeNull();
      expect(parseDate('')).toBeNull();
    });

    it('should count days, whatever the order', () => {
      expect(daysBetween('2026-09-10', '2026-09-08')).toBe(2);
      expect(daysBetween('2026-09-08', '2026-09-10')).toBe(2);
      expect(daysBetween('2026-08-31', '2026-09-01')).toBe(1);
    });
  });

  describe('periods and labels', () => {
    it('should propose the whole month when every date is in the same month', () => {
      expect(suggestPeriod(['2026-09-05', '2026-09-28'])).toEqual({ debut: '2026-09-01', fin: '2026-09-30' });
      expect(suggestPeriod(['2026-02-05'])).toEqual({ debut: '2026-02-01', fin: '2026-02-28' });
    });

    it('should otherwise go from the first to the last date', () => {
      expect(suggestPeriod(['2026-09-20', '2026-10-03'])).toEqual({ debut: '2026-09-20', fin: '2026-10-03' });
      expect(suggestPeriod([])).toBeNull();
    });

    it('should name a statement after its month, or after its dates', () => {
      expect(statementLabel('2026-09-01', '2026-09-30')).toBe('Relevé 09/2026');
      expect(statementLabel('2026-09-01', '2026-09-15')).toBe('Relevé du 01/09/2026 au 15/09/2026');
      expect(statementLabel('2026-09-05', '2026-10-04')).toBe('Relevé du 05/09/2026 au 04/10/2026');
    });
  });

  describe('parseStatementCsv', () => {
    it('should read the sample file back into the same operations', () => {
      const r = parseStatementCsv(SAMPLE_CSV);
      expect(r.errors).toEqual([]);
      expect(r.operations).toEqual(SAMPLE_OPERATIONS);
    });

    it('should read a signed amount column, with or without header, and semicolon or comma', () => {
      const a = parseStatementCsv('Date;Libellé;Montant\n05/09/2026;VIR X;250 000\n06/09/2026;PRLV Y;-15000');
      expect(a.operations.map((o) => o.montant)).toEqual([250000, -15000]);

      const b = parseStatementCsv('2026-09-05,VIR X,250000\n2026-09-06,PRLV Y,-15000');
      expect(b.errors).toEqual([]);
      expect(b.operations.length).toBe(2);
    });

    it('should read quoted cells and Windows line endings', () => {
      const r = parseStatementCsv('Date;Libellé;Montant\r\n05/09/2026;"VIR ""X""; suite";100\r\n');
      expect(r.errors).toEqual([]);
      expect(r.operations[0].libelle).toBe('VIR "X"; suite');
    });

    it('should recognise the columns of an export in French, whatever their order', () => {
      const r = parseStatementCsv('Crédit;Débit;Description;Date opération\n100;;Dépôt;05/09/2026\n;40;Retrait;06/09/2026');
      expect(r.errors).toEqual([]);
      expect(r.operations.map((o) => [o.libelle, o.montant])).toEqual([
        ['Dépôt', 100],
        ['Retrait', -40],
      ]);
    });

    it('should point at every bad line, and import nothing', () => {
      const r = parseStatementCsv(
        ['Date;Libellé;Montant', '05/09/2026;OK;100', 'hier;Date;100', '07/09/2026;;100', '08/09/2026;Montant;abc', '09/09/2026;Zéro;0'].join('\n'),
      );
      expect(r.operations).toEqual([]);
      expect(r.errors.length).toBe(4);
      expect(r.errors[0]).toContain('Ligne 3');
      expect(r.errors[1]).toContain('Ligne 4');
      expect(r.errors[2]).toContain('Ligne 5');
      expect(r.errors[3]).toContain('Ligne 6');
    });

    it('should refuse a line with both a debit and a credit', () => {
      const r = parseStatementCsv('Date;Libellé;Débit;Crédit\n05/09/2026;X;100;100');
      expect(r.errors[0]).toContain('une seule colonne');
    });

    it('should explain an unusable file', () => {
      expect(parseStatementCsv('').errors[0]).toContain('vide');
      expect(parseStatementCsv('Foo;Bar;Baz\n1;2;3').errors[0]).toContain('Date');
      expect(parseStatementCsv('Date;Libellé;Truc\n05/09/2026;X;1').errors[0]).toContain('montant');
      expect(parseStatementCsv('Date;Libellé\n').errors[0]).toContain('montant');
      expect(parseStatementCsv('05/09/2026;X').errors[0]).toContain('trois colonnes');
      expect(parseStatementCsv('Date;Libellé;Montant').errors[0]).toContain('aucune opération');
    });

    it('should sort operations by date', () => {
      const r = parseStatementCsv('Date;Libellé;Montant\n09/09/2026;B;1\n05/09/2026;A;1');
      expect(r.operations.map((o) => o.libelle)).toEqual(['A', 'B']);
    });
  });

  describe('analyseManualRow', () => {
    const row = (p: Partial<{ date: string; libelle: string; sortie: string; entree: string }>) => ({
      date: '',
      libelle: '',
      sortie: '',
      entree: '',
      ...p,
    });

    it('should ignore a row that was never filled', () => {
      expect(analyseManualRow(row({})).kind).toBe('empty');
    });

    it('should turn an incoming row into a positive amount and an outgoing one into a negative amount', () => {
      const a = analyseManualRow(row({ date: '2026-09-05', libelle: ' VIR  X ', entree: '250 000' }));
      expect(a).toEqual({ kind: 'op', op: { date: '2026-09-05', libelle: 'VIR X', montant: 250000 } });
      const b = analyseManualRow(row({ date: '05/09/2026', libelle: 'PRLV', sortie: '15000' }));
      expect(b).toEqual({ kind: 'op', op: { date: '2026-09-05', libelle: 'PRLV', montant: -15000 } });
    });

    it('should explain what is missing on a started row', () => {
      const msg = (p: Parameters<typeof row>[0]) => {
        const r = analyseManualRow(row(p));
        return r.kind === 'error' ? r.message : '';
      };
      expect(msg({ libelle: 'X', entree: '1' })).toContain('date');
      expect(msg({ date: '2026-09-05', entree: '1' })).toContain('libellé');
      expect(msg({ date: '2026-09-05', libelle: 'X' })).toContain('montant');
      expect(msg({ date: '2026-09-05', libelle: 'X', entree: 'abc' })).toContain('illisible');
      expect(msg({ date: '2026-09-05', libelle: 'X', entree: '5', sortie: '5' })).toContain('Une seule colonne');
      expect(msg({ date: '2026-09-05', libelle: 'X', entree: '-5' })).toContain('positifs');
      expect(msg({ date: '2026-09-05', libelle: 'X', entree: '0' })).toContain('montant');
    });
  });

  describe('checkImport', () => {
    const form = { compteId: '512006', debut: '2026-09-01', fin: '2026-09-30', soldeInitial: '1000', soldeFinal: '1150' };
    const ops = [
      { date: '2026-09-05', libelle: 'A', montant: 200 },
      { date: '2026-09-06', libelle: 'B', montant: -50 },
    ];

    it('should accept a statement whose balances add up', () => {
      const c = checkImport(form, ops);
      expect(c.valid).toBe(true);
      expect(c.balanced).toBe(true);
      expect(c.totalEntrees).toBe(200);
      expect(c.totalSorties).toBe(50);
      expect(c.calculatedFinal).toBe(1150);
    });

    it('should name each missing field', () => {
      const c = checkImport({ compteId: '', debut: '', fin: '', soldeInitial: '', soldeFinal: 'abc' }, ops);
      expect(Object.keys(c.fieldErrors).sort()).toEqual(['compteId', 'debut', 'fin', 'soldeFinal', 'soldeInitial']);
      expect(c.valid).toBe(false);
    });

    it('should refuse an end date before the start date', () => {
      const c = checkImport({ ...form, debut: '2026-09-30', fin: '2026-09-01' }, ops);
      expect(c.fieldErrors.fin).toContain('après');
    });

    it('should refuse a statement with no operation', () => {
      const c = checkImport(form, []);
      expect(c.valid).toBe(false);
      expect(c.issues[0]).toContain('au moins une opération');
    });

    it('should block when the final balance does not match the operations, and say by how much', () => {
      const c = checkImport({ ...form, soldeFinal: '1200' }, ops);
      expect(c.valid).toBe(false);
      expect(c.balanced).toBe(false);
      expect(c.issues[0]).toContain('écart de 50');
    });

    it('should only warn about operations outside the period', () => {
      const c = checkImport({ ...form, fin: '2026-09-05', soldeFinal: '1150' }, ops);
      expect(c.valid).toBe(true);
      expect(c.warnings[0]).toContain('1 opération est datée en dehors');
    });

    it('should accept the sample statement', () => {
      const c = checkImport(
        {
          compteId: SAMPLE_STATEMENT.compteId,
          debut: SAMPLE_STATEMENT.debut,
          fin: SAMPLE_STATEMENT.fin,
          soldeInitial: String(SAMPLE_STATEMENT.soldeInitial),
          soldeFinal: String(SAMPLE_STATEMENT.soldeFinal),
        },
        SAMPLE_OPERATIONS,
      );
      expect(c.valid).toBe(true);
      expect(c.warnings).toEqual([]);
    });
  });

  describe('findDuplicate', () => {
    it('should spot the same period on the same account', () => {
      expect(findDuplicate(SEED_STATEMENTS, '512006', '2026-08-01', '2026-08-31', [])?.id).toBe('rel-1');
    });

    it('should spot the same operations under another period', () => {
      const same = SEED_STATEMENTS[0].operations.map((o) => ({ date: o.date, libelle: o.libelle, montant: o.montant }));
      expect(findDuplicate(SEED_STATEMENTS, '512006', '2026-08-01', '2026-09-15', same)?.id).toBe('rel-1');
    });

    it('should not confuse two accounts or two different periods', () => {
      expect(findDuplicate(SEED_STATEMENTS, '514000', '2026-08-01', '2026-08-31', [])).toBeNull();
      expect(findDuplicate(SEED_STATEMENTS, '512006', '2026-09-01', '2026-09-30', SAMPLE_OPERATIONS)).toBeNull();
    });
  });

  describe('label similarity', () => {
    it('should ignore banking filler words and plurals', () => {
      expect(labelSimilarity('PRLV AXA ASSURANCES', 'Prime assurance AXA')).toBe(1);
      expect(labelSimilarity('VIR BRASSERIES DU WOURI', 'Règlement Brasseries du Wouri')).toBe(1);
      expect(labelSimilarity('REMISE CHEQUE 004521', 'Chèque n°004521 Le Bon Prix')).toBe(1);
      expect(labelSimilarity('VIR LOYER', 'Facture électricité')).toBe(0);
      expect(labelSimilarity('', 'x')).toBe(0);
    });
  });

  describe('suggestMatches', () => {
    const entries = (ids: string[]) => SEED_ENTRIES.filter((e) => ids.includes(e.id));
    const ops = SAMPLE_OPERATIONS.map((o, i) => ({ id: `o${i + 1}`, ...o }));
    const sept = SEED_ENTRIES.filter((e) => e.id.startsWith('es-'));

    it('should match every sample operation that has an entry, and leave the four others alone', () => {
      const s = suggestMatches(ops, sept);
      expect(s.length).toBe(11);
      const matchedOps = s.map((x) => x.opId);
      ['o6', 'o7', 'o8', 'o9'].forEach((id) => expect(matchedOps.includes(id)).toBe(false));
    });

    it('should call a match sure when amount and date agree, even with a two-day gap and a similar label', () => {
      const s = suggestMatches(ops, sept);
      const by = (opId: string) => s.find((x) => x.opId === opId)!;
      expect(by('o1').confidence).toBe('haute');
      expect(by('o1').entryId).toBe('es-1');
      expect(by('o4').entryId).toBe('es-4');
      expect(by('o4').confidence).toBe('haute');
      expect(by('o10').entryId).toBe('es-6');
      expect(by('o10').confidence).toBe('haute');
      expect(by('o15').entryId).toBe('es-11');
      expect(s.filter((x) => x.confidence === 'haute').length).toBe(9);
    });

    it('should ask for a check when two entries have the same amount, and still pair them one-to-one', () => {
      const s = suggestMatches(ops, sept);
      const a = s.find((x) => x.opId === 'o12')!;
      const b = s.find((x) => x.opId === 'o14')!;
      expect([a.entryId, b.entryId]).toEqual(['es-8', 'es-9']);
      expect(a.confidence).toBe('moyenne');
      expect(b.confidence).toBe('moyenne');
      expect(a.reason).toContain('2 écritures');
      expect(a.alternatives).toBe(1);
    });

    it('should call a match to check when the dates are far apart', () => {
      const s = suggestMatches(
        [{ id: 'a', date: '2026-09-01', libelle: 'Rien', montant: 500 }],
        [{ id: 'e', date: '2026-09-06', libelle: 'Autre', montant: 500 }],
      );
      expect(s[0].confidence).toBe('moyenne');
      expect(s[0].reason).toContain('5 jours');
    });

    it('should never suggest an entry of another amount or beyond the window', () => {
      expect(suggestMatches([{ id: 'a', date: '2026-09-01', libelle: 'x', montant: 500 }], [{ id: 'e', date: '2026-09-01', libelle: 'x', montant: 501 }])).toEqual([]);
      expect(suggestMatches([{ id: 'a', date: '2026-09-01', libelle: 'x', montant: 500 }], [{ id: 'e', date: '2026-09-20', libelle: 'x', montant: 500 }])).toEqual([]);
    });

    it('should not distinguish an incoming amount from an outgoing one of the same size', () => {
      expect(suggestMatches([{ id: 'a', date: '2026-09-01', libelle: 'x', montant: 500 }], [{ id: 'e', date: '2026-09-01', libelle: 'x', montant: -500 }])).toEqual([]);
    });

    it('should skip a refused pair and never offer an entry that a better match already uses', () => {
      const rejected = new Set([pairKey('o12', 'es-8')]);
      const s = suggestMatches(ops, entries(['es-8', 'es-9']), rejected).filter((x) => x.opId === 'o12' || x.opId === 'o14');
      expect(s.length).toBe(1);
      expect(s[0].opId).toBe('o14');
      expect(s[0].entryId).toBe('es-9');
    });

    it('should offer the other entry when the first choice is refused and nothing else claims it', () => {
      const one = [{ id: 'a', date: '2026-09-24', libelle: 'VIR DUPONT', montant: 310000 }];
      const two = entries(['es-8', 'es-9']);
      const s = suggestMatches(one, two, new Set([pairKey('a', 'es-8')]));
      expect(s.length).toBe(1);
      expect(s[0].entryId).toBe('es-9');
    });

    it('should list suggestions by operation date', () => {
      const s = suggestMatches(ops, sept);
      const dates = s.map((x) => ops.find((o) => o.id === x.opId)!.date);
      expect([...dates].sort()).toEqual(dates);
    });
  });

  describe('suggestCounterpart', () => {
    it('should propose bank services for fees and nothing otherwise', () => {
      expect(suggestCounterpart('FRAIS TENUE DE COMPTE', -15000)).toBe('627000');
      expect(suggestCounterpart('COMMISSION VIREMENT', -7500)).toBe('627000');
      expect(suggestCounterpart('VIR FOURNISSEUR Y', -76000)).toBe('');
      expect(suggestCounterpart('FRAIS REMBOURSES', 5000)).toBe('');
    });
  });

  describe('progress, pool and balances', () => {
    const ops: BankOperation[] = [
      op({ id: 'a', montant: 100, statut: 'rapprochee', mode: 'auto', entryIds: ['e1'] }),
      op({ id: 'b', montant: -40, statut: 'rapprochee', mode: 'manuelle', entryIds: ['e2', 'e3'] }),
      op({ id: 'c', montant: -25, statut: 'a-investiguer', note: 'à voir' }),
      op({ id: 'd', montant: 10 }),
    ];

    it('should count what is done and what is left', () => {
      expect(progressOf(ops)).toEqual({ total: 4, matched: 2, auto: 1, manuelle: 1, investigate: 1, remaining: 1, treated: 3 });
    });

    it('should gather the entries of the period plus those already matched here', () => {
      const st: BankStatement = { ...SEED_STATEMENTS[0], statut: 'en-cours' };
      const matchedAll = new Set(['ea-1', 'ea-2']);
      const pool = poolFor(st, SEED_ENTRIES, matchedAll);
      expect(pool.map((e) => e.id)).toEqual(['ea-1', 'ea-2']);

      const sep: BankStatement = { ...SEED_STATEMENTS[0], id: 'x', debut: '2026-09-01', fin: '2026-09-30', operations: [] };
      expect(poolFor(sep, SEED_ENTRIES, matchedAll).length).toBe(11);
      expect(poolFor({ ...sep, compteId: '514000' }, SEED_ENTRIES, matchedAll).length).toBe(0);
    });

    it('should leave out an entry matched by another statement, and keep one created for this statement', () => {
      const sep: BankStatement = { ...SEED_STATEMENTS[0], id: 'x', debut: '2026-09-01', fin: '2026-09-30', operations: [] };
      const pool = poolFor(sep, SEED_ENTRIES, new Set(['es-1']));
      expect(pool.some((e) => e.id === 'es-1')).toBe(false);
      const created = { id: 'ec-1', compteId: '512006', date: '2026-10-02', reference: 'BQ-1', libelle: 'x', montant: 5, releveId: 'x' };
      expect(poolFor(sep, [...SEED_ENTRIES, created], new Set()).some((e) => e.id === 'ec-1')).toBe(true);
    });

    it('should explain the gap exactly by what is not matched', () => {
      const sample = SAMPLE_OPERATIONS.map((o, i) => op({ id: `o${i + 1}`, ...o }));
      const st = SAMPLE_STATEMENT;
      const pool = SEED_ENTRIES.filter((e) => e.id.startsWith('es-'));
      const b = computeBalances({ soldeInitial: st.soldeInitial, soldeFinal: st.soldeFinal, operations: sample, pool, matchedEntryIds: new Set() });
      expect(b.statementGap).toBe(0);
      expect(b.opsTotal).toBe(st.soldeFinal - st.soldeInitial);
      expect(b.gap).toBe(b.investigateTotal + b.untreatedTotal - b.unmatchedEntriesTotal);
    });

    it('should reach a zero gap once every operation is matched with an entry of the same amount', () => {
      const matched = ['es-1', 'es-2'].map((id) => SEED_ENTRIES.find((e) => e.id === id)!);
      const sample = [
        op({ id: 'a', montant: -1850000, statut: 'rapprochee', mode: 'auto', entryIds: ['es-1'] }),
        op({ id: 'b', montant: -187500, statut: 'rapprochee', mode: 'auto', entryIds: ['es-2'] }),
      ];
      const b = computeBalances({
        soldeInitial: 5_000_000,
        soldeFinal: 5_000_000 - 1850000 - 187500,
        operations: sample,
        pool: matched,
        matchedEntryIds: new Set(['es-1', 'es-2']),
      });
      expect(b.gap).toBe(0);
      expect(b.unmatchedEntriesTotal).toBe(0);
    });

    it('should report an inconsistent statement', () => {
      const b = computeBalances({ soldeInitial: 100, soldeFinal: 500, operations: [op({ id: 'a', montant: 50 })], pool: [], matchedEntryIds: new Set() });
      expect(b.statementGap).toBe(350);
    });
  });

  describe('sample data', () => {
    it('should have balances that add up', () => {
      const net = SAMPLE_OPERATIONS.reduce((t, o) => t + o.montant, 0);
      expect(SAMPLE_STATEMENT.soldeInitial + net).toBe(SAMPLE_STATEMENT.soldeFinal);
      expect(SAMPLE_OPERATIONS.length).toBe(15);
    });

    it('should have a closed August statement that adds up and only references existing entries', () => {
      const st = SEED_STATEMENTS[0];
      const net = st.operations.reduce((t, o) => t + o.montant, 0);
      expect(st.soldeInitial + net).toBe(st.soldeFinal);
      st.operations.flatMap((o) => o.entryIds).forEach((id) => expect(SEED_ENTRIES.some((e) => e.id === id)).toBe(true));
      st.operations
        .filter((o) => o.statut === 'rapprochee')
        .forEach((o) => {
          const total = o.entryIds.reduce((t, id) => t + SEED_ENTRIES.find((e) => e.id === id)!.montant, 0);
          expect(total).toBe(o.montant);
        });
    });

    it('should pass its own validators', () => {
      expect(isBankStatement(SEED_STATEMENTS[0])).toBe(true);
      expect(SEED_STATEMENTS[0].operations.every(isBankOperation)).toBe(true);
      expect(SEED_ENTRIES.every(isTreasuryEntry)).toBe(true);
    });
  });

  describe('validators', () => {
    it('should refuse anything that is not a well-formed statement', () => {
      expect(isBankStatement(null)).toBe(false);
      expect(isBankStatement({})).toBe(false);
      expect(isBankStatement({ ...SEED_STATEMENTS[0], debut: 'hier' })).toBe(false);
      expect(isBankStatement({ ...SEED_STATEMENTS[0], statut: 'ouvert' })).toBe(false);
      expect(isBankStatement({ ...SEED_STATEMENTS[0], operations: [{}] })).toBe(false);
      expect(isBankStatement({ ...SEED_STATEMENTS[0], soldeFinal: '1' })).toBe(false);
      expect(isBankOperation({ ...SEED_STATEMENTS[0].operations[0], mode: 'magique' })).toBe(false);
      expect(isTreasuryEntry({ id: 'x' })).toBe(false);
    });
  });

  describe('buildReportCsv', () => {
    it('should list every operation with its status, mode and matched references', () => {
      const st: BankStatement = {
        ...SEED_STATEMENTS[0],
        operations: [
          ...SEED_STATEMENTS[0].operations.slice(0, 2),
          { ...SEED_STATEMENTS[0].operations[2], libelle: 'VIR "M"; NGONO' },
        ],
      };
      const csv = buildReportCsv({
        statement: st,
        entries: SEED_ENTRIES,
        accountLabel: 'Banque ABC',
        balances: computeBalances({
          soldeInitial: st.soldeInitial,
          soldeFinal: st.soldeFinal,
          operations: st.operations,
          pool: poolFor(st, SEED_ENTRIES, new Set(['ea-1', 'ea-2'])),
          matchedEntryIds: new Set(['ea-1', 'ea-2']),
        }),
      });
      const lines = csv.split('\r\n');
      expect(lines[0]).toBe('Rapport de rapprochement bancaire');
      expect(lines[1]).toBe('Relevé;Relevé 08/2026');
      expect(lines[4]).toBe('Statut;Clôturé le 02/09/2026');
      expect(csv).toContain('05/08/2026;VIR SUPERMARCHE LE BON PRIX;500000;Rapprochée;Automatique;RG-0071;');
      expect(csv).toContain('"VIR ""M""; NGONO";-30000;À investiguer;;;Bénéficiaire non identifié');
      expect(lines[8]).toBe('Écart (FCFA);-30000');
    });
  });
});
