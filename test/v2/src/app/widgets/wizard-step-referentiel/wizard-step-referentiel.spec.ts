import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WizardStepReferentiel } from './wizard-step-referentiel';
import { DossierWizardStore } from '../../core/dossier-wizard-store';

describe('WizardStepReferentiel', () => {
  let fixture: ComponentFixture<WizardStepReferentiel>;
  let store: DossierWizardStore;
  let el: HTMLElement;

  beforeEach(async () => {
    localStorage.removeItem('gc.dossier-wizard.draft.v1');
    await TestBed.configureTestingModule({ imports: [WizardStepReferentiel] }).compileComponents();
    store = TestBed.inject(DossierWizardStore);
    store.reset();
    fixture = TestBed.createComponent(WizardStepReferentiel);
    el = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should warn that the framework is structural', () => {
    expect(el.textContent).toContain('difficile à changer');
  });

  it('should select a framework when its card is clicked', () => {
    const card = Array.from(el.querySelectorAll<HTMLButtonElement>('button[role="radio"]')).find((b) =>
      b.textContent?.includes('IFRS'),
    );
    card?.click();
    expect(store.form.controls.referentiel.controls.referentielId.value).toBe('ifrs');
  });
});
