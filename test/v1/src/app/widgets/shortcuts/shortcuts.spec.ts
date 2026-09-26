import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Shortcuts } from './shortcuts';

describe('Shortcuts', () => {
  let component: Shortcuts;
  let fixture: ComponentFixture<Shortcuts>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Shortcuts] }).compileComponents();
    fixture = TestBed.createComponent(Shortcuts);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('role', 'comptable');
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should offer the priority journeys to the accountant', () => {
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Nouvelle écriture');
    expect(text).toContain('Nouveau paiement');
    expect(text).toContain('Clôturer la période');
  });

  it('should offer simpler actions to the manager', async () => {
    fixture.componentRef.setInput('role', 'dirigeant');
    await fixture.whenStable();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Valider des paiements');
    expect(text).not.toContain('Nouvelle écriture');
  });
});
