import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EntryStepConfirm } from './entry-step-confirm';
import { EntryWizardStore } from '../../core/entry-wizard-store';

describe('EntryStepConfirm', () => {
  let fixture: ComponentFixture<EntryStepConfirm>;
  let store: EntryWizardStore;
  let el: HTMLElement;

  beforeEach(async () => {
    localStorage.removeItem('gc.entry-wizard.draft.v1');
    await TestBed.configureTestingModule({ imports: [EntryStepConfirm] }).compileComponents();
    store = TestBed.inject(EntryWizardStore);
    store.reset();
    store.informations.patchValue({ journalId: 'banque', date: '2026-09-21', libelle: 'Encaissement client' });
    store.lignes.at(0).patchValue({ compte: '512006', debit: 150000 });
    store.lignes.at(1).patchValue({ compte: '411001', credit: 150000 });
    fixture = TestBed.createComponent(EntryStepConfirm);
    el = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should warn that the action is irreversible', () => {
    expect(el.textContent).toContain('irréversible');
    expect(el.textContent).toContain('extourne');
  });

  it('should show the recap and emit on confirm/cancel', () => {
    expect(el.textContent).toContain('Banque');
    let confirmed = false;
    let cancelled = false;
    fixture.componentInstance.confirmed.subscribe(() => (confirmed = true));
    fixture.componentInstance.cancelled.subscribe(() => (cancelled = true));
    const buttons = Array.from(el.querySelectorAll<HTMLButtonElement>('button'));
    buttons.find((b) => b.textContent?.includes('Confirmer'))?.click();
    buttons.find((b) => b.textContent?.includes('Annuler'))?.click();
    expect(confirmed).toBe(true);
    expect(cancelled).toBe(true);
  });
});
