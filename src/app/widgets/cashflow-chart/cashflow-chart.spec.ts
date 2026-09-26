import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CashflowChart } from './cashflow-chart';
import { SEEDS, buildDashboard } from '../../core/mock-data';

describe('CashflowChart', () => {
  let component: CashflowChart;
  let fixture: ComponentFixture<CashflowChart>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [CashflowChart] }).compileComponents();
    fixture = TestBed.createComponent(CashflowChart);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('points', buildDashboard(SEEDS[0]).cashflow);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should draw two bars per month', () => {
    const rects = (fixture.nativeElement as HTMLElement).querySelectorAll('rect.animate-grow');
    expect(rects.length).toBe(12);
  });

  it('should show the latest month by default', () => {
    expect(component['current']().month).toBe('Sept.');
  });
});
