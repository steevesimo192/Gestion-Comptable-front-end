import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LettrageStepLignes } from './lettrage-step-lignes';
import { LettrageStore } from '../../core/lettrage-store';

describe('LettrageStepLignes', () => {
  let fixture: ComponentFixture<LettrageStepLignes>;
  let store: LettrageStore;
  let el: HTMLElement;

  const text = () => (el.textContent ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ');
  const checkboxes = () => Array.from(el.querySelectorAll<HTMLInputElement>('input[type="checkbox"]'));
  const button = (label: string) =>
    Array.from(el.querySelectorAll<HTMLButtonElement>('button')).find((b) => b.textContent?.trim() === label);

  async function open(tiersId: string) {
    store.selectTiers(tiersId);
    store.goToLines();
    fixture = TestBed.createComponent(LettrageStepLignes);
    el = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  }
  const tick = (...ids: string[]) => {
    ids.forEach((id) => store.toggleLine(id));
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [LettrageStepLignes] }).compileComponents();
    store = TestBed.inject(LettrageStore);
  });

  it('should create', async () => {
    await open('411002');
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should show invoices on the left and payments and credit notes on the right', async () => {
    await open('411002');
    expect(text()).toContain('Factures en attente (4)');
    expect(text()).toContain('Paiements disponibles (3)');
    expect(checkboxes().length).toBe(7);
    expect(text()).toContain('F-2026-0142');
    expect(text()).toContain('RG-0091');
    expect(text()).toContain('Avoir');
  });

  it('should tick a line when its checkbox is clicked', async () => {
    await open('411002');
    checkboxes()[0].click();
    fixture.detectChanges();
    expect(store.selectedIds().length).toBe(1);
  });

  it('should ask for both sides while nothing is ticked, then say what is missing', async () => {
    await open('411002');
    expect(text()).toContain('Cochez au moins une facture et un paiement');
    tick('lp-f1');
    expect(text()).toContain('Cochez aussi au moins un paiement');
    store.clearSelection('facture');
    tick('lp-p1');
    expect(text()).toContain('Cochez aussi au moins une facture');
  });

  it('should show an exact match before any click on « Lettrer »', async () => {
    await open('411002');
    tick('lp-f1', 'lp-f2', 'lp-p1');
    expect(text()).toContain('Correspondance exacte : 250 000 FCFA');
    expect(text()).toContain('Le lettrage sera total');
  });

  it('should show a partial match with the amount that will stay unlettered', async () => {
    await open('411002');
    tick('lp-f1', 'lp-f2', 'lp-p2');
    expect(text()).toContain('Lettrage partiel possible : 50 000 FCFA resteront non lettrés');
    expect(text()).toContain('Montant maximum lettrable : 200 000 FCFA');
    expect(text()).toContain('Le reste demeure dû sur les factures');
  });

  it('should explain an overpayment differently from a balance due', async () => {
    await open('411001');
    tick('lk-f1', 'lk-p1');
    expect(text()).toContain('30 000 FCFA resteront non lettrés');
    expect(text()).toContain('en attente d\'une facture');
  });

  it('should tick and untick a whole side with one button', async () => {
    await open('411002');
    button('Tout cocher')?.click();
    fixture.detectChanges();
    expect(store.selectedFactures().length).toBe(4);
    expect(store.selectedPaiements().length).toBe(0);
    expect(button('Tout décocher')).toBeTruthy();

    button('Tout décocher')?.click();
    fixture.detectChanges();
    expect(store.selectedIds().length).toBe(0);
  });

  it('should show the total of what is ticked on each side', async () => {
    await open('411002');
    tick('lp-f1', 'lp-f2');
    expect(text()).toContain('Total sélectionné (2) 250 000 FCFA');
  });

  it('should show an explicit empty state when the tiers has nothing to letter', async () => {
    await open('401169');
    expect(text()).toContain('Rien à lettrer pour ce tiers');
    expect(checkboxes().length).toBe(0);
  });

  it('should go back to the tiers list from the empty state', async () => {
    await open('401169');
    button('Choisir un autre tiers')?.click();
    fixture.detectChanges();
    expect(store.currentStep()).toBe(1);
  });

  it('should display a store error in an alert', async () => {
    await open('411002');
    store.error.set('Certaines lignes cochées ne sont plus disponibles.');
    fixture.detectChanges();
    expect(el.querySelector('[role="alert"]')?.textContent).toContain('ne sont plus disponibles');
  });
});
