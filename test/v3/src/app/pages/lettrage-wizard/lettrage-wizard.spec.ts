import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LettrageWizard } from './lettrage-wizard';
import { LettrageStore } from '../../core/lettrage-store';

describe('LettrageWizard', () => {
  let fixture: ComponentFixture<LettrageWizard>;
  let store: LettrageStore;
  let el: HTMLElement;

  const text = () => (el.textContent ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ');
  const button = (label: string) =>
    Array.from(el.querySelectorAll<HTMLButtonElement>('button')).find((b) => b.textContent?.trim() === label);
  const click = (label: string) => {
    button(label)?.click();
    fixture.detectChanges();
  };
  const tick = (...ids: string[]) => {
    ids.forEach((id) => store.toggleLine(id));
    fixture.detectChanges();
  };
  const goToLines = (tiersId: string) => {
    store.selectTiers(tiersId);
    fixture.detectChanges();
    click('Suivant');
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [LettrageWizard], providers: [provideRouter([])] }).compileComponents();
    store = TestBed.inject(LettrageStore);
    fixture = TestBed.createComponent(LettrageWizard);
    el = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should start on the tiers step and say where the user is', () => {
    expect(store.currentStep()).toBe(1);
    expect(text()).toContain('Étape 1 sur 4 : Choix du tiers');
    expect(el.querySelector('ol')?.getAttribute('aria-label')).toBe('Étapes du lettrage');
  });

  it('should block « Suivant » until a tiers is chosen, and explain why', () => {
    click('Suivant');
    expect(store.currentStep()).toBe(1);
    expect(text()).toContain('Choisissez le tiers');
  });

  it('should keep « Lettrer » disabled until both sides are ticked', () => {
    goToLines('411002');
    expect(store.currentStep()).toBe(2);
    expect(button('Lettrer')?.disabled).toBe(true);

    tick('lp-f1');
    expect(button('Lettrer')?.disabled).toBe(true);
  });

  it('should letter an exact match in one click, without confirmation', () => {
    goToLines('411002');
    tick('lp-f1', 'lp-f2', 'lp-p1');
    expect(button('Lettrer')?.disabled).toBe(false);

    click('Lettrer');
    expect(store.currentStep()).toBe(4);
    expect(text()).toContain('Lettrage effectué avec succès');
    expect(text()).toContain('Opération terminée');
  });

  it('should go through a confirmation for a partial lettrage', () => {
    goToLines('411002');
    tick('lp-f1', 'lp-f2', 'lp-p2');
    expect(button('Lettrer')).toBeUndefined();

    click('Lettrer partiellement');
    expect(store.currentStep()).toBe(3);
    expect(text()).toContain('Confirmation : lettrage partiel');
    expect(store.records().length).toBe(0);

    click('Confirmer le lettrage partiel');
    expect(store.currentStep()).toBe(4);
    expect(text()).toContain('Lettrage partiel effectué');
  });

  it('should come back to the selection when the confirmation is cancelled', () => {
    goToLines('411002');
    tick('lp-f1', 'lp-f2', 'lp-p2');
    click('Lettrer partiellement');
    click('Annuler');
    expect(store.currentStep()).toBe(2);
    expect(store.selectedIds().length).toBe(3);
  });

  it('should go back to the tiers step with « Précédent »', () => {
    goToLines('411002');
    click('Précédent');
    expect(store.currentStep()).toBe(1);
  });

  it('should offer to letter another payment of the same tiers, then another tiers', () => {
    goToLines('411002');
    tick('lp-f1', 'lp-f2', 'lp-p1');
    click('Lettrer');

    click('Lettrer un autre règlement');
    expect(store.currentStep()).toBe(2);
    expect(store.tiersId()).toBe('411002');
    expect(store.selectedIds().length).toBe(0);

    click('Précédent');
    goToLines('401170');
    tick('bw-f1', 'bw-p1');
    click('Lettrer');
    click('Changer de tiers');
    expect(store.currentStep()).toBe(1);
    expect(store.tiersId()).toBe('');
  });

  it('should not show the result of a previous lettrage when the page is opened again', async () => {
    goToLines('411002');
    tick('lp-f1', 'lp-f2', 'lp-p1');
    click('Lettrer');
    expect(store.currentStep()).toBe(4);

    fixture = TestBed.createComponent(LettrageWizard);
    el = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
    expect(store.currentStep()).toBe(1);
    expect(text()).not.toContain('Lettrage effectué avec succès');
  });
});
