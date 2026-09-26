import { LettrageStore } from './lettrage-store';

/** Le store ne dépend d'aucun service Angular : on peut l'instancier directement. */
describe('LettrageStore', () => {
  let s: LettrageStore;
  const pick = (...ids: string[]) => ids.forEach((id) => s.toggleLine(id));
  const line = (id: string) => s.lines().find((l) => l.id === id)!;
  const startOn = (tiersId: string) => {
    s.selectTiers(tiersId);
    s.goToLines();
  };

  beforeEach(() => {
    s = new LettrageStore();
  });

  describe('step 1 — choosing the tiers', () => {
    it('should build the tiers from the chart of accounts, including one with no line at all', () => {
      expect(s.tiers.map((t) => t.code).sort()).toEqual(['401169', '401170', '411001', '411002']);
      const counts = Object.fromEntries(s.tiersSummaries().map((x) => [x.tiers.code, x.openCount]));
      expect(counts['411002']).toBe(7);
      expect(counts['401169']).toBe(0);
    });

    it('should block the next step until a tiers is chosen', () => {
      s.goToLines();
      expect(s.currentStep()).toBe(1);
      expect(s.tiersTouched()).toBe(true);
      startOn('411002');
      expect(s.currentStep()).toBe(2);
      expect(s.factures().length).toBe(4);
      expect(s.paiements().length).toBe(3);
    });

    it('should ignore an unknown tiers', () => {
      s.selectTiers('999999');
      expect(s.tiersId()).toBe('');
    });

    it('should clear the ticked lines when the tiers changes', () => {
      startOn('411002');
      pick('lp-f1');
      s.selectTiers('401170');
      expect(s.selectedIds().length).toBe(0);
    });
  });

  describe('step 2 — ticking lines', () => {
    it('should go from idle to incomplete to exact as lines are ticked', () => {
      startOn('411002');
      expect(s.match().state).toBe('idle');
      expect(s.canLetter()).toBe(false);

      pick('lp-f1', 'lp-f2');
      expect(s.match().state).toBe('incomplete');
      s.requestLettrage();
      expect(s.currentStep()).toBe(2);

      pick('lp-p1');
      expect(s.match().state).toBe('exact');
      expect(s.match().totalFactures).toBe(250000);
      expect(s.canLetter()).toBe(true);
    });

    it('should refuse to tick a line of another tiers or one that is already fully lettered', () => {
      startOn('411002');
      s.toggleLine('bw-f1');
      expect(s.selectedIds().length).toBe(0);

      pick('lp-f1', 'lp-f2', 'lp-p1');
      s.requestLettrage();
      s.startAnother();
      s.toggleLine('lp-f1');
      expect(s.selectedIds().length).toBe(0);
    });

    it('should tick and untick a whole side without duplicates', () => {
      startOn('401170');
      s.selectAll('facture');
      expect(s.selectedFactures().length).toBe(3);
      expect(s.match().totalFactures).toBe(840000);
      s.selectAll('facture');
      expect(s.selectedIds().length).toBe(3);
      s.clearSelection('facture');
      expect(s.selectedIds().length).toBe(0);
    });

    it('should show an empty state for a tiers with nothing to letter', () => {
      startOn('401169');
      expect(s.currentStep()).toBe(2);
      expect(s.hasOpenLines()).toBe(false);
    });
  });

  describe('exact lettrage', () => {
    it('should letter in one click, without confirmation, and settle the lines', () => {
      startOn('411002');
      pick('lp-f1', 'lp-f2', 'lp-p1');
      s.requestLettrage();

      expect(s.currentStep()).toBe(4);
      const r = s.result()!;
      expect(r.statut).toBe('total');
      expect(r.code).toBe('A');
      expect(r.montant).toBe(250000);
      expect(r.reste).toBe(0);
      expect(s.factures().length).toBe(2);
      expect(s.paiements().length).toBe(2);
      expect(s.position().net).toBe(170000);
      expect(s.auditTrail().length).toBe(1);
    });

    it('should ignore « confirm » when the lettrage is exact or when not on the confirmation step', () => {
      startOn('411002');
      pick('lp-f1', 'lp-f2', 'lp-p1');
      s.confirmPartial();
      expect(s.currentStep()).toBe(2);
      expect(s.result()).toBeNull();
    });
  });

  describe('partial lettrage', () => {
    it('should go through the confirmation, letter oldest invoices first and keep the balance due', () => {
      startOn('411002');
      pick('lp-f1', 'lp-f2', 'lp-p2');
      expect(s.match().state).toBe('partial');
      expect(s.match().lettrable).toBe(200000);
      expect(s.match().reste).toBe(50000);
      expect(s.match().resteSide).toBe('facture');

      s.requestLettrage();
      expect(s.currentStep()).toBe(3);
      expect(s.result()).toBeNull();

      s.confirmPartial();
      expect(s.currentStep()).toBe(4);
      expect(s.result()!.statut).toBe('partiel');
      expect(s.result()!.reste).toBe(50000);
      expect(line('lp-f1').restant).toBe(0);
      expect(line('lp-f2').restant).toBe(50000);
      expect(line('lp-p2').restant).toBe(0);
      expect(s.factures().find((l) => l.id === 'lp-f2')!.restant).toBe(50000);
    });

    it('should go back to the selection, with nothing lettered, when the confirmation is cancelled', () => {
      startOn('411002');
      pick('lp-f1', 'lp-f2', 'lp-p2');
      s.requestLettrage();
      s.cancelConfirm();
      expect(s.currentStep()).toBe(2);
      expect(s.selectedIds().length).toBe(3);
      expect(s.records().length).toBe(0);
    });

    it('should keep an overpayment on the payment side', () => {
      startOn('411001');
      pick('lk-f1', 'lk-p1');
      expect(s.match().resteSide).toBe('paiement');
      expect(s.match().reste).toBe(30000);
      s.requestLettrage();
      s.confirmPartial();
      expect(line('lk-p1').restant).toBe(30000);
      expect(s.position().net).toBe(-30000);
    });

    it('should not letter twice on a double click', () => {
      startOn('411002');
      pick('lp-f1', 'lp-f2', 'lp-p2');
      s.requestLettrage();
      s.confirmPartial();
      s.confirmPartial();
      s.requestLettrage();
      expect(s.records().length).toBe(1);
    });

    it('should never change the balance of the tiers (accounting invariant)', () => {
      startOn('411002');
      const before = s.position().net;
      pick('lp-f1', 'lp-f2', 'lp-p2');
      s.requestLettrage();
      s.confirmPartial();
      expect(s.position().net).toBe(before);
    });
  });

  describe('stale selections', () => {
    it('should not letter silently when a ticked line was lettered elsewhere in the meantime', () => {
      startOn('411002');
      pick('lp-f1', 'lp-f2', 'lp-p1', 'lp-p2');
      expect(s.match().state).toBe('partial');
      s.lines.update((ls) => ls.map((l) => (l.id === 'lp-f2' ? { ...l, restant: 0 } : l)));

      s.requestLettrage();
      expect(s.currentStep()).toBe(3);
      s.confirmPartial();

      expect(s.currentStep()).toBe(2);
      expect(s.error()).toBeTruthy();
      expect(s.records().length).toBe(0);
      expect([...s.selectedIds()].sort()).toEqual(['lp-f1', 'lp-p1', 'lp-p2']);
    });

    it('should not letter silently when the selection stops being partial during the confirmation', () => {
      startOn('411002');
      pick('lp-f1', 'lp-f2', 'lp-p2');
      s.requestLettrage();
      s.lines.update((ls) => ls.map((l) => (l.id === 'lp-p2' ? { ...l, restant: 0 } : l)));
      s.confirmPartial();
      expect(s.currentStep()).toBe(2);
      expect(s.error()).toBeTruthy();
      expect(s.records().length).toBe(0);
    });
  });

  describe('cancelling a lettrage', () => {
    it('should ask for a dedicated confirmation, restore the lines and leave a trace', () => {
      startOn('411002');
      pick('lp-f1', 'lp-f2', 'lp-p2');
      s.requestLettrage();
      s.confirmPartial();

      s.requestCancel();
      expect(s.cancelPending()).toBe(true);
      s.abortCancel();
      expect(s.cancelPending()).toBe(false);
      expect(s.result()!.annule).toBe(false);

      s.requestCancel();
      s.confirmCancel();
      expect(s.result()!.annule).toBe(true);
      expect(line('lp-f1').restant).toBe(150000);
      expect(line('lp-f2').restant).toBe(100000);
      expect(line('lp-p2').restant).toBe(200000);
      expect(s.auditTrail().length).toBe(2);
      expect(s.auditTrail()[1].what).toContain('411002');
    });

    it('should never cancel the same lettrage twice', () => {
      startOn('411002');
      pick('lp-f1', 'lp-f2', 'lp-p1');
      s.requestLettrage();
      s.requestCancel();
      s.confirmCancel();
      s.confirmCancel();
      s.requestCancel();
      expect(s.cancelPending()).toBe(false);
      expect(s.auditTrail().length).toBe(2);
      expect(s.records()[0].annule).toBe(true);
    });

    it('should not reuse the code of a cancelled lettrage', () => {
      startOn('411002');
      pick('lp-f1', 'lp-f2', 'lp-p1');
      s.requestLettrage();
      s.requestCancel();
      s.confirmCancel();
      s.startAnother();
      expect(s.currentStep()).toBe(2);
      pick('lp-f1', 'lp-f2', 'lp-p1');
      s.requestLettrage();
      expect(s.result()!.code).toBe('B');
    });
  });

  describe('lifecycle', () => {
    it('should number lettrages independently for each tiers', () => {
      startOn('411002');
      pick('lp-f1', 'lp-f2', 'lp-p1');
      s.requestLettrage();
      s.changeTiers();
      startOn('401170');
      pick('bw-f1', 'bw-p1');
      s.requestLettrage();
      expect(s.result()!.code).toBe('A');
      expect(s.result()!.tiersId).toBe('401170');
    });

    it('should not show an old result when entering the page again, but keep work in progress', () => {
      startOn('411002');
      pick('lp-f1');
      s.enter();
      expect(s.currentStep()).toBe(2);
      expect(s.selectedIds().length).toBe(1);

      pick('lp-f2', 'lp-p1');
      s.requestLettrage();
      expect(s.currentStep()).toBe(4);
      s.enter();
      expect(s.currentStep()).toBe(1);
      expect(s.result()).toBeNull();
      expect(s.tiersId()).toBe('');
      expect(s.records().length).toBe(1);
    });

    it('should only allow going backwards with the progress dots, never from the result', () => {
      startOn('411002');
      s.goBackTo(3);
      expect(s.currentStep()).toBe(2);
      s.goBackTo(1);
      expect(s.currentStep()).toBe(1);

      s.goToLines();
      pick('lp-f1', 'lp-f2', 'lp-p1');
      s.requestLettrage();
      s.goBackTo(1);
      expect(s.currentStep()).toBe(4);
    });

    it('should restore the demonstration data on resetData', () => {
      startOn('411002');
      pick('lp-f1', 'lp-f2', 'lp-p1');
      s.requestLettrage();
      s.resetData();
      expect(s.records().length).toBe(0);
      expect(line('lp-f1').restant).toBe(150000);
    });
  });
});
