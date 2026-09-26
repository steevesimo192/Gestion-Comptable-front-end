import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LettrageStepTiers } from './lettrage-step-tiers';
import { LettrageStore } from '../../core/lettrage-store';

describe('LettrageStepTiers', () => {
  let fixture: ComponentFixture<LettrageStepTiers>;
  let store: LettrageStore;
  let el: HTMLElement;

  const text = () => (el.textContent ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ');
  const trigger = () => el.querySelector<HTMLButtonElement>('#tiers-lettrage')!;
  const options = () => Array.from(el.querySelectorAll<HTMLLIElement>('li[role="option"]'));
  const openMenu = () => {
    trigger().click();
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [LettrageStepTiers] }).compileComponents();
    store = TestBed.inject(LettrageStore);
    fixture = TestBed.createComponent(LettrageStepTiers);
    el = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should start with the list closed and a prompt to pick a tiers', () => {
    expect(options().length).toBe(0);
    expect(trigger().textContent).toContain('Sélectionner un tiers');
  });

  it('should list every tiers with the number of lines waiting to be lettered', () => {
    openMenu();
    expect(options().length).toBe(4);
    expect(text()).toContain('7 lignes en attente');
    expect(text()).toContain('Rien en attente');
  });

  it('should search by name or by account number', () => {
    openMenu();
    const input = el.querySelector<HTMLInputElement>('input[type="text"]')!;

    input.value = 'bon prix';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(options().length).toBe(1);
    expect(options()[0].textContent).toContain('Le Bon Prix');

    input.value = '411001';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(options().length).toBe(1);
    expect(options()[0].textContent).toContain('411001');
  });

  it('should say so when no tiers matches the search', () => {
    openMenu();
    const input = el.querySelector<HTMLInputElement>('input[type="text"]')!;
    input.value = 'zzz';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(text()).toContain('Aucun tiers ne correspond');
  });

  it('should select a tiers, close the list and summarize what is waiting', () => {
    openMenu();
    options().find((o) => o.textContent?.includes('Le Bon Prix'))?.click();
    fixture.detectChanges();

    expect(store.tiersId()).toBe('411002');
    expect(options().length).toBe(0);
    expect(trigger().textContent).toContain('Le Bon Prix');
    expect(text()).toContain('7 lignes en attente de lettrage');
  });

  it('should tell the user when the chosen tiers has nothing to letter', () => {
    store.selectTiers('401169');
    fixture.detectChanges();
    expect(text()).toContain('aucune ligne en attente de lettrage');
  });

  it('should only show the error once the user tried to go on without choosing', () => {
    expect(text()).not.toContain('Choisissez le tiers');
    store.goToLines();
    fixture.detectChanges();
    expect(text()).toContain('Choisissez le tiers');
  });

  it('should close the list with the Escape key', () => {
    openMenu();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    expect(options().length).toBe(0);
  });
});
