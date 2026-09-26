import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EntryStepLines } from './entry-step-lines';
import { EntryWizardStore } from '../../core/entry-wizard-store';

describe('EntryStepLines', () => {
  let fixture: ComponentFixture<EntryStepLines>;
  let store: EntryWizardStore;
  let el: HTMLElement;

  const pickerButtons = () => Array.from(el.querySelectorAll<HTMLButtonElement>('table button'));

  beforeEach(async () => {
    localStorage.removeItem('gc.entry-wizard.draft.v1');
    await TestBed.configureTestingModule({ imports: [EntryStepLines] }).compileComponents();
    store = TestBed.inject(EntryWizardStore);
    store.reset();
    fixture = TestBed.createComponent(EntryStepLines);
    el = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should start with two empty lines', () => {
    expect(el.querySelectorAll('tbody tr').length).toBe(2);
  });

  it('should add and remove a line, never going below two', () => {
    store.addLine();
    fixture.detectChanges();
    expect(el.querySelectorAll('tbody tr').length).toBe(3);

    store.removeLine(0);
    store.removeLine(0);
    fixture.detectChanges();
    expect(store.lignes.length).toBe(2);
  });

  it('should show an unbalanced banner, then a balanced one once amounts match', async () => {
    store.lignes.at(0).patchValue({ compte: '512006', debit: 150000 });
    store.lignes.at(1).patchValue({ compte: '706000', credit: 120000 });
    fixture.detectChanges();
    await fixture.whenStable();
    expect(el.textContent).toContain('Écart de');
    expect(store.balanced()).toBe(false);

    store.lignes.at(1).patchValue({ credit: 150000 });
    fixture.detectChanges();
    await fixture.whenStable();
    expect(store.balanced()).toBe(true);
    expect(el.textContent).toContain('Équilibrée');
  });

  it('should open the account picker and select an account', async () => {
    pickerButtons()[0].click();
    fixture.detectChanges();
    await fixture.whenStable();
    const option = Array.from(el.querySelectorAll<HTMLLIElement>('li[role="option"]')).find((li) =>
      li.textContent?.includes('Banque ABC'),
    );
    option?.click();
    fixture.detectChanges();
    expect(store.lignes.at(0).get('compte')?.value).toBe('512006');
  });
});
