import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LettrageStepConfirm } from './lettrage-step-confirm';
import { LettrageStore } from '../../core/lettrage-store';

describe('LettrageStepConfirm', () => {
  let fixture: ComponentFixture<LettrageStepConfirm>;
  let el: HTMLElement;

  const text = () => (el.textContent ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ');
  const button = (label: string) =>
    Array.from(el.querySelectorAll<HTMLButtonElement>('button')).find((b) => b.textContent?.trim() === label);

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [LettrageStepConfirm] }).compileComponents();
    const store = TestBed.inject(LettrageStore);
    store.selectTiers('411002');
    store.goToLines();
    ['lp-f1', 'lp-f2', 'lp-p2'].forEach((id) => store.toggleLine(id));
    store.requestLettrage();
    fixture = TestBed.createComponent(LettrageStepConfirm);
    el = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should warn that part of the amount will stay unlettered', () => {
    expect(text()).toContain('Confirmation : lettrage partiel');
    expect(text()).toContain('50 000 FCFA restent non lettrés');
  });

  it('should recap the tiers, the selected lines and the amounts', () => {
    const t = text();
    expect(t).toContain('Client Supermarché Le Bon Prix (411002)');
    expect(t).toContain('Factures sélectionnées (2)');
    expect(t).toContain('F-2026-0142, F-2026-0158');
    expect(t).toContain('Paiements sélectionnés (1)');
    expect(t).toContain('RG-0091');
    expect(t).toContain('Montant lettré 200 000 FCFA');
    expect(t).toContain('reste dû sur les factures');
  });

  it('should emit when the user confirms or cancels', () => {
    let confirmed = false;
    let cancelled = false;
    fixture.componentInstance.confirmed.subscribe(() => (confirmed = true));
    fixture.componentInstance.cancelled.subscribe(() => (cancelled = true));
    button('Confirmer le lettrage partiel')?.click();
    button('Annuler')?.click();
    expect(confirmed).toBe(true);
    expect(cancelled).toBe(true);
  });
});
