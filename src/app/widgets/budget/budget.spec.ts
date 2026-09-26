import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Budget } from './budget';
import { SEEDS, buildDashboard } from '../../core/mock-data';

describe('Budget', () => {
  let component: Budget;
  let fixture: ComponentFixture<Budget>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Budget] }).compileComponents();
    fixture = TestBed.createComponent(Budget);
    component = fixture.componentInstance;
    const d = buildDashboard(SEEDS[0]);
    fixture.componentRef.setInput('budget', d.budget);
    fixture.componentRef.setInput('elapsedShare', d.elapsedShare);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should flag a line that spends faster than the calendar', () => {
    const transport = component['lines']().find((l) => l.centre === 'Transport et logistique');
    expect(transport?.key).toBe('warn');
  });

  it('should keep lines on pace as ok', () => {
    const purchases = component['lines']().find((l) => l.centre === 'Achats de marchandises');
    expect(purchases?.key).toBe('ok');
  });
});
