import { TestBed } from '@angular/core/testing';
import { DossierWizardStore } from './dossier-wizard-store';

describe('DossierWizardStore', () => {
  let store: DossierWizardStore;

  beforeEach(() => {
    localStorage.removeItem('gc.dossier-wizard.draft.v1');
    TestBed.configureTestingModule({});
    store = TestBed.inject(DossierWizardStore);
    store.reset();
  });

  it('should be created', () => {
    expect(store).toBeTruthy();
  });

  // Régression : ces signaux doivent réagir aux changements du formulaire,
  // pas seulement retourner leur toute première valeur calculée.
  it('should update selectedCompany as soon as an entreprise is chosen', () => {
    expect(store.selectedCompany()).toBeNull();
    store.form.controls.informations.controls.entrepriseId.setValue('sotrap');
    expect(store.selectedCompany()?.name).toBe('Sotrap Logistique SA');
    store.form.controls.informations.controls.entrepriseId.setValue('ndongo');
    expect(store.selectedCompany()?.name).toBe('Boulangerie Ndongo SARL');
  });

  it('should update selectedReferentiel and selectedDeviseFonctionnelle live', () => {
    store.form.controls.referentiel.patchValue({ referentielId: 'ifrs', deviseFonctionnelleId: 'EUR' });
    expect(store.selectedReferentiel()?.label).toBe('IFRS');
    expect(store.selectedDeviseFonctionnelle()?.label).toContain('Euro');
  });

  it('should update the multi-currency toggle and the secondary currency list immediately', () => {
    expect(store.devisesValue().multiActif).toBe(false);
    store.form.controls.devises.controls.multiActif.setValue(true);
    expect(store.devisesValue().multiActif).toBe(true);

    store.addSecondaryCurrency('EUR');
    expect(store.secondaryCurrencies().map((c) => c.code)).toEqual(['EUR']);
    store.removeSecondaryCurrency(0);
    expect(store.secondaryCurrencies().length).toBe(0);
  });

  it('should reject a dossier code that is already taken', () => {
    const code = store.form.controls.informations.controls.code;
    code.setValue('KAM-2026');
    expect(code.errors?.['taken']).toBe(true);
    code.setValue('NEW-2027');
    expect(code.errors).toBeNull();
  });

  it('should walk through the four steps and submit', () => {
    store.form.patchValue({ informations: { entrepriseId: 'kamga', code: 'KAM-2027', libelle: 'Kamga 2027' } });
    store.goNext();
    expect(store.currentStep()).toBe(2);

    store.form.patchValue({
      referentiel: { referentielId: 'syscohada-revise', deviseFonctionnelleId: 'XAF', fuseauHoraire: 'Africa/Douala' },
    });
    store.goNext();
    expect(store.currentStep()).toBe(3);

    store.skipStep();
    expect(store.currentStep()).toBe(4);

    store.form.patchValue({ exercice: { debut: '2027-01-01', fin: '2027-12-31', moisDebut: '01' } });
    store.goNext();
    expect(store.submitted()).toBe(true);
  });
});
