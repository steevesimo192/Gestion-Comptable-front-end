import { TestBed } from '@angular/core/testing';
import { EntryWizardStore } from './entry-wizard-store';

const DRAFT_KEY = 'gc.entry-wizard.draft.v1';

describe('EntryWizardStore', () => {
  let store: EntryWizardStore;

  const create = () => {
    store = TestBed.inject(EntryWizardStore);
    return store;
  };
  const fillInfo = (date = '2026-09-21') =>
    store.informations.patchValue({ journalId: 'achats', date, libelle: 'Facture fournisseur X' });
  const fillBalanced = () => {
    store.lignes.at(0).patchValue({ compte: '601000', debit: 150000 });
    store.lignes.at(1).patchValue({ compte: '401169', credit: 150000 });
  };

  beforeEach(() => {
    localStorage.removeItem(DRAFT_KEY);
    TestBed.configureTestingModule({});
  });

  afterEach(() => localStorage.removeItem(DRAFT_KEY));

  it('should start with two empty lines and nothing postable', () => {
    create();
    expect(store.lignes.length).toBe(2);
    expect(store.canPost()).toBe(false);
    expect(store.postBlockers()).toEqual([]);
  });

  describe('signals follow the form (regression: form values are not signals)', () => {
    it('should update balance and canPost as soon as the lines change', () => {
      create();
      fillInfo();
      store.lignes.at(0).patchValue({ compte: '601000', debit: 150000 });
      expect(store.balanced()).toBe(false);
      expect(store.canPost()).toBe(false);

      store.lignes.at(1).patchValue({ compte: '401169', credit: 150000 });
      expect(store.balanced()).toBe(true);
      expect(store.canPost()).toBe(true);

      store.lignes.at(1).patchValue({ credit: 120000 });
      expect(store.gap()).toBe(30000);
      expect(store.canPost()).toBe(false);
    });

    it('should recompute validity when a line gets its account, not only its amounts', () => {
      create();
      store.lignes.at(0).patchValue({ debit: 100 });
      store.lignes.at(1).patchValue({ credit: 100 });
      expect(store.linesReady()).toBe(false);
      store.lignes.at(0).patchValue({ compte: '601000' });
      store.lignes.at(1).patchValue({ compte: '401169' });
      expect(store.linesReady()).toBe(true);
    });
  });

  describe('validation', () => {
    it('should reject negative amounts', () => {
      create();
      store.lignes.at(0).patchValue({ compte: '601000', debit: -150000 });
      store.lignes.at(1).patchValue({ compte: '401169', credit: -150000 });
      expect(store.linesReady()).toBe(false);
      expect(store.canPost()).toBe(false);
      expect(store.postBlockers().join(' ')).toContain('négatifs');
    });

    it('should reject a line with both debit and credit', () => {
      create();
      store.lignes.at(0).patchValue({ compte: '601000', debit: 100, credit: 100 });
      expect(store.linesReady()).toBe(false);
    });

    it('should explain in plain words what blocks « Comptabiliser »', () => {
      create();
      fillInfo('2026-08-10');
      store.lignes.at(0).patchValue({ compte: '601000', debit: 150000 });
      const text = store.postBlockers().join(' | ');
      expect(text).toContain('clôturée');
      expect(text).toContain('ligne 2');
      expect(text).toContain('égaux');
    });

    it('should always keep at least two lines', () => {
      create();
      store.removeLine(0);
      expect(store.lignes.length).toBe(2);
      store.addLine();
      store.removeLine(0);
      expect(store.lignes.length).toBe(2);
    });
  });

  describe('locked period', () => {
    it('should block step 1 when the date falls in a locked period', () => {
      create();
      fillInfo('2026-08-10');
      store.goToStep1();
      expect(store.currentStep()).toBe(1);
      expect(store.periodLocked()).toBe(true);
    });

    it('should re-check at confirmation time and send the user back with an explanation', () => {
      create();
      fillInfo();
      store.goToStep1();
      fillBalanced();
      store.requestPost();
      expect(store.currentStep()).toBe(3);

      // La période est clôturée pendant que l'écran de confirmation est ouvert.
      store.informations.patchValue({ date: '2026-08-10' });
      store.confirmPost();

      expect(store.submitted()).toBeNull();
      expect(store.currentStep()).toBe(2);
      expect(store.postError()).toContain('clôturée');
    });
  });

  describe('posting', () => {
    it('should post once and keep the same reference on a double click', () => {
      create();
      fillInfo();
      store.goToStep1();
      fillBalanced();
      store.requestPost();
      store.confirmPost();
      const reference = store.reference();
      expect(store.submitted()).toBe('comptabilisee');
      expect(store.currentStep()).toBe(4);
      expect(reference).toBeTruthy();

      store.confirmPost();
      expect(store.reference()).toBe(reference);
    });

    it('should not go to the confirmation step when the entry is unbalanced', () => {
      create();
      fillInfo();
      store.goToStep1();
      store.lignes.at(0).patchValue({ compte: '601000', debit: 150000 });
      store.requestPost();
      expect(store.currentStep()).toBe(2);
    });
  });

  describe('drafts', () => {
    it('should keep a saved draft when the user starts a new entry', () => {
      create();
      fillInfo();
      store.goToStep1();
      store.lignes.at(0).patchValue({ compte: '601000', debit: 150000 });
      store.saveAsDraft();
      expect(store.submitted()).toBe('brouillon');

      store.startNew();
      expect(store.submitted()).toBeNull();
      expect(store.currentStep()).toBe(1);
      expect(store.hasDraft()).toBe(true);
    });

    it('should not keep anything after a posted entry when starting a new one', () => {
      create();
      fillInfo();
      store.goToStep1();
      fillBalanced();
      store.requestPost();
      store.confirmPost();
      store.startNew();
      expect(store.hasDraft()).toBe(false);
      expect(localStorage.getItem(DRAFT_KEY)).toBeNull();
    });

    it('should never show the result of a previous entry when the page is entered again', () => {
      create();
      fillInfo();
      store.goToStep1();
      fillBalanced();
      store.requestPost();
      store.confirmPost();
      expect(store.submitted()).toBe('comptabilisee');

      store.enter();
      expect(store.submitted()).toBeNull();
      expect(store.currentStep()).toBe(1);
    });

    it('should offer to resume a saved draft, and rebuild lines that still require an account', () => {
      localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({
          informations: { journalId: 'achats', date: '2026-09-21', piece: '', libelle: 'Brouillon' },
          lignes: [
            { compte: '', libelle: '', debit: 100, credit: null },
            { compte: '401169', libelle: '', debit: null, credit: 100 },
          ],
        }),
      );
      create();
      expect(store.hasDraft()).toBe(true);
      store.applyDraft();
      expect(store.hasDraft()).toBe(false);
      expect(store.currentStep()).toBe(2);
      expect(store.linesReady()).toBe(false);
    });

    it('should survive a corrupted draft', () => {
      localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({
          informations: { journalId: 42, date: null, libelle: 'Abîmé' },
          lignes: [{ compte: 'x', debit: 'beaucoup', credit: {} }, null],
        }),
      );
      create();
      expect(() => store.applyDraft()).not.toThrow();
      expect(store.lignes.length).toBe(2);
      expect(store.lignes.at(0).get('debit')?.value).toBeNull();
    });

    it('should ignore a draft that is not valid JSON', () => {
      localStorage.setItem(DRAFT_KEY, '{pas du json');
      create();
      expect(store.hasDraft()).toBe(false);
    });
  });
});
