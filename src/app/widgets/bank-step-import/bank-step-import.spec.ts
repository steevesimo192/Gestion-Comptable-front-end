import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BankStepImport } from './bank-step-import';
import { BankReconciliationStore } from '../../core/bank-store';

const KEY = 'gc.bank-reconciliation.v1';

describe('BankStepImport', () => {
  let fixture: ComponentFixture<BankStepImport>;
  let store: BankReconciliationStore;
  let el: HTMLElement;

  const text = () => (el.textContent ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ');
  const button = (label: string) =>
    Array.from(el.querySelectorAll<HTMLButtonElement>('button')).find((b) => b.textContent?.trim() === label);
  const type = (selector: string, value: string) => {
    const input = el.querySelector<HTMLInputElement>(selector)!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };

  beforeEach(async () => {
    localStorage.removeItem(KEY);
    await TestBed.configureTestingModule({ imports: [BankStepImport] }).compileComponents();
    store = TestBed.inject(BankReconciliationStore);
    fixture = TestBed.createComponent(BankStepImport);
    el = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  });

  afterEach(() => localStorage.removeItem(KEY));

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should offer the bank accounts of the chart of accounts', () => {
    const options = Array.from(el.querySelectorAll<HTMLOptionElement>('#bank-compte option'));
    expect(options.length).toBe(2);
    expect(options[0].textContent).toContain('512006');
    expect(options[0].selected).toBe(true);
  });

  it('should list the closed statement and remind of what is still open on the account', () => {
    expect(text()).toContain('Relevés clôturés');
    expect(text()).toContain('Relevé 08/2026');
    expect(button('Consulter')).toBeTruthy();
    expect(text()).toContain('1 opération à investiguer restent ouvertes');
    expect(text()).toContain('VIR M NGONO');
  });

  it('should load the sample statement, fill the fields and check the balances', () => {
    button('Charger un relevé d\'exemple')?.click();
    fixture.detectChanges();

    expect(text()).toContain('releve-septembre-2026.csv');
    expect(text()).toContain('15 opérations lues');
    expect(el.querySelector<HTMLInputElement>('#bank-solde-initial')?.value).toBe('11170000');
    expect(el.querySelector<HTMLInputElement>('#bank-debut')?.value).toBe('2026-09-01');
    expect(text()).toContain('Le solde final indiqué correspond aux opérations.');
    expect(text()).toContain('… et 10 autres opérations.');
  });

  it('should refuse a file with errors and say on which line', () => {
    store.loadCsv('mauvais.csv', 'Date;Libellé;Montant\nhier;X;100\n05/09/2026;;100');
    fixture.detectChanges();
    expect(text()).toContain('Fichier refusé');
    expect(text()).toContain('Ligne 2');
    expect(text()).toContain('Ligne 3');
    button('Retirer ce fichier')?.click();
    fixture.detectChanges();
    expect(text()).toContain('Glissez votre relevé ici');
  });

  it('should warn when the final balance does not match the operations', () => {
    button('Charger un relevé d\'exemple')?.click();
    type('#bank-solde-final', '9000000');
    expect(text()).toContain('Le solde calculé ne correspond pas au solde final indiqué.');
  });

  it('should only show field errors once an import was attempted', () => {
    expect(text()).not.toContain('Indiquez la date de début.');
    store.submitImport();
    fixture.detectChanges();
    expect(text()).toContain('Indiquez la date de début.');
    expect(text()).toContain('Indiquez le solde initial du relevé');
    expect(text()).toContain('Le relevé ne peut pas encore être importé');
    expect(text()).toContain('Ajoutez au moins une opération');
  });

  it('should let the user type operations by hand', () => {
    button('Saisie manuelle')?.click();
    fixture.detectChanges();
    expect(el.querySelectorAll('tbody tr').length).toBe(1);

    button('Ajouter une opération')?.click();
    fixture.detectChanges();
    expect(el.querySelectorAll('tbody tr').length).toBe(2);

    type('input[aria-label="Date de la ligne 1"]', '2026-09-05');
    type('input[aria-label="Libellé de la ligne 1"]', 'VIR CLIENT');
    type('input[aria-label="Entrée de la ligne 1"]', '250 000');
    expect(store.importOps()).toEqual([{ date: '2026-09-05', libelle: 'VIR CLIENT', montant: 250000 }]);

    el.querySelector<HTMLButtonElement>('button[aria-label="Retirer la ligne 2"]')?.click();
    fixture.detectChanges();
    expect(el.querySelectorAll('tbody tr').length).toBe(1);
  });

  it('should explain what is wrong with a half-filled manual row', () => {
    button('Saisie manuelle')?.click();
    fixture.detectChanges();
    type('input[aria-label="Libellé de la ligne 1"]', 'VIR CLIENT');
    store.submitImport();
    fixture.detectChanges();
    expect(text()).toContain('Ligne 1 : Indiquez une date valide.');
    expect(text()).toContain('1 ligne saisie à compléter ou à corriger.');
  });

  it('should warn about a probable duplicate before importing twice', () => {
    store.loadCsv('aout.csv', 'Date;Libellé;Montant\n05/08/2026;VIR SUPERMARCHE LE BON PRIX;500000\n12/08/2026;PRLV LOYER AOUT;-300000\n29/08/2026;VIR M NGONO;-30000');
    store.setField('soldeInitial', '11000000');
    store.setField('soldeFinal', '11170000');
    expect(store.submitImport()).toBe(false);
    fixture.detectChanges();

    expect(text()).toContain('Ce relevé semble déjà importé');
    expect(text()).toContain('du 01/08/2026 au 31/08/2026');
    expect(button('Consulter le relevé existant')).toBeTruthy();
    expect(store.statements().length).toBe(1);

    button('Ce n\'est pas un doublon : importer quand même')?.click();
    fixture.detectChanges();
    expect(store.statements().length).toBe(2);
    expect(store.currentStep()).toBe(2);
  });

  it('should list a statement in progress, and let the user resume or abandon it', () => {
    store.loadSample();
    store.submitImport();
    store.goBackTo(1);
    fixture.detectChanges();

    expect(text()).toContain('Rapprochements en cours');
    expect(text()).toContain('0 / 15 opérations traitées');

    button('Abandonner')?.click();
    fixture.detectChanges();
    expect(text()).toContain('Abandonner ce rapprochement ?');
    button('Garder')?.click();
    fixture.detectChanges();
    expect(store.statements().length).toBe(2);

    button('Abandonner')?.click();
    fixture.detectChanges();
    button('Abandonner')?.click();
    fixture.detectChanges();
    expect(store.statements().length).toBe(1);
    expect(text()).not.toContain('Rapprochements en cours');
  });

  it('should resume a statement in progress', () => {
    store.loadSample();
    store.submitImport();
    store.goBackTo(1);
    fixture.detectChanges();
    button('Reprendre')?.click();
    expect(store.currentStep()).toBe(2);
  });

  it('should open a closed statement in read-only mode', () => {
    button('Consulter')?.click();
    expect(store.currentStep()).toBe(6);
    expect(store.statementId()).toBe('rel-1');
  });

  it('should read a chosen file, including accents', async () => {
    const csv = 'Date;Libellé;Montant\n05/09/2026;VIR ÉLECTRICITÉ;-1500\n06/09/2026;VIR CLIENT;2500';
    const file = new File([csv], 'releve.csv', { type: 'text/csv' });
    const input = el.querySelector<HTMLInputElement>('input[type="file"]')!;
    Object.defineProperty(input, 'files', { value: [file], configurable: true });
    input.dispatchEvent(new Event('change'));

    for (let i = 0; i < 50 && store.fileName() === ''; i++) await new Promise((r) => setTimeout(r, 20));
    fixture.detectChanges();
    expect(store.fileName()).toBe('releve.csv');
    expect(store.fileErrors()).toEqual([]);
    expect(store.fileOps()[0].libelle).toBe('VIR ÉLECTRICITÉ');
    expect(store.form().debut).toBe('2026-09-01');
  });
});
