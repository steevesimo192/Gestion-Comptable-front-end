import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BankStepSuggestions } from './bank-step-suggestions';
import { BankReconciliationStore } from '../../core/bank-store';

const KEY = 'gc.bank-reconciliation.v1';

describe('BankStepSuggestions', () => {
  let fixture: ComponentFixture<BankStepSuggestions>;
  let store: BankReconciliationStore;
  let el: HTMLElement;

  const text = () => (el.textContent ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ');
  const button = (label: string, root: ParentNode = el) =>
    Array.from(root.querySelectorAll<HTMLButtonElement>('button')).find((b) => b.textContent?.trim() === label);
  const section = (id: string) => el.querySelector<HTMLElement>(`section[aria-labelledby="${id}"]`)!;

  beforeEach(async () => {
    localStorage.removeItem(KEY);
    await TestBed.configureTestingModule({ imports: [BankStepSuggestions] }).compileComponents();
    store = TestBed.inject(BankReconciliationStore);
    store.loadSample();
    store.submitImport();
    fixture = TestBed.createComponent(BankStepSuggestions);
    el = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  });

  afterEach(() => localStorage.removeItem(KEY));

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should announce 11 suggestions: 9 sure ones and 2 to check', () => {
    expect(text()).toContain('11 suggestions trouvées');
    expect(text()).toContain('Correspondances sûres (9)');
    expect(text()).toContain('À vérifier (2)');
    expect(text()).toContain('0 / 15 opérations traitées');
  });

  it('should show both sides of a match with the reason', () => {
    const sure = section('sugg-sures').textContent!.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ');
    expect(sure).toContain('VIR SALAIRES AOUT');
    expect(sure).toContain('BQ-0921');
    expect(sure).toContain('−1 850 000 FCFA');
    expect(sure).toContain('Même montant et même date');
  });

  it('should explain why a match needs checking', () => {
    const review = section('sugg-verifier').textContent!.replace(/\s+/g, ' ');
    expect(review).toContain('VIR CLIENT DUPONT');
    expect(review).toContain('2 écritures ont ce même montant');
  });

  it('should validate all the sure matches in one click', () => {
    button('Valider les 9 correspondances')?.click();
    fixture.detectChanges();

    expect(store.progress().matched).toBe(9);
    expect(store.progress().auto).toBe(9);
    expect(text()).toContain('9 correspondances validées.');
    expect(text()).toContain('9 / 15 opérations traitées');
    expect(el.querySelector('section[aria-labelledby="sugg-sures"]')).toBeNull();
    expect(text()).toContain('À vérifier (2)');
  });

  it('should validate a single match', () => {
    const first = section('sugg-sures').querySelector<HTMLButtonElement>('li button.btn-success')!;
    first.click();
    fixture.detectChanges();
    expect(store.progress().matched).toBe(1);
    expect(text()).toContain('Correspondance validée.');
    expect(text()).toContain('Correspondances sûres (8)');
  });

  it('should ignore a suggestion and bring it back', () => {
    button('Ignorer', section('sugg-sures'))?.click();
    fixture.detectChanges();
    expect(store.rejectedCount()).toBe(1);
    expect(text()).toContain('Correspondances sûres (8)');
    expect(text()).toContain('1 suggestion ignorée');

    button('les revoir')?.click();
    fixture.detectChanges();
    expect(store.rejectedCount()).toBe(0);
    expect(text()).toContain('Correspondances sûres (9)');
  });

  it('should send the user to the manual step with the operation already chosen', () => {
    store.currentStep.set(2);
    button('Choisir moi-même')?.click();
    expect(store.currentStep()).toBe(3);
    expect(store.selectedOp()?.libelle).toBe('VIR CLIENT DUPONT');
  });

  it('should say when nothing more can be suggested', () => {
    store.validateAllSafe();
    store.reviewSuggestions().forEach((s) => store.validateSuggestion(s.opId));
    fixture.detectChanges();
    expect(text()).toContain('Aucune suggestion pour les 4 opérations restantes');
    expect(el.querySelector('section[aria-labelledby="sugg-verifier"]')).toBeNull();
  });

  it('should expose the progress to screen readers', () => {
    const bar = el.querySelector('[role="progressbar"]')!;
    expect(bar.getAttribute('aria-valuenow')).toBe('0');
    store.validateAllSafe();
    fixture.detectChanges();
    expect(bar.getAttribute('aria-valuenow')).toBe('60');
  });
});
