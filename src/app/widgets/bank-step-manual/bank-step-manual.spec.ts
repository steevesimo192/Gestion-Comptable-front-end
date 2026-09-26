import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BankStepManual } from './bank-step-manual';
import { BankReconciliationStore } from '../../core/bank-store';

const KEY = 'gc.bank-reconciliation.v1';

describe('BankStepManual', () => {
  let fixture: ComponentFixture<BankStepManual>;
  let store: BankReconciliationStore;
  let el: HTMLElement;

  const text = () => (el.textContent ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ');
  const button = (label: string, root: ParentNode = el) =>
    Array.from(root.querySelectorAll<HTMLButtonElement>('button')).find((b) => b.textContent?.trim() === label);
  const opButton = (label: string) =>
    Array.from(el.querySelectorAll<HTMLButtonElement>('button')).find((b) => b.textContent?.includes(label));
  const entryCheckbox = (ref: string) =>
    Array.from(el.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')).find((c) =>
      c.closest('label')?.textContent?.includes(ref),
    )!;
  const check = (ref: string) => {
    entryCheckbox(ref).click();
    fixture.detectChanges();
  };

  beforeEach(async () => {
    localStorage.removeItem(KEY);
    await TestBed.configureTestingModule({ imports: [BankStepManual] }).compileComponents();
    store = TestBed.inject(BankReconciliationStore);
    store.loadSample();
    store.submitImport();
    fixture = TestBed.createComponent(BankStepManual);
    el = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  });

  afterEach(() => localStorage.removeItem(KEY));

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should list every open operation and every unmatched entry', () => {
    expect(text()).toContain('Opérations du relevé (15)');
    expect(text()).toContain('Écritures non rapprochées (13)');
    expect(text()).toContain('Sélectionnez d\'abord une opération');
  });

  it('should select an operation and show the association panel', () => {
    opButton('FRAIS TENUE DE COMPTE')?.click();
    fixture.detectChanges();
    expect(text()).toContain('Décaissement');
    expect(text()).toContain('Cochez la ou les écritures qui correspondent');
  });

  it('should mark same-amount entries and block until the totals match exactly', () => {
    opButton('VIR FOURNISSEUR Y')?.click();
    fixture.detectChanges();
    expect(text()).toContain('Même montant');

    check('CA-0104');
    expect(text()).toContain('dépassent l’opération');
    expect(button('Associer la sélection')?.disabled).toBe(true);

    check('CA-0104');
    check('BQ-0925');
    expect(text()).toContain('manque');
    expect(button('Associer la sélection')?.disabled).toBe(true);
  });

  it('should associate a matching selection and clear it from both lists', () => {
    opButton('VIR KAMGA DISTRIBUTION')?.click();
    fixture.detectChanges();
    check('RG-0079');
    expect(text()).toContain('Les montants correspondent');
    button('Associer la sélection')?.click();
    fixture.detectChanges();

    expect(store.progress().matched).toBe(1);
    expect(text()).not.toContain('VIR KAMGA DISTRIBUTION');
    expect(text()).not.toContain('RG-0079');
  });


  it('should create the missing entry with a suggested counterpart for a fee', () => {
    opButton('FRAIS TENUE DE COMPTE')?.click();
    fixture.detectChanges();
    button('Créer l\'écriture manquante')?.click();
    fixture.detectChanges();

    expect(el.querySelector<HTMLSelectElement>('#man-create-compte')?.value).toBe('627000');
    expect(el.querySelector<HTMLInputElement>('#man-create-date')?.value).toBe('2026-09-15');

    button('Créer et rapprocher')?.click();
    fixture.detectChanges();

    expect(store.entries().some((e) => e.libelle === 'FRAIS TENUE DE COMPTE' && e.contrepartie === '627000')).toBe(true);
    expect(store.progress().matched).toBe(1);
    expect(text()).not.toContain('Créer l\'écriture manquante');
  });

  it('should refuse to create an entry without a counterpart account', () => {
    opButton('VIR RECU REF 998')?.click();
    fixture.detectChanges();
    button('Créer l\'écriture manquante')?.click();
    fixture.detectChanges();
    button('Créer et rapprocher')?.click();
    fixture.detectChanges();
    expect(text()).toContain('Choisissez le compte de contrepartie.');
    expect(store.progress().matched).toBe(0);
  });

  it('should keep an operation open with a note when marked to investigate', () => {
    opButton('VIR RECU REF 998')?.click();
    fixture.detectChanges();
    button('Marquer à investiguer')?.click();
    fixture.detectChanges();

    button('Marquer à investiguer')?.click();
    fixture.detectChanges();
    expect(text()).toContain('Écrivez une courte note');

    const textarea = el.querySelector<HTMLTextAreaElement>('#man-note')!;
    textarea.value = 'Donneur inconnu';
    textarea.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    button('Marquer à investiguer')?.click();
    fixture.detectChanges();

    expect(store.progress().investigate).toBe(1);
    expect(text()).toContain('Opérations déjà traitées (1)');
    expect(text()).toContain('À investiguer : Donneur inconnu');
  });

  it('should undo a match and put the operation back to open', () => {
    store.validateAllSafe();
    fixture.detectChanges();
    button('Opérations déjà traitées (9)')?.click();
    fixture.detectChanges();
    button('Annuler le rapprochement')?.click();
    fixture.detectChanges();

    expect(store.progress().matched).toBe(8);
    expect(store.progress().remaining).toBe(7);
  });

  it('should filter both lists as the user searches', () => {
    const opSearch = el.querySelector<HTMLInputElement>('#man-ops-search')!;
    opSearch.value = 'frais';
    opSearch.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(text()).toContain('FRAIS TENUE DE COMPTE');
    expect(text()).not.toContain('VIR SALAIRES');

    const entrySearch = el.querySelector<HTMLInputElement>('#man-entries-search')!;
    entrySearch.value = 'RG-0079';
    entrySearch.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(text()).toContain('RG-0079');
    expect(text()).not.toContain('BQ-0921');
  });
});
