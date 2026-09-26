import { BankReconciliationStore } from './bank-store';
import { SAMPLE_CSV, SAMPLE_OPERATIONS } from './bank-data';

const STORAGE_KEY = 'gc.bank-reconciliation.v1';

/** Le store ne dépend d'aucun service Angular : on peut l'instancier directement. */
describe('BankReconciliationStore', () => {
  let s: BankReconciliationStore;

  const opByLabel = (label: string, index = 0) => s.operations().filter((o) => o.libelle === label)[index];
  const importSample = () => {
    s.loadSample();
    expect(s.submitImport()).toBe(true);
  };
  const entryByRef = (ref: string) => s.entries().find((e) => e.reference === ref)!;
  const createFor = (label: string, contrepartie: string) => {
    s.selectOperation(opByLabel(label).id);
    s.openCreate();
    s.setCreateField('contrepartie', contrepartie);
    return s.createMissingEntry();
  };
  /** Traite les 4 opérations sans écriture : 3 créations et 1 à investiguer. */
  const treatEverything = (investigateUnknown = true) => {
    s.validateAllSafe();
    s.validateSuggestion(opByLabel('VIR CLIENT DUPONT', 0).id);
    s.validateSuggestion(opByLabel('VIR CLIENT DUPONT', 1).id);
    createFor('FRAIS TENUE DE COMPTE', '627000');
    createFor('COMMISSION VIREMENT', '627000');
    createFor('VIR FOURNISSEUR Y', '401169');
    const unknown = opByLabel('VIR RECU REF 998 DONNEUR INCONNU');
    s.selectOperation(unknown.id);
    if (investigateUnknown) {
      s.openInvestigate();
      s.setNote('Donneur inconnu, à demander à la banque');
      s.markInvestigate();
    } else {
      s.openCreate();
      s.setCreateField('contrepartie', '471000');
      s.createMissingEntry();
    }
  };

  beforeEach(() => {
    const store = new Map<string, string>();
    // defineProperty : dans un navigateur simulé, `localStorage` n'a qu'un accesseur et refuse l'affectation directe.
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      writable: true,
      value: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => void store.set(k, String(v)),
        removeItem: (k: string) => void store.delete(k),
      },
    });
    s = new BankReconciliationStore();
  });

  describe('step 1 — importing the statement', () => {
    it('should start on the statement step with the closed August statement in the list', () => {
      expect(s.currentStep()).toBe(1);
      expect(s.statements().length).toBe(1);
      expect(s.closedRows().length).toBe(1);
      expect(s.inProgressRows().length).toBe(0);
      expect(s.form().compteId).toBe('512006');
      expect(s.canImport()).toBe(false);
    });

    it('should remind the operation left to investigate on the previous statement', () => {
      expect(s.carryOver().length).toBe(1);
      expect(s.carryOver()[0].op.libelle).toBe('VIR M NGONO');
      expect(s.carryOver()[0].statementLabel).toBe('Relevé 08/2026');
      s.setField('compteId', '514000');
      expect(s.carryOver().length).toBe(0);
    });

    it('should load the sample statement and accept it', () => {
      s.loadSample();
      expect(s.fileName()).toBe('releve-septembre-2026.csv');
      expect(s.importOps().length).toBe(15);
      expect(s.importCheck().balanced).toBe(true);
      expect(s.canImport()).toBe(true);
    });

    it('should propose the period from the file when none was typed yet', () => {
      s.loadCsv('a.csv', SAMPLE_CSV);
      expect(s.form().debut).toBe('2026-09-01');
      expect(s.form().fin).toBe('2026-09-30');
      s.setField('debut', '2026-09-05');
      s.loadCsv('b.csv', SAMPLE_CSV);
      expect(s.form().debut).toBe('2026-09-05');
    });

    it('should block the import until every field and both balances are right', () => {
      s.loadCsv('a.csv', SAMPLE_CSV);
      expect(s.canImport()).toBe(false);
      expect(s.submitImport()).toBe(false);
      expect(s.touched()).toBe(true);
      expect(Object.keys(s.importCheck().fieldErrors).sort()).toEqual(['soldeFinal', 'soldeInitial']);

      s.setField('soldeInitial', '11 170 000');
      s.setField('soldeFinal', '9 000 000');
      expect(s.canImport()).toBe(false);
      expect(s.importBlockers()[0]).toContain('ne correspond pas');

      s.setField('soldeFinal', '9 267 000');
      expect(s.canImport()).toBe(true);
    });

    it('should keep every error of a bad file and import nothing', () => {
      s.loadCsv('mauvais.csv', 'Date;Libellé;Montant\n05/09/2026;OK;100\nhier;X;5');
      expect(s.fileErrors().length).toBe(1);
      expect(s.importOps().length).toBe(0);
      expect(s.importBlockers()[0]).toContain('erreurs');
      s.clearFile();
      expect(s.fileErrors().length).toBe(0);
    });

    it('should report a file that cannot be read at all', () => {
      s.failFile('x.pdf', 'Ce fichier n’est pas un CSV lisible.');
      expect(s.fileErrors()).toEqual(['Ce fichier n’est pas un CSV lisible.']);
      expect(s.canImport()).toBe(false);
    });

    it('should create the statement and go to the suggestions', () => {
      importSample();
      expect(s.currentStep()).toBe(2);
      expect(s.statement()?.id).toBe('rel-2');
      expect(s.label()).toBe('Relevé 09/2026');
      expect(s.operations().length).toBe(15);
      expect(s.operations()[0].id).toBe('rel-2-o1');
      expect(s.progress().remaining).toBe(15);
      expect(s.form().soldeInitial).toBe('');
      expect(s.inProgressRows().length).toBe(1);
    });

    it('should warn before importing the same period twice, and let the user insist', () => {
      importSample();
      s.resetFlow();
      s.loadSample();
      expect(s.submitImport()).toBe(false);
      expect(s.duplicate()?.id).toBe('rel-2');
      expect(s.statements().length).toBe(2);

      expect(s.importAnyway()).toBe(true);
      expect(s.statements().length).toBe(3);
      expect(s.statement()?.id).toBe('rel-3');
    });

    it('should let the user type the operations by hand', () => {
      s.chooseSource('manuel');
      s.setField('debut', '2026-09-01');
      s.setField('fin', '2026-09-30');
      s.setField('soldeInitial', '1000');
      s.setField('soldeFinal', '1150');
      const first = s.manualRows()[0].id;
      s.updateManualRow(first, { date: '2026-09-05', libelle: 'VIR A', entree: '200' });
      s.addManualRow();
      const second = s.manualRows()[1].id;
      s.updateManualRow(second, { date: '06/09/2026', libelle: 'PRLV B', sortie: '50' });
      s.addManualRow();

      expect(s.importOps().map((o) => o.montant)).toEqual([200, -50]);
      expect(s.canImport()).toBe(true);
      expect(s.submitImport()).toBe(true);
      expect(s.operations().length).toBe(2);
    });

    it('should block a manual row that is started but incomplete', () => {
      s.chooseSource('manuel');
      s.setField('debut', '2026-09-01');
      s.setField('fin', '2026-09-30');
      s.setField('soldeInitial', '0');
      s.setField('soldeFinal', '200');
      const id = s.manualRows()[0].id;
      s.updateManualRow(id, { date: '2026-09-05', libelle: 'VIR A', entree: '200' });
      s.addManualRow();
      s.updateManualRow(s.manualRows()[1].id, { libelle: 'sans montant' });
      expect(s.manualErrors().size).toBe(1);
      expect(s.canImport()).toBe(false);
      expect(s.importBlockers()[0]).toContain('1 ligne saisie');
    });

    it('should always keep one manual row', () => {
      const id = s.manualRows()[0].id;
      s.removeManualRow(id);
      expect(s.manualRows().length).toBe(1);
      expect(s.manualRows()[0].id).not.toBe(id);
    });
  });

  describe('step 2 — suggestions', () => {
    beforeEach(() => importSample());

    it('should split the suggestions into sure ones and ones to check', () => {
      expect(s.suggestions().length).toBe(11);
      expect(s.safeSuggestions().length).toBe(9);
      expect(s.reviewSuggestions().length).toBe(2);
    });

    it('should validate one suggestion at a time', () => {
      const first = s.safeSuggestions()[0];
      expect(s.validateSuggestion(first.opId)).toBe(true);
      expect(s.progress().auto).toBe(1);
      expect(s.safeSuggestions().length).toBe(8);
      expect(s.validateSuggestion(first.opId)).toBe(false);
    });

    it('should validate all the sure suggestions at once and leave the others', () => {
      expect(s.validateAllSafe()).toBe(9);
      expect(s.progress().matched).toBe(9);
      expect(s.progress().auto).toBe(9);
      expect(s.progress().remaining).toBe(6);
      expect(s.suggestions().length).toBe(2);
      expect(s.openEntries().length).toBe(2);
      expect(s.validateAllSafe()).toBe(0);
    });

    it('should never match one entry twice', () => {
      s.validateAllSafe();
      const taken = s.operations().filter((o) => o.statut === 'rapprochee').flatMap((o) => o.entryIds);
      expect(new Set(taken).size).toBe(taken.length);
    });

    it('should set a suggestion aside and bring it back', () => {
      const target = s.reviewSuggestions()[0];
      s.rejectSuggestion(target.opId);
      expect(s.rejectedCount()).toBe(1);
      expect(s.suggestions().some((x) => x.opId === target.opId && x.entryId === target.entryId)).toBe(false);
      s.restoreRejected();
      expect(s.rejectedCount()).toBe(0);
      expect(s.suggestions().length).toBe(11);
    });

    it('should open the manual step on the chosen operation', () => {
      const target = s.reviewSuggestions()[0];
      s.reviewManually(target.opId);
      expect(s.currentStep()).toBe(3);
      expect(s.selectedOp()?.id).toBe(target.opId);
    });

    it('should move to the manual step only from the suggestions', () => {
      s.toManual();
      expect(s.currentStep()).toBe(3);
      s.toManual();
      expect(s.currentStep()).toBe(3);
    });
  });

  describe('step 3 — manual matching', () => {
    beforeEach(() => {
      importSample();
      s.validateAllSafe();
      s.toManual();
    });

    it('should pick an operation, and pick it again to let go', () => {
      const id = opByLabel('FRAIS TENUE DE COMPTE').id;
      s.selectOperation(id);
      expect(s.selectedOp()?.id).toBe(id);
      s.selectOperation(id);
      expect(s.selectedOp()).toBeNull();
    });

    it('should not select an operation that is already treated', () => {
      s.selectOperation(opByLabel('VIR SALAIRES AOUT').id);
      expect(s.selectedOp()).toBeNull();
    });

    it('should list first the entries with the same amount as the chosen operation', () => {
      s.selectOperation(opByLabel('VIR CLIENT DUPONT', 1).id);
      const ids = s.rankedEntries().map((e) => e.id);
      expect(ids).toEqual(['es-9', 'es-8']);
    });

    it('should require the ticked entries to add up exactly to the operation', () => {
      const op = opByLabel('VIR CLIENT DUPONT', 0);
      s.selectOperation(op.id);
      expect(s.canAssociate()).toBe(false);
      expect(s.associateHint()).toContain('Cochez');

      s.toggleEntry('es-8');
      expect(s.selectedTotal()).toBe(310000);
      expect(s.difference()).toBe(0);
      expect(s.canAssociate()).toBe(true);
      expect(s.associateHint()).toBeNull();

      s.toggleEntry('es-9');
      expect(s.canAssociate()).toBe(false);
      expect(s.associateHint()).toContain('dépassent');
    });

    it('should say how much is missing when the entries fall short', () => {
      const op = opByLabel('VIR CLIENT DUPONT', 0);
      s.selectOperation(op.id);
      s.setField('compteId', '512006');
      s.entries.update((l) => [...l, { id: 'x1', compteId: '512006', date: '2026-09-24', reference: 'X', libelle: 'part', montant: 100000 }]);
      s.toggleEntry('x1');
      expect(s.associateHint()).toContain('Il manque');
    });

    it('should group several entries against one operation', () => {
      s.entries.update((l) => [
        ...l,
        { id: 'p1', compteId: '512006', date: '2026-09-15', reference: 'P1', libelle: 'Part 1', montant: -10000 },
        { id: 'p2', compteId: '512006', date: '2026-09-15', reference: 'P2', libelle: 'Part 2', montant: -5000 },
      ]);
      s.selectOperation(opByLabel('FRAIS TENUE DE COMPTE').id);
      s.toggleEntry('p1');
      expect(s.canAssociate()).toBe(false);
      s.toggleEntry('p2');
      expect(s.canAssociate()).toBe(true);
      expect(s.associateSelection()).toBe(true);
      const op = opByLabel('FRAIS TENUE DE COMPTE');
      expect(op.statut).toBe('rapprochee');
      expect(op.mode).toBe('manuelle');
      expect(op.entryIds).toEqual(['p1', 'p2']);
      expect(s.selectedOpId()).toBeNull();
      expect(s.selectedEntryIds().length).toBe(0);
    });

    it('should refuse to associate when the amounts differ', () => {
      s.selectOperation(opByLabel('VIR CLIENT DUPONT', 0).id);
      expect(s.associateSelection()).toBe(false);
      expect(s.progress().manuelle).toBe(0);
    });

    it('should ignore an entry that is not free', () => {
      s.toggleEntry('es-1');
      expect(s.selectedEntryIds().length).toBe(0);
    });

    it('should create the missing entry and match it at once', () => {
      const op = opByLabel('FRAIS TENUE DE COMPTE');
      s.selectOperation(op.id);
      s.openCreate();
      expect(s.createOpen()).toBe(true);
      expect(s.createForm().contrepartie).toBe('627000');
      expect(s.createForm().date).toBe('2026-09-15');
      expect(s.createMissingEntry()).toBe(true);

      const done = opByLabel('FRAIS TENUE DE COMPTE');
      expect(done.statut).toBe('rapprochee');
      expect(done.mode).toBe('manuelle');
      const created = s.entries().find((e) => e.id === done.createdEntryId)!;
      expect(created.montant).toBe(-15000);
      expect(created.reference).toBe('BQ-0928');
      expect(created.contrepartie).toBe('627000');
      expect(created.releveId).toBe('rel-2');
      expect(s.pool().some((e) => e.id === created.id)).toBe(true);
    });

    it('should number created entries one after the other', () => {
      createFor('FRAIS TENUE DE COMPTE', '627000');
      createFor('COMMISSION VIREMENT', '627000');
      expect(entryByRef('BQ-0928').montant).toBe(-15000);
      expect(entryByRef('BQ-0929').montant).toBe(-7500);
    });

    it('should explain what is missing before creating an entry', () => {
      s.selectOperation(opByLabel('VIR FOURNISSEUR Y').id);
      s.openCreate();
      expect(s.createMissingEntry()).toBe(false);
      expect(s.createError()).toContain('contrepartie');
      s.setCreateField('contrepartie', '401169');
      s.setCreateField('date', 'hier');
      expect(s.createMissingEntry()).toBe(false);
      expect(s.createError()).toContain('date');
      s.setCreateField('date', '2026-09-18');
      s.setCreateField('libelle', '  ');
      expect(s.createMissingEntry()).toBe(false);
      expect(s.createError()).toContain('libellé');
      expect(s.entries().filter((e) => e.creeeParRapprochement).length).toBe(0);
    });

    it('should keep an operation to investigate only with a note', () => {
      const op = opByLabel('VIR FOURNISSEUR Y');
      s.selectOperation(op.id);
      s.openInvestigate();
      expect(s.markInvestigate()).toBe(false);
      expect(s.noteError()).toContain('note');
      s.setNote('  Facture introuvable  ');
      expect(s.markInvestigate()).toBe(true);
      const after = opByLabel('VIR FOURNISSEUR Y');
      expect(after.statut).toBe('a-investiguer');
      expect(after.note).toBe('Facture introuvable');
      expect(s.investigateOps().length).toBe(1);
      expect(s.treatedOps().length).toBe(10);
    });

    it('should open only one of the two forms at a time', () => {
      s.selectOperation(opByLabel('FRAIS TENUE DE COMPTE').id);
      s.openCreate();
      s.openInvestigate();
      expect(s.createOpen()).toBe(false);
      expect(s.investigateOpen()).toBe(true);
      s.openCreate();
      expect(s.investigateOpen()).toBe(false);
    });

    it('should undo a matching and free its entries', () => {
      const op = opByLabel('VIR SALAIRES AOUT');
      expect(s.undoOperation(op.id)).toBe(true);
      expect(opByLabel('VIR SALAIRES AOUT').statut).toBe('a-rapprocher');
      expect(s.openEntries().some((e) => e.id === 'es-1')).toBe(true);
      expect(s.undoOperation(op.id)).toBe(false);
    });

    it('should delete the entry that was created for an operation when the matching is undone', () => {
      createFor('FRAIS TENUE DE COMPTE', '627000');
      expect(s.entries().some((e) => e.reference === 'BQ-0928')).toBe(true);
      s.undoOperation(opByLabel('FRAIS TENUE DE COMPTE').id);
      expect(s.entries().some((e) => e.reference === 'BQ-0928')).toBe(false);
      expect(s.pool().some((e) => e.reference === 'BQ-0928')).toBe(false);
    });

    it('should put an investigated operation back to treat', () => {
      const op = opByLabel('VIR FOURNISSEUR Y');
      s.selectOperation(op.id);
      s.openInvestigate();
      s.setNote('à voir');
      s.markInvestigate();
      expect(s.undoOperation(op.id)).toBe(true);
      const back = opByLabel('VIR FOURNISSEUR Y');
      expect(back.statut).toBe('a-rapprocher');
      expect(back.note).toBe('');
    });
  });

  describe('steps 4, 5 and 6 — recap and closing', () => {
    beforeEach(() => {
      importSample();
      s.validateAllSafe();
      s.toManual();
    });

    it('should not show the recap while operations are left', () => {
      expect(s.toRecap()).toBe(false);
      expect(s.currentStep()).toBe(3);
      expect(s.error()).toContain('Il reste 6 opérations');
    });

    it('should not close while operations are left, even by going around the recap', () => {
      expect(s.requestClose()).toBe(false);
      expect(s.confirmClose()).toBe(false);
      expect(s.statement()?.statut).toBe('en-cours');
    });

    it('should reach a zero gap when every operation gets its entry', () => {
      treatEverything(false);
      expect(s.progress().remaining).toBe(0);
      expect(s.toRecap()).toBe(true);
      expect(s.balances()?.gap).toBe(0);
      expect(s.balances()?.statementGap).toBe(0);
      expect(s.progress().auto).toBe(11);
      expect(s.progress().manuelle).toBe(4);
    });

    it('should explain a remaining gap by the operation left to investigate', () => {
      treatEverything(true);
      expect(s.toRecap()).toBe(true);
      const b = s.balances()!;
      expect(b.bank).toBe(9267000);
      expect(b.investigateTotal).toBe(45000);
      expect(b.gap).toBe(45000);
      expect(b.book).toBe(b.bank - 45000);
    });

    it('should close in two steps, with a confirmation between the recap and the closing', () => {
      treatEverything(true);
      s.toRecap();
      expect(s.requestClose()).toBe(true);
      expect(s.currentStep()).toBe(5);
      s.cancelClose();
      expect(s.currentStep()).toBe(4);
      s.requestClose();
      expect(s.confirmClose()).toBe(true);
      expect(s.currentStep()).toBe(6);
      const st = s.statement()!;
      expect(st.statut).toBe('cloture');
      expect(st.clotureLe).toBeTruthy();
      expect(s.summary()?.progress.total).toBe(15);
      expect(s.summary()?.createdCount).toBe(3);
      expect(s.summary()?.investigateOps.length).toBe(1);
    });

    it('should refuse to change a closed statement', () => {
      treatEverything(true);
      s.toRecap();
      s.requestClose();
      s.confirmClose();
      const op = opByLabel('VIR SALAIRES AOUT');
      expect(s.undoOperation(op.id)).toBe(false);
      expect(s.validateAllSafe()).toBe(0);
      expect(s.confirmClose()).toBe(false);
      expect(s.confirmDiscard()).toBe(false);
      s.requestDiscard(s.statement()!.id);
      expect(s.discardPending()).toBeNull();
    });

    it('should not go back from the result with the progress dots', () => {
      treatEverything(true);
      s.toRecap();
      s.requestClose();
      s.confirmClose();
      s.goBackTo(1);
      expect(s.currentStep()).toBe(6);
    });

    it('should export a report of the statement', () => {
      treatEverything(true);
      s.toRecap();
      s.requestClose();
      s.confirmClose();
      expect(s.reportCsv()).toContain('Relevé;Relevé 09/2026');
      expect(s.reportCsv()).toContain('VIR RECU REF 998 DONNEUR INCONNU;45000;À investiguer');
      expect(s.reportFileName()).toBe('rapprochement-512006-2026-09-01-2026-09-30.csv');
    });

    it('should carry the investigated operation over to the next import', () => {
      treatEverything(true);
      s.toRecap();
      s.requestClose();
      s.confirmClose();
      s.startNew();
      expect(s.currentStep()).toBe(1);
      expect(s.carryOver().map((c) => c.op.libelle).sort()).toEqual(['VIR M NGONO', 'VIR RECU REF 998 DONNEUR INCONNU']);
    });
  });

  describe('navigation', () => {
    it('should go back with the progress dots and keep the work done', () => {
      importSample();
      s.validateAllSafe();
      s.toManual();
      s.goBackTo(2);
      expect(s.currentStep()).toBe(2);
      expect(s.progress().matched).toBe(9);
      s.goBackTo(1);
      expect(s.currentStep()).toBe(1);
      s.goBackTo(3);
      expect(s.currentStep()).toBe(1);
    });

    it('should clear the open forms when going back', () => {
      importSample();
      s.toManual();
      s.selectOperation(opByLabel('FRAIS TENUE DE COMPTE').id);
      s.openCreate();
      s.goBackTo(2);
      expect(s.createOpen()).toBe(false);
    });

    it('should resume an in-progress statement at the right step', () => {
      importSample();
      s.resetFlow();
      expect(s.resume('rel-2')).toBe(true);
      expect(s.currentStep()).toBe(2);

      s.validateAllSafe();
      s.validateSuggestion(s.suggestions()[0].opId);
      s.validateSuggestion(s.suggestions()[0].opId);
      s.resetFlow();
      s.resume('rel-2');
      expect(s.currentStep()).toBe(3);

      treatEverything2();
      s.resetFlow();
      s.resume('rel-2');
      expect(s.currentStep()).toBe(4);
    });

    function treatEverything2() {
      s.currentStep.set(3);
      const rest = s.operations().filter((o) => o.statut === 'a-rapprocher');
      for (const o of rest) {
        s.selectOperation(o.id);
        s.openInvestigate();
        s.setNote('à voir');
        s.markInvestigate();
      }
    }

    it('should only resume a statement in progress', () => {
      expect(s.resume('rel-1')).toBe(false);
      expect(s.resume('nope')).toBe(false);
    });

    it('should show a closed statement in read-only mode', () => {
      expect(s.viewClosed('rel-1')).toBe(true);
      expect(s.currentStep()).toBe(6);
      expect(s.summary()?.label).toBe('Relevé 08/2026');
      expect(s.summary()?.progress.investigate).toBe(1);
      expect(s.viewClosed('nope')).toBe(false);
    });

    it('should not show an old result when the page is entered again, but keep work in progress', () => {
      s.viewClosed('rel-1');
      s.enter();
      expect(s.currentStep()).toBe(1);
      expect(s.statementId()).toBeNull();

      importSample();
      s.toManual();
      s.enter();
      expect(s.currentStep()).toBe(3);
      expect(s.statement()?.id).toBe('rel-2');
    });
  });

  describe('abandoning a statement', () => {
    it('should ask for a confirmation, then remove the statement and the entries created for it', () => {
      importSample();
      s.toManual();
      createFor('FRAIS TENUE DE COMPTE', '627000');
      expect(s.entries().some((e) => e.releveId === 'rel-2')).toBe(true);
      s.resetFlow();

      s.requestDiscard('rel-2');
      expect(s.discardPending()).toBe('rel-2');
      s.cancelDiscard();
      expect(s.statements().length).toBe(2);

      s.requestDiscard('rel-2');
      expect(s.confirmDiscard()).toBe(true);
      expect(s.statements().length).toBe(1);
      expect(s.entries().some((e) => e.releveId === 'rel-2')).toBe(false);
    });

    it('should never abandon a closed statement', () => {
      s.requestDiscard('rel-1');
      expect(s.discardPending()).toBeNull();
      expect(s.confirmDiscard()).toBe(false);
      expect(s.statements().length).toBe(1);
    });

    it('should leave the wizard when the statement being worked on is abandoned', () => {
      importSample();
      s.requestDiscard('rel-2');
      s.confirmDiscard();
      expect(s.currentStep()).toBe(1);
      expect(s.statementId()).toBeNull();
    });
  });

  describe('keeping the work between visits', () => {
    it('should find an in-progress statement and its created entries again after a reload', () => {
      importSample();
      s.validateAllSafe();
      s.toManual();
      createFor('FRAIS TENUE DE COMPTE', '627000');

      const again = new BankReconciliationStore();
      expect(again.statements().length).toBe(2);
      expect(again.inProgressRows()[0].progress.matched).toBe(10);
      expect(again.entries().some((e) => e.reference === 'BQ-0928')).toBe(true);
      expect(again.resume('rel-2')).toBe(true);
      expect(again.pool().some((e) => e.reference === 'BQ-0928')).toBe(true);
    });

    it('should start again from the demonstration data when the saved data is unreadable', () => {
      localStorage.setItem(STORAGE_KEY, '{pas du json');
      expect(new BankReconciliationStore().statements().length).toBe(1);

      localStorage.setItem(STORAGE_KEY, JSON.stringify({ v: 1, statements: [{ id: 'x' }], createdEntries: [] }));
      expect(new BankReconciliationStore().statements().length).toBe(1);

      localStorage.setItem(STORAGE_KEY, JSON.stringify({ v: 2, statements: [], createdEntries: [] }));
      expect(new BankReconciliationStore().statements().length).toBe(1);
    });

    it('should refuse saved data that points to an entry that does not exist', () => {
      importSample();
      s.validateAllSafe();
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) as string);
      raw.statements[1].operations[0].entryIds = ['fantome'];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(raw));
      expect(new BankReconciliationStore().statements().length).toBe(1);
    });

    it('should restore the demonstration data on resetData', () => {
      importSample();
      s.resetData();
      expect(s.statements().length).toBe(1);
      expect(s.currentStep()).toBe(1);
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    });
  });

  it('should have a sample file that reads back into the sample operations', () => {
    s.loadCsv('x.csv', SAMPLE_CSV);
    expect(s.importOps()).toEqual(SAMPLE_OPERATIONS);
  });
});
