import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Closing } from './closing';
import { SEEDS, buildDashboard } from '../../core/mock-data';

describe('Closing', () => {
  let component: Closing;
  let fixture: ComponentFixture<Closing>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Closing] }).compileComponents();
    fixture = TestBed.createComponent(Closing);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('closing', buildDashboard(SEEDS[0]).closing);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should count the steps that are ready', () => {
    expect(component['doneCount']()).toBe(2);
    expect(component['remaining']()).toBe(3);
  });

  it('should tell the user that a preview comes before locking', () => {
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Rien n\'est verrouillé');
  });
});
