import { computeTotals, describeLineIssue } from './entry-logic';

describe('entry-logic', () => {
  describe('describeLineIssue', () => {
    it('should accept a line with an account and one amount', () => {
      expect(describeLineIssue({ compte: '601000', debit: 150000, credit: null })).toBeNull();
      expect(describeLineIssue({ compte: '401169', debit: null, credit: 150000 })).toBeNull();
    });

    it('should ask for an account first', () => {
      expect(describeLineIssue({ compte: '', debit: 100, credit: null })).toContain('compte');
    });

    it('should reject a negative amount', () => {
      expect(describeLineIssue({ compte: '601000', debit: -50, credit: null })).toContain('négatifs');
      expect(describeLineIssue({ compte: '601000', debit: null, credit: -50 })).toContain('négatifs');
    });

    it('should reject a line with both debit and credit', () => {
      expect(describeLineIssue({ compte: '601000', debit: 100, credit: 100 })).toContain('pas les deux');
    });

    it('should reject a line with no amount', () => {
      expect(describeLineIssue({ compte: '601000', debit: null, credit: null })).toContain('montant');
      expect(describeLineIssue({ compte: '601000', debit: 0, credit: 0 })).toContain('montant');
    });
  });

  describe('computeTotals', () => {
    it('should report a balanced entry', () => {
      const t = computeTotals([
        { debit: 150000, credit: null },
        { debit: null, credit: 150000 },
      ]);
      expect(t).toEqual({ debit: 150000, credit: 150000, gap: 0, balanced: true });
    });

    it('should report the gap of an unbalanced entry', () => {
      const t = computeTotals([
        { debit: 150000, credit: null },
        { debit: null, credit: 120000 },
      ]);
      expect(t.gap).toBe(30000);
      expect(t.balanced).toBe(false);
    });

    it('should never call an empty entry balanced', () => {
      expect(computeTotals([{ debit: null, credit: null }]).balanced).toBe(false);
    });

    it('should ignore negative amounts instead of letting them cancel out a real one', () => {
      const t = computeTotals([
        { debit: 100, credit: null },
        { debit: null, credit: 200 },
        { debit: 100, credit: -100 },
      ]);
      expect(t.debit).toBe(200);
      expect(t.credit).toBe(200);
    });

    it('should not be fooled by floating point sums', () => {
      const t = computeTotals([
        { debit: 0.1, credit: null },
        { debit: 0.2, credit: null },
        { debit: null, credit: 0.3 },
      ]);
      expect(t.balanced).toBe(true);
    });
  });
});
