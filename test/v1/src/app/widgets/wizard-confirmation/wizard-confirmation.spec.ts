import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WizardConfirmation } from './wizard-confirmation';
import { DossierWizardStore } from '../../core/dossier-wizard-store';

describe('WizardConfirmation', () => {
  let fixture: ComponentFixture<WizardConfirmation>;
  let store: DossierWizardStore;
  let el: HTMLElement;

  beforeEach(async () => {
    localStorage.removeItem('gc.dossier-wizard.draft.v1');
    await TestBed.configureTestingModule({ imports: [WizardConfirmation] }).compileComponents();
    store = TestBed.inject(DossierWizardStore);
    store.reset();
    store.form.patchValue({
      informations: { entrepriseId: 'kamga', code: 'KAM-2027', libelle: 'Kamga — Comptabilité 2027' },
      referentiel: { referentielId: 'syscohada-revise', deviseFonctionnelleId: 'XAF', fuseauHoraire: 'Africa/Douala' },
      exercice: { debut: '2027-01-01', fin: '2027-12-31', moisDebut: '01' },
    });
    fixture = TestBed.createComponent(WizardConfirmation);
    el = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should show the summary of the created dossier', () => {
    const text = el.textContent ?? '';
    expect(text).toContain('Kamga Distribution SARL');
    expect(text).toContain('KAM-2027');
    expect(text).toContain('SYSCOHADA révisé');
    expect(text).toContain('2027 ouvert');
  });

  it('should emit when the action buttons are clicked', () => {
    let access = false;
    let another = false;
    fixture.componentInstance.accessDossier.subscribe(() => (access = true));
    fixture.componentInstance.createAnother.subscribe(() => (another = true));
    const buttons = Array.from(el.querySelectorAll<HTMLButtonElement>('button'));
    buttons.find((b) => b.textContent?.includes('Accéder au dossier'))?.click();
    buttons.find((b) => b.textContent?.includes('Créer un autre dossier'))?.click();
    expect(access).toBe(true);
    expect(another).toBe(true);
  });
});
