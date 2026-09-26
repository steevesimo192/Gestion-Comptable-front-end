import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Entries } from './entries';
import { SEEDS, buildDashboard } from '../../core/mock-data';

describe('Entries', () => {
  let component: Entries;
  let fixture: ComponentFixture<Entries>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Entries] }).compileComponents();
    fixture = TestBed.createComponent(Entries);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('entries', buildDashboard(SEEDS[0]).entries);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should list every entry', () => {
    expect((fixture.nativeElement as HTMLElement).querySelectorAll('tbody tr').length).toBe(8);
  });

  it('should warn when a draft is unbalanced', () => {
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('entre débit et crédit');
  });
});
