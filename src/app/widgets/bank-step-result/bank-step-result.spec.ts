import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BankStepResult } from './bank-step-result';
import { BankReconciliationStore } from '../../core/bank-store';

const KEY = 'gc.bank-reconciliation.v1';

describe('BankStepResult', () => {
  let fixture: ComponentFixture<BankStepResult>;
  let store: BankReconciliationStore;
  let el: HTMLElement;

  const text = () => (el.textContent ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ');
  const button = (label: string) =>
    Array.from(el.querySelectorAll<HTMLButtonElement>('button')).find((b) => b.textContent?.trim() === label);

  async function closeSample() {
    store.loadSample();
    store.submitImport();
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
    store.setNote('Donneur inconnu, à demander à la banque');
    store.markInvestigate();
    store.toRecap();
    store.requestClose();
    store.confirmClose();
    fixture = TestBed.createComponent(BankStepResult);
    el = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  }

  beforeEach(async () => {
    localStorage.removeItem(KEY);
    await TestBed.configureTestingModule({ imports: [BankStepResult] }).compileComponents();
    store = TestBed.inject(BankReconciliationStore);
  });

  afterEach(() => localStorage.removeItem(KEY));

  it('should create', async () => {
    await closeSample();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should show the success message with the statement and the closing date', async () => {
    await closeSample();
    const t = text();
    expect(t).toContain('Relevé rapproché');
    expect(t).toContain('rapprochement bancaire du relevé 09/2026');
    expect(t).toContain('Banque ABC');
  });

  it('should show the final tally', async () => {
    await closeSample();
    const t = text();
    expect(t).toContain('9 rapprochées automatiquement');
    expect(t).toContain('2 manuelles');
    expect(t).toContain('1 écart à investiguer');
    expect(t).toContain('3 écritures créées');
    expect(t).toContain('Écart final');
  });

  it('should list the remaining gaps to investigate', async () => {
    await closeSample();
    expect(text()).toContain('VIR RECU REF 998 DONNEUR INCONNU');
    expect(text()).toContain('Donneur inconnu, à demander à la banque');
  });

  it('should toggle the reconciled statement detail', async () => {
    await closeSample();
    expect(el.querySelector('section[aria-labelledby="res-detail"]')).toBeNull();
    button('Voir le relevé rapproché')?.click();
    fixture.detectChanges();
    expect(text()).toContain('VIR SALAIRES AOUT');
    expect(text()).toContain('Rapprochée · auto');
    button('Masquer le relevé rapproché')?.click();
    fixture.detectChanges();
    expect(el.querySelector('section[aria-labelledby="res-detail"]')).toBeNull();
  });

  it('should emit the right events', async () => {
    await closeSample();
    let another = false;
    let home = false;
    fixture.componentInstance.another.subscribe(() => (another = true));
    fixture.componentInstance.goDashboard.subscribe(() => (home = true));
    button('Nouveau rapprochement')?.click();
    button('Retour au tableau de bord')?.click();
    expect(another).toBe(true);
    expect(home).toBe(true);
  });

  it('should let the user export the report as a CSV file', async () => {
    await closeSample();
    const originalCreateObjectURL = (URL as any).createObjectURL;
    (URL as any).createObjectURL = () => 'blob:mock';
    (URL as any).revokeObjectURL = () => undefined;
    button('Exporter le rapport')?.click();
    fixture.detectChanges();
    expect(text()).not.toContain('Le téléchargement n\'a pas pu démarrer.');
    (URL as any).createObjectURL = originalCreateObjectURL;
  });
});
