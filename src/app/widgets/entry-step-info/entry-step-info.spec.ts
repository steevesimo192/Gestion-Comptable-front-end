import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EntryStepInfo } from './entry-step-info';
import { EntryWizardStore } from '../../core/entry-wizard-store';

describe('EntryStepInfo', () => {
  let fixture: ComponentFixture<EntryStepInfo>;
  let store: EntryWizardStore;
  let el: HTMLElement;

  beforeEach(async () => {
    localStorage.removeItem('gc.entry-wizard.draft.v1');
    await TestBed.configureTestingModule({ imports: [EntryStepInfo] }).compileComponents();
    store = TestBed.inject(EntryWizardStore);
    store.reset();
    fixture = TestBed.createComponent(EntryStepInfo);
    el = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should warn when the chosen date falls in a locked period', async () => {
    const date = el.querySelector<HTMLInputElement>('#date-comptable')!;
    date.value = '2026-08-15';
    date.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(el.textContent).toContain('Période verrouillée');
    expect(store.periodLocked()).toBe(true);
  });

  it('should not warn for an open period', async () => {
    const date = el.querySelector<HTMLInputElement>('#date-comptable')!;
    date.value = '2026-09-15';
    date.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(el.textContent).not.toContain('Période verrouillée');
  });
});
