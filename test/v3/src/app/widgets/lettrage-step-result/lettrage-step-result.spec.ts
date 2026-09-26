import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LettrageStepResult } from './lettrage-step-result';
import { LettrageStore } from '../../core/lettrage-store';

describe('LettrageStepResult', () => {
  let fixture: ComponentFixture<LettrageStepResult>;
  let store: LettrageStore;
  let el: HTMLElement;

  const text = () => (el.textContent ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ');
  const button = (label: string) =>
    Array.from(el.querySelectorAll<HTMLButtonElement>('button')).find((b) => b.textContent?.trim() === label);

  async function letter(tiersId: string, ids: string[], partial = false) {
    store.selectTiers(tiersId);
    store.goToLines();
    ids.forEach((id) => store.toggleLine(id));
    store.requestLettrage();
    if (partial) store.confirmPartial();
    fixture = TestBed.createComponent(LettrageStepResult);
    el = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [LettrageStepResult] }).compileComponents();
    store = TestBed.inject(LettrageStore);
  });

  it('should create', async () => {
    await letter('411002', ['lp-f1', 'lp-f2', 'lp-p1']);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should show a total lettrage with its code and amounts', async () => {
    await letter('411002', ['lp-f1', 'lp-f2', 'lp-p1']);
    const t = text();
    expect(t).toContain('Lettrage effectué avec succès');
    expect(t).toContain('Code de lettrage A');
    expect(t).toContain('Montant lettré 250 000 FCFA');
    expect(t).toContain('Total');
  });

  it('should show a partial lettrage with what remains', async () => {
    await letter('411002', ['lp-f1', 'lp-f2', 'lp-p2'], true);
    const t = text();
    expect(t).toContain('Lettrage partiel effectué');
    expect(t).toContain('50 000 FCFA restent non lettrés');
    expect(t).toContain('Partiel');
  });

  it('should tell a customer\'s remaining balance in plain words', async () => {
    await letter('411002', ['lp-f1', 'lp-f2', 'lp-p1']);
    expect(text()).toContain('Reste dû par ce client 170 000 FCFA');
  });

  it('should word the position differently for a supplier', async () => {
    await letter('401170', ['bw-f1', 'bw-p1']);
    expect(text()).toContain('Reste à payer à ce fournisseur 340 000 FCFA');
  });

  it('should show an overpayment as such', async () => {
    await letter('411001', ['lk-f1', 'lk-p1'], true);
    expect(text()).toContain('Trop-perçu à affecter ou rembourser 30 000 FCFA');
  });

  it('should ask for a dedicated confirmation before cancelling, and allow keeping the lettrage', async () => {
    await letter('411002', ['lp-f1', 'lp-f2', 'lp-p1']);
    button('Annuler ce lettrage')?.click();
    fixture.detectChanges();
    expect(text()).toContain('Annuler le lettrage A ?');
    expect(store.result()!.annule).toBe(false);

    button('Garder le lettrage')?.click();
    fixture.detectChanges();
    expect(text()).not.toContain('Annuler le lettrage A ?');
    expect(store.result()!.annule).toBe(false);
  });

  it('should cancel the lettrage once confirmed, and say it was recorded', async () => {
    await letter('411002', ['lp-f1', 'lp-f2', 'lp-p1']);
    button('Annuler ce lettrage')?.click();
    fixture.detectChanges();
    button('Annuler le lettrage')?.click();
    fixture.detectChanges();

    expect(store.result()!.annule).toBe(true);
    expect(text()).toContain('Lettrage A annulé');
    expect(text()).toContain('historique des modifications');
    expect(button('Annuler ce lettrage')).toBeUndefined();
  });

  it('should emit the right event for each action', async () => {
    await letter('411002', ['lp-f1', 'lp-f2', 'lp-p1']);
    let another = false;
    let change = false;
    let home = false;
    fixture.componentInstance.another.subscribe(() => (another = true));
    fixture.componentInstance.changeTiers.subscribe(() => (change = true));
    fixture.componentInstance.goDashboard.subscribe(() => (home = true));
    button('Lettrer un autre règlement')?.click();
    button('Changer de tiers')?.click();
    button('Retour au tableau de bord')?.click();
    expect(another).toBe(true);
    expect(change).toBe(true);
    expect(home).toBe(true);
  });
});
