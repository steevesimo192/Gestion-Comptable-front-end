import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WizardStepInfo } from './wizard-step-info';
import { DossierWizardStore } from '../../core/dossier-wizard-store';

describe('WizardStepInfo', () => {
  let fixture: ComponentFixture<WizardStepInfo>;
  let store: DossierWizardStore;
  let el: HTMLElement;

  beforeEach(async () => {
    localStorage.removeItem('gc.dossier-wizard.draft.v1');
    await TestBed.configureTestingModule({ imports: [WizardStepInfo] }).compileComponents();
    store = TestBed.inject(DossierWizardStore);
    store.reset();
    fixture = TestBed.createComponent(WizardStepInfo);
    el = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should open the company list and select a company', async () => {
    el.querySelector<HTMLButtonElement>('#entreprise')?.click();
    await fixture.whenStable();
    const option = Array.from(el.querySelectorAll<HTMLLIElement>('li[role="option"]')).find((li) =>
      li.textContent?.includes('Sotrap Logistique SA'),
    );
    option?.click();
    await fixture.whenStable();
    expect(store.form.controls.informations.controls.entrepriseId.value).toBe('sotrap');
    expect(el.textContent).toContain('Sotrap Logistique SA');
  });

  it('should uppercase the dossier code as it is typed', () => {
    const input = el.querySelector<HTMLInputElement>('#code')!;
    input.value = 'kam-2027';
    input.dispatchEvent(new Event('input'));
    expect(store.form.controls.informations.controls.code.value).toBe('KAM-2027');
  });

  it('should flag a code that is already taken', async () => {
    const input = el.querySelector<HTMLInputElement>('#code')!;
    input.value = 'KAM-2026';
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('blur'));
    await fixture.whenStable();
    expect(el.textContent).toContain('déjà utilisé');
  });
});
