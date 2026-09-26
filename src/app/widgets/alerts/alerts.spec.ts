import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Alerts } from './alerts';
import { SEEDS, buildDashboard } from '../../core/mock-data';

describe('Alerts', () => {
  let component: Alerts;
  let fixture: ComponentFixture<Alerts>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Alerts], providers: [provideRouter([])] }).compileComponents();
    fixture = TestBed.createComponent(Alerts);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('tasks', buildDashboard(SEEDS[0]).tasks);
    fixture.componentRef.setInput('role', 'comptable');
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should put the most urgent alert first', () => {
    expect(component['all']()[0].urgency).toBe('urgent');
  });

  it('should show at most five alerts and count the others', () => {
    expect(component['shown']().length).toBe(5);
    expect(component['hidden']()).toBe(3);
  });

  it('should hide accountant-only alerts in the manager view', async () => {
    fixture.componentRef.setInput('role', 'dirigeant');
    await fixture.whenStable();
    expect(component['all']().every((t) => t.audience === 'tous')).toBe(true);
  });

  it('should turn the « Lettrer » alert into a real link to the lettrage screen', async () => {
    fixture.componentRef.setInput('tasks', buildDashboard(SEEDS[0]).tasks.filter((t) => t.id === 't8'));
    await fixture.whenStable();
    const link = (fixture.nativeElement as HTMLElement).querySelector<HTMLAnchorElement>('a[href="/tresorerie/lettrages"]');
    expect(link?.textContent).toContain('Lettrer');
  });

  it('should turn the « Rapprocher » alert into a real link to the bank reconciliation screen', async () => {
    fixture.componentRef.setInput('tasks', buildDashboard(SEEDS[0]).tasks.filter((t) => t.id === 't7'));
    await fixture.whenStable();
    const link = (fixture.nativeElement as HTMLElement).querySelector<HTMLAnchorElement>('a[href="/tresorerie/rapprochements"]');
    expect(link?.textContent).toContain('Rapprocher');
  });

  it('should keep a plain button for alerts whose screen does not exist yet', async () => {
    fixture.componentRef.setInput('tasks', buildDashboard(SEEDS[0]).tasks.filter((t) => t.id === 't4'));
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('li a.btn')).toBeNull();
    expect(root.querySelector('li button.btn')?.textContent).toContain('Clôturer');
  });
});
