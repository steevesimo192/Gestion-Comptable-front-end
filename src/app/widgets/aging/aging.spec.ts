import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Aging } from './aging';
import { SEEDS, buildDashboard } from '../../core/mock-data';

describe('Aging', () => {
  let component: Aging;
  let fixture: ComponentFixture<Aging>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Aging] }).compileComponents();
    fixture = TestBed.createComponent(Aging);
    component = fixture.componentInstance;
    const d = buildDashboard(SEEDS[0]);
    fixture.componentRef.setInput('receivables', d.receivables);
    fixture.componentRef.setInput('payables', d.payables);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render one block for customers and one for suppliers', () => {
    expect(component['blocks']().length).toBe(2);
  });

  it('should compute the share of late amounts', () => {
    const [customers] = component['blocks']();
    expect(customers.latePct).toBe(50);
  });
});
