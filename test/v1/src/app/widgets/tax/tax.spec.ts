import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Tax } from './tax';
import { SEEDS, buildDashboard } from '../../core/mock-data';

describe('Tax', () => {
  let component: Tax;
  let fixture: ComponentFixture<Tax>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Tax] }).compileComponents();
    fixture = TestBed.createComponent(Tax);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('tax', buildDashboard(SEEDS[0]).tax);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should compute the amount to pay as collected minus deductible', () => {
    expect(component['due']()).toBe(2_740_000);
  });
});
