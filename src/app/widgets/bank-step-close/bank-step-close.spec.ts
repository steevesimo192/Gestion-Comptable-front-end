import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BankStepClose } from './bank-step-close';
import { BankReconciliationStore } from '../../core/bank-store';

const KEY = 'gc.bank-reconciliation.v1';

describe('BankStepClose', () => {
  let fixture: ComponentFixture<BankStepClose>;
  let store: BankReconciliationStore;
  let el: HTMLElement;

  const text = () => (el.textContent ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ');
  const button = (label: string) =>
    Array.from(el.querySelectorAll<HTMLButtonElement>('button')).find((b) => b.textContent?.trim() === label);

  const treatEverything = () => {
    store.validateAllSafe();
    store.reviewSuggestions().forEach((s) => store.validateSuggestion(s.opId));
    ['FRAIS TENUE DE COMPTE', 'COMMISSION VIREMENT', 'VIR FOURNISSEUR Y', 'VIR RECU REF 998 DONNEUR INCONNU'].forEach((label) => {
      const op = store.openOps().find((o) => o.libelle === label)!;
      store.selectOperation(op.id);
      store.openCreate();
      store.setCreateField('contrepartie', '471000');
      store.createMissingEntry();
    });
  };

  beforeEach(async () => {
    localStorage.removeItem(KEY);
    await TestBed.configureTestingModule({ imports: [BankStepClose] }).compileComponents();
    store = TestBed.inject(BankReconciliationStore);
    store.loadSample();
    store.submitImport();
    fixture = TestBed.createComponent(BankStepClose);
    el = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  });

  afterEach(() => localStorage.removeItem(KEY));

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should block the confirm button while operations remain', () => {
    expect(button('Confirmer la clôture')?.disabled).toBe(true);
    expect(text()).toContain('0 / 15');
  });

  it('should enable the confirm button once everything is treated, with a zero gap', () => {
    treatEverything();
    fixture.detectChanges();
    expect(button('Confirmer la clôture')?.disabled).toBe(false);
    expect(text()).toContain('15 / 15');
  });

  it('should emit cancelled and confirmed', () => {
    treatEverything();
    fixture.detectChanges();
    let cancelled = false;
    let confirmed = false;
    fixture.componentInstance.cancelled.subscribe(() => (cancelled = true));
    fixture.componentInstance.confirmed.subscribe(() => (confirmed = true));
    button('Annuler')?.click();
    button('Confirmer la clôture')?.click();
    expect(cancelled).toBe(true);
    expect(confirmed).toBe(true);
  });
});
