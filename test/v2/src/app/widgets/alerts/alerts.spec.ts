import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Alerts } from './alerts';
import { SEEDS, buildDashboard } from '../../core/mock-data';

describe('Alerts', () => {
  let component: Alerts;
  let fixture: ComponentFixture<Alerts>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Alerts] }).compileComponents();
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
});
