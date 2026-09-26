import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WizardStepExercice } from './wizard-step-exercice';
import { DossierWizardStore } from '../../core/dossier-wizard-store';

describe('WizardStepExercice', () => {
  let fixture: ComponentFixture<WizardStepExercice>;
  let store: DossierWizardStore;
  let el: HTMLElement;

  beforeEach(async () => {
    localStorage.removeItem('gc.dossier-wizard.draft.v1');
    await TestBed.configureTestingModule({ imports: [WizardStepExercice] }).compileComponents();
    store = TestBed.inject(DossierWizardStore);
    store.reset();
    fixture = TestBed.createComponent(WizardStepExercice);
    el = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should suggest an end date one year after the start date', () => {
    const debut = el.querySelector<HTMLInputElement>('#debut')!;
    debut.value = '2026-01-01';
    debut.dispatchEvent(new Event('input'));
    debut.dispatchEvent(new Event('change'));
    expect(store.form.controls.exercice.controls.fin.value).toBe('2026-12-31');
    expect(store.form.controls.exercice.controls.moisDebut.value).toBe('01');
  });

  it('should not overwrite an end date the user already chose', () => {
    const fin = store.form.controls.exercice.controls.fin;
    fin.setValue('2026-06-30');
    fin.markAsDirty();
    const debut = el.querySelector<HTMLInputElement>('#debut')!;
    debut.value = '2026-01-01';
    debut.dispatchEvent(new Event('input'));
    debut.dispatchEvent(new Event('change'));
    expect(fin.value).toBe('2026-06-30');
  });
});
