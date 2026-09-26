import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Sidebar } from './sidebar';

describe('Sidebar', () => {
  let component: Sidebar;
  let fixture: ComponentFixture<Sidebar>;
  let el: HTMLElement;

  const groupButton = (label: string) =>
    Array.from(el.querySelectorAll<HTMLButtonElement>('button[aria-expanded]')).find((b) =>
      b.textContent?.includes(label),
    );

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Sidebar] }).compileComponents();
    fixture = TestBed.createComponent(Sidebar);
    component = fixture.componentInstance;
    el = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should list the eight menu groups', () => {
    expect(el.querySelectorAll('button[aria-expanded]').length).toBe(8);
    expect(el.textContent).toContain('Trésorerie & banque');
    expect(el.textContent).toContain('Contrôle & conformité');
  });

  it('should open a group and show its entries', async () => {
    expect(el.textContent).not.toContain('Rapprochement bancaire');
    groupButton('Trésorerie')?.click();
    await fixture.whenStable();
    expect(el.textContent).toContain('Rapprochement bancaire');
  });

  it('should keep only one group open at a time', async () => {
    groupButton('Trésorerie')?.click();
    await fixture.whenStable();
    groupButton('Fiscalité')?.click();
    await fixture.whenStable();
    expect(el.textContent).toContain('Déclarations de TVA');
    expect(el.textContent).not.toContain('Rapprochement bancaire');
  });

  it('should emit when the close button is clicked', () => {
    let emitted = false;
    component.closed.subscribe(() => (emitted = true));
    el.querySelector<HTMLButtonElement>('button[aria-label="Fermer le menu"]')?.click();
    expect(emitted).toBe(true);
  });
});
