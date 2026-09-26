import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EntryStepResult } from './entry-step-result';
import { EntryWizardStore } from '../../core/entry-wizard-store';

describe('EntryStepResult', () => {
  let fixture: ComponentFixture<EntryStepResult>;
  let store: EntryWizardStore;
  let el: HTMLElement;

  beforeEach(async () => {
    localStorage.removeItem('gc.entry-wizard.draft.v1');
    await TestBed.configureTestingModule({ imports: [EntryStepResult] }).compileComponents();
    store = TestBed.inject(EntryWizardStore);
    store.reset();
    store.informations.patchValue({ journalId: 'achats', date: '2026-09-21', libelle: 'Facture fournisseur' });
    store.lignes.at(0).patchValue({ compte: '601000', debit: 150000 });
    store.lignes.at(1).patchValue({ compte: '401169', credit: 150000 });
  });

  function create() {
    fixture = TestBed.createComponent(EntryStepResult);
    el = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
  }

  it('should show the posted recap with the supplier as tiers', () => {
    store.submitted.set('comptabilisee');
    create();
    expect(el.textContent).toContain('comptabilisée avec succès');
    expect(el.textContent).toContain('Fournisseur X');
    expect(el.textContent).toContain('Comptabilisée');
  });

  it('should show the lighter draft-saved message when saved as a draft', () => {
    store.submitted.set('brouillon');
    create();
    expect(el.textContent).toContain('brouillon');
    expect(el.textContent).not.toContain('comptabilisée avec succès');
  });

  it('should emit the right event for each action', () => {
    store.submitted.set('comptabilisee');
    create();
    let viewed = false;
    let created = false;
    let home = false;
    fixture.componentInstance.viewEntry.subscribe(() => (viewed = true));
    fixture.componentInstance.newEntry.subscribe(() => (created = true));
    fixture.componentInstance.goDashboard.subscribe(() => (home = true));
    const buttons = Array.from(el.querySelectorAll<HTMLButtonElement>('button'));
    buttons.find((b) => b.textContent?.includes("Voir l'écriture"))?.click();
    buttons.find((b) => b.textContent?.includes('Saisir une nouvelle'))?.click();
    buttons.find((b) => b.textContent?.includes('Retour au tableau de bord'))?.click();
    expect(viewed).toBe(true);
    expect(created).toBe(true);
    expect(home).toBe(true);
  });
});
