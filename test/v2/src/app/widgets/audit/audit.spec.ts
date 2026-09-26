import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Audit } from './audit';
import { SEEDS, buildDashboard } from '../../core/mock-data';

describe('Audit', () => {
  let component: Audit;
  let fixture: ComponentFixture<Audit>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Audit] }).compileComponents();
    fixture = TestBed.createComponent(Audit);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('items', buildDashboard(SEEDS[0]).audit);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show who did what', () => {
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Jean-Paul M.');
    expect(text).toContain('a verrouillé la période');
  });
});
