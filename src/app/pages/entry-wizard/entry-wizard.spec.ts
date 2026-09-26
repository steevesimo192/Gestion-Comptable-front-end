import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { EntryWizard } from './entry-wizard';
import { EntryWizardStore } from '../../core/entry-wizard-store';

describe('EntryWizard', () => {
  let fixture: ComponentFixture<EntryWizard>;
  let store: EntryWizardStore;
  let el: HTMLElement;

  const clickByText = (text: string) =>
    Array.from(el.querySelectorAll<HTMLButtonElement>('button')).find((b) => b.textContent?.includes(text))?.click();

  function fillStep1() {
    store.informations.patchValue({ journalId: 'achats', date: '2026-09-21', libelle: 'Facture fournisseur X' });
  }
  function fillBalancedLines() {
    store.lignes.at(0).patchValue({ compte: '601000', debit: 150000 });
    store.lignes.at(1).patchValue({ compte: '401169', credit: 150000 });
  }

  beforeEach(async () => {
    localStorage.removeItem('gc.entry-wizard.draft.v1');
    await TestBed.configureTestingModule({ imports: [EntryWizard], providers: [provideRouter([])] }).compileComponents();
    store = TestBed.inject(EntryWizardStore);
    store.reset();
    fixture = TestBed.createComponent(EntryWizard);
    el = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should block advancing from step 1 while information is missing', () => {
    clickByText('Suivant');
    expect(store.currentStep()).toBe(1);
  });

  it('should block a locked period from advancing', async () => {
    store.informations.patchValue({ journalId: 'achats', date: '2026-08-10', libelle: 'Test' });
    fixture.detectChanges();
    clickByText('Suivant');
    expect(store.currentStep()).toBe(1);
  });

  it('should keep "Comptabiliser" disabled while the entry is unbalanced, and enable it once balanced', async () => {
    fillStep1();
    fixture.detectChanges();
    clickByText('Suivant');
    await fixture.whenStable();
    fixture.detectChanges();
    expect(store.currentStep()).toBe(2);

    store.lignes.at(0).patchValue({ compte: '601000', debit: 150000 });
    fixture.detectChanges();
    let postButton = Array.from(el.querySelectorAll<HTMLButtonElement>('button')).find((b) => b.textContent?.includes('Comptabiliser'));
    expect(postButton?.disabled).toBe(true);

    fillBalancedLines();
    fixture.detectChanges();
    postButton = Array.from(el.querySelectorAll<HTMLButtonElement>('button')).find((b) => b.textContent?.includes('Comptabiliser'));
    expect(postButton?.disabled).toBe(false);
  });

  it('should go through confirmation before posting, and show the success screen', async () => {
    fillStep1();
    store.goToStep1();
    fillBalancedLines();
    fixture.detectChanges();
    store.requestPost();
    fixture.detectChanges();
    expect(store.currentStep()).toBe(3);
    expect(el.textContent).toContain('irréversible');

    clickByText('Confirmer la comptabilisation');
    fixture.detectChanges();
    expect(store.submitted()).toBe('comptabilisee');
    expect(el.textContent).toContain('comptabilisée avec succès');
  });

  it('should allow saving an unbalanced entry as a draft', async () => {
    fillStep1();
    store.goToStep1();
    store.lignes.at(0).patchValue({ compte: '601000', debit: 150000 });
    fixture.detectChanges();
    clickByText('Enregistrer en brouillon');
    fixture.detectChanges();
    expect(store.submitted()).toBe('brouillon');
    expect(el.textContent).toContain('brouillon');
  });

  it('should offer to resume a draft that was just saved when starting another entry', () => {
    fillStep1();
    store.goToStep1();
    store.lignes.at(0).patchValue({ compte: '601000', debit: 150000 });
    fixture.detectChanges();
    clickByText('Enregistrer en brouillon');
    fixture.detectChanges();
    expect(store.submitted()).toBe('brouillon');

    clickByText('Saisir une nouvelle');
    fixture.detectChanges();
    expect(store.submitted()).toBeNull();
    expect(store.hasDraft()).toBe(true);
    expect(el.textContent).toContain('Reprendre le brouillon');
  });

  it('should not show the result of a previous entry when the page is opened again', async () => {
    fillStep1();
    store.goToStep1();
    fillBalanced();
    store.requestPost();
    store.confirmPost();
    expect(store.submitted()).toBe('comptabilisee');

    fixture = TestBed.createComponent(EntryWizard);
    el = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
    expect(store.submitted()).toBeNull();
    expect(store.currentStep()).toBe(1);
    expect(el.textContent).not.toContain('comptabilisée avec succès');
  });
});
