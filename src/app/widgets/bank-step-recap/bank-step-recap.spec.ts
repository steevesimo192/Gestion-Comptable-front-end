import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BankStepRecap } from './bank-step-recap';
import { BankReconciliationStore } from '../../core/bank-store';

const KEY = 'gc.bank-reconciliation.v1';

describe('BankStepRecap', () => {
  let fixture: ComponentFixture<BankStepRecap>;
  let store: BankReconciliationStore;
  let el: HTMLElement;

  const text = () => (el.textContent ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ');
  const render = async () => {
    fixture = TestBed.createComponent(BankStepRecap);
    el = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  };
  const treatAllInvestigate = () => {
    store.validateAllSafe();
    store.reviewSuggestions().forEach((s) => store.validateSuggestion(s.opId));
    ['FRAIS TENUE DE COMPTE', 'COMMISSION VIREMENT', 'VIR FOURNISSEUR Y'].forEach((label) => {
      const op = store.openOps().find((o) => o.libelle === label)!;
      store.selectOperation(op.id);
      store.openCreate();
      store.setCreateField('contrepartie', '627000');
      store.createMissingEntry();
    });
    const last = store.openOps()[0];
    store.selectOperation(last.id);
    store.openInvestigate();
    store.setNote('Donneur inconnu');
    store.markInvestigate();
  };

  beforeEach(async () => {
    localStorage.removeItem(KEY);
    await TestBed.configureTestingModule({ imports: [BankStepRecap] }).compileComponents();
    store = TestBed.inject(BankReconciliationStore);
    store.loadSample();
    store.submitImport();
  });

  afterEach(() => localStorage.removeItem(KEY));

  it('should create', async () => {
    await render();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should show the operation counts by kind', async () => {
    treatAllInvestigate();
    await render();
    const t = text();
    expect(t).toContain('15 opérations');
    expect(t).toContain('9 rapprochées automatiquement');
    expect(t).toContain('2 rapprochées manuellement');
    expect(t).toContain('1 à investiguer');
    expect(t).toContain('3 écritures créées');
  });

  it('should list the operations left to investigate with their reason', async () => {
    treatAllInvestigate();
    await render();
    expect(text()).toContain('Écarts à investiguer');
    expect(text()).toContain('VIR RECU REF 998 DONNEUR INCONNU');
    expect(text()).toContain('Donneur inconnu');
  });

  it('should say there is nothing to investigate once everything is matched', async () => {
    store.validateAllSafe();
    store.reviewSuggestions().forEach((s) => store.validateSuggestion(s.opId));
    ['FRAIS TENUE DE COMPTE', 'COMMISSION VIREMENT', 'VIR FOURNISSEUR Y', 'VIR RECU REF 998 DONNEUR INCONNU'].forEach((label) => {
      const op = store.openOps().find((o) => o.libelle === label)!;
      store.selectOperation(op.id);
      store.openCreate();
      store.setCreateField('contrepartie', '471000');
      store.createMissingEntry();
    });
    await render();
    expect(text()).toContain('Aucune opération à investiguer.');
  });

  it('should warn that operations remain before the gap can be trusted', async () => {
    await render();
    expect(text()).toContain('Il reste 15 opérations à traiter : retournez au rapprochement.');
  });

  it('should show a zero gap as a success once everything is treated', async () => {
    treatAllInvestigate();
    await render();
    expect(text()).toContain('Rapprochement complet : aucun écart.');
  });
});
