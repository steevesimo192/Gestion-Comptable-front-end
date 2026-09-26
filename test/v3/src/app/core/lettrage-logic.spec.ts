import { allocate, allocatedTotal, evaluateMatch, formatDateFr, nextLettrageCode } from './lettrage-logic';

describe('lettrage-logic', () => {
  describe('evaluateMatch', () => {
    it('should be idle when nothing is ticked', () => {
      expect(evaluateMatch(0, 0, 0, 0).state).toBe('idle');
    });

    it('should be incomplete when only one side is ticked', () => {
      expect(evaluateMatch(250000, 0, 2, 0).state).toBe('incomplete');
      expect(evaluateMatch(0, 250000, 0, 1).state).toBe('incomplete');
    });

    it('should detect an exact match', () => {
      const m = evaluateMatch(250000, 250000, 2, 1);
      expect(m.state).toBe('exact');
      expect(m.lettrable).toBe(250000);
      expect(m.reste).toBe(0);
      expect(m.resteSide).toBeNull();
    });

    it('should leave a balance due on the invoices when the payment is smaller', () => {
      const m = evaluateMatch(250000, 200000, 2, 1);
      expect(m.state).toBe('partial');
      expect(m.lettrable).toBe(200000);
      expect(m.reste).toBe(50000);
      expect(m.resteSide).toBe('facture');
    });

    it('should leave an overpayment on the payments when the invoice is smaller', () => {
      const m = evaluateMatch(90000, 120000, 1, 1);
      expect(m.state).toBe('partial');
      expect(m.lettrable).toBe(90000);
      expect(m.reste).toBe(30000);
      expect(m.resteSide).toBe('paiement');
    });

    it('should not be fooled by floating point sums', () => {
      expect(evaluateMatch(0.1 + 0.2, 0.3, 2, 1).state).toBe('exact');
    });
  });

  describe('allocate', () => {
    const lines = [
      { id: 'b', date: '2026-08-28', reference: 'F-2', restant: 100000 },
      { id: 'a', date: '2026-08-12', reference: 'F-1', restant: 150000 },
      { id: 'c', date: '2026-09-09', reference: 'F-3', restant: 320000 },
    ];

    it('should consume the oldest lines first', () => {
      expect(allocate(lines, 200000)).toEqual([
        { ligneId: 'a', montant: 150000 },
        { ligneId: 'b', montant: 50000 },
      ]);
    });

    it('should never go beyond what a line has left', () => {
      const total = allocatedTotal(allocate(lines, 10_000_000));
      expect(total).toBe(570000);
    });

    it('should allocate nothing for a zero amount', () => {
      expect(allocate(lines, 0)).toEqual([]);
    });

    it('should be deterministic when dates are equal', () => {
      const same = [
        { id: 'y', date: '2026-09-01', reference: 'F-9', restant: 10 },
        { id: 'x', date: '2026-09-01', reference: 'F-1', restant: 10 },
      ];
      expect(allocate(same, 10)[0].ligneId).toBe('x');
    });
  });

  describe('nextLettrageCode', () => {
    it('should number A, B, ... Z then AA, AB', () => {
      expect(nextLettrageCode(0)).toBe('A');
      expect(nextLettrageCode(1)).toBe('B');
      expect(nextLettrageCode(25)).toBe('Z');
      expect(nextLettrageCode(26)).toBe('AA');
      expect(nextLettrageCode(27)).toBe('AB');
      expect(nextLettrageCode(51)).toBe('AZ');
      expect(nextLettrageCode(52)).toBe('BA');
    });
  });

  describe('formatDateFr', () => {
    it('should format an ISO date as dd/mm/yyyy', () => {
      expect(formatDateFr('2026-09-24')).toBe('24/09/2026');
    });
    it('should return unknown formats untouched', () => {
      expect(formatDateFr('hier')).toBe('hier');
    });
  });
});
