import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WizardProgress } from './wizard-progress';
import { WizardStepMeta } from '../../core/dossier-wizard-store';

const STEPS: WizardStepMeta[] = [
  { index: 1, label: 'Informations du dossier' },
  { index: 2, label: 'Référentiel & devises' },
  { index: 3, label: 'Multi-devises', optional: true },
  { index: 4, label: 'Exercice comptable' },
];

describe('WizardProgress', () => {
  let fixture: ComponentFixture<WizardProgress>;
  let el: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [WizardProgress] }).compileComponents();
    fixture = TestBed.createComponent(WizardProgress);
    fixture.componentRef.setInput('steps', STEPS);
    fixture.componentRef.setInput('current', 2);
    fixture.componentRef.setInput('furthest', 2);
    el = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should list the four steps', () => {
    expect(el.querySelectorAll('button').length).toBe(4);
    expect(el.textContent).toContain('Multi-devises');
  });

  it('should disable steps not yet reached', () => {
    const buttons = Array.from(el.querySelectorAll<HTMLButtonElement>('button'));
    expect(buttons[3].disabled).toBe(true);
    expect(buttons[0].disabled).toBe(false);
  });

  it('should emit the step index when a reachable step is clicked', () => {
    let emitted: number | undefined;
    fixture.componentInstance.stepClick.subscribe((i) => (emitted = i));
    el.querySelectorAll<HTMLButtonElement>('button')[0].click();
    expect(emitted).toBe(1);
  });

  it('should keep the original accessible label unless another one is given', async () => {
    expect(el.querySelector('ol')?.getAttribute('aria-label')).toBe('Étapes de création du dossier');
    fixture.componentRef.setInput('listLabel', 'Étapes du lettrage');
    await fixture.whenStable();
    expect(el.querySelector('ol')?.getAttribute('aria-label')).toBe('Étapes du lettrage');
  });

  it('should show every step as done and none as clickable once the flow is over', async () => {
    fixture.componentRef.setInput('current', 5);
    fixture.componentRef.setInput('furthest', 0);
    await fixture.whenStable();
    const buttons = Array.from(el.querySelectorAll<HTMLButtonElement>('button'));
    expect(buttons.every((b) => b.disabled)).toBe(true);
    expect(el.querySelectorAll('app-icon').length).toBe(4);
  });
});
