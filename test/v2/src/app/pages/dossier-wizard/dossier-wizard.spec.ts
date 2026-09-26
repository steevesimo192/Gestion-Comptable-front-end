import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { DossierWizard } from './dossier-wizard';
import { DossierWizardStore } from '../../core/dossier-wizard-store';

function fillStep1(store: DossierWizardStore) {
  store.form.patchValue({ informations: { entrepriseId: 'kamga', code: 'KAM-2027', libelle: 'Kamga 2027' } });
}
function fillStep2(store: DossierWizardStore) {
  store.form.patchValue({
    referentiel: { referentielId: 'syscohada-revise', deviseFonctionnelleId: 'XAF', fuseauHoraire: 'Africa/Douala' },
  });
}
function fillStep4(store: DossierWizardStore) {
  store.form.patchValue({ exercice: { debut: '2027-01-01', fin: '2027-12-31', moisDebut: '01' } });
}

describe('DossierWizard', () => {
  let fixture: ComponentFixture<DossierWizard>;
  let store: DossierWizardStore;
  let el: HTMLElement;

  const nextButton = () => Array.from(el.querySelectorAll<HTMLButtonElement>('button')).find((b) => b.textContent?.trim().startsWith('Suivant') || b.textContent?.includes('Créer le dossier'));

  beforeEach(async () => {
    localStorage.removeItem('gc.dossier-wizard.draft.v1');
    await TestBed.configureTestingModule({ imports: [DossierWizard], providers: [provideRouter([])] }).compileComponents();
    store = TestBed.inject(DossierWizardStore);
    store.reset();
    fixture = TestBed.createComponent(DossierWizard);
    el = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should start on step 1 and block advancing while it is invalid', async () => {
    expect(el.textContent).toContain('Étape 1 sur 4');
    nextButton()?.click();
    await fixture.whenStable();
    expect(store.currentStep()).toBe(1);
  });

  it('should advance once the current step is valid, and allow skipping step 3', async () => {
    fillStep1(store);
    fixture.detectChanges();
    nextButton()?.click();
    await fixture.whenStable();
    expect(store.currentStep()).toBe(2);

    fillStep2(store);
    fixture.detectChanges();
    nextButton()?.click();
    await fixture.whenStable();
    expect(store.currentStep()).toBe(3);

    const skip = Array.from(el.querySelectorAll<HTMLButtonElement>('button')).find((b) => b.textContent?.includes('Passer cette étape'));
    skip?.click();
    await fixture.whenStable();
    expect(store.currentStep()).toBe(4);
  });

  it('should show the confirmation screen once the whole wizard is completed', async () => {
    fillStep1(store);
    store.goNext();
    fillStep2(store);
    store.goNext();
    store.skipStep();
    fillStep4(store);
    store.goNext();
    await fixture.whenStable();
    expect(store.submitted()).toBe(true);
    expect(el.textContent).toContain('Dossier créé');
  });
});
