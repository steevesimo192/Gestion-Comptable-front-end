import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Dashboard } from './dashboard';
import { DashboardStore } from '../../core/dashboard-store';

describe('Dashboard', () => {
  let fixture: ComponentFixture<Dashboard>;
  let store: DashboardStore;
  let el: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Dashboard], providers: [provideRouter([])] }).compileComponents();
    store = TestBed.inject(DashboardStore);
    fixture = TestBed.createComponent(Dashboard);
    el = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should show the page title and greet the user', () => {
    expect(el.querySelector('h1')?.textContent).toContain("Vue d'ensemble");
    expect(el.textContent).toContain('Bonjour Steeve');
  });

  it('should show four key figures', () => {
    expect(el.querySelectorAll('app-kpi-card').length).toBe(4);
  });

  it('should put priority alerts and shortcuts before the financial detail', () => {
    const order = Array.from(el.querySelectorAll('section')).map((s) => s.id);
    expect(order.indexOf('a-traiter')).toBeLessThan(order.indexOf('situation'));
    expect(order.indexOf('situation')).toBeLessThan(order.indexOf('suivi'));
  });

  it('should offer a summary to jump between sections', () => {
    expect(el.querySelectorAll('nav[aria-label="Sections du tableau de bord"] a').length).toBe(4);
  });

  it('should show closing, activity and audit in the accountant view', () => {
    expect(el.querySelector('app-closing')).not.toBeNull();
    expect(el.querySelector('app-entries')).not.toBeNull();
    expect(el.querySelector('app-audit')).not.toBeNull();
  });

  it('should hide technical blocks in the manager view', async () => {
    store.setRole('dirigeant');
    await fixture.whenStable();
    expect(el.querySelector('app-closing')).toBeNull();
    expect(el.querySelector('app-entries')).toBeNull();
    expect(el.querySelector('app-audit')).toBeNull();
    expect(el.querySelector('app-budget')).not.toBeNull();
    expect(el.querySelectorAll('nav[aria-label="Sections du tableau de bord"] a').length).toBe(3);
  });
});
