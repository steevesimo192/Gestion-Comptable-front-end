import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WizardStepDevises } from './wizard-step-devises';
import { DossierWizardStore } from '../../core/dossier-wizard-store';

describe('WizardStepDevises', () => {
  let fixture: ComponentFixture<WizardStepDevises>;
  let store: DossierWizardStore;
  let el: HTMLElement;

  beforeEach(async () => {
    localStorage.removeItem('gc.dossier-wizard.draft.v1');
    await TestBed.configureTestingModule({ imports: [WizardStepDevises] }).compileComponents();
    store = TestBed.inject(DossierWizardStore);
    store.reset();
    fixture = TestBed.createComponent(WizardStepDevises);
    el = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should hide the currency picker until the toggle is on', async () => {
    expect(el.querySelector('select')).toBeNull();
    el.querySelector<HTMLButtonElement>('button[role="switch"]')?.click();
    await fixture.whenStable();
    expect(el.querySelector('select')).not.toBeNull();
  });

  it('should add and remove a secondary currency', async () => {
    store.form.controls.devises.controls.multiActif.setValue(true);
    await fixture.whenStable();
    store.addSecondaryCurrency('EUR');
    await fixture.whenStable();
    expect(el.textContent).toContain('Euro');
    store.removeSecondaryCurrency(0);
    await fixture.whenStable();
    expect(store.form.controls.devises.controls.secondaires.value.length).toBe(0);
  });
});
