import { ComponentFixture, TestBed } from '@angular/core/testing';
import { KpiCard } from './kpi-card';
import { SEEDS, buildDashboard } from '../../core/mock-data';

describe('KpiCard', () => {
  let fixture: ComponentFixture<KpiCard>;
  let component: KpiCard;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [KpiCard] }).compileComponents();
    fixture = TestBed.createComponent(KpiCard);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('kpi', buildDashboard(SEEDS[0]).kpis[0]);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display the label and the amount', () => {
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Trésorerie');
    expect(text).toContain('48\u00a0250\u00a0000');
  });

  it('should format the variation with a sign', () => {
    expect(component['deltaText']()).toBe('+12 %');
  });
});
