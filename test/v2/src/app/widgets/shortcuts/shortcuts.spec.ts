import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Shortcuts } from './shortcuts';

describe('Shortcuts', () => {
  let component: Shortcuts;
  let fixture: ComponentFixture<Shortcuts>;
  let el: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Shortcuts], providers: [provideRouter([])] }).compileComponents();
    fixture = TestBed.createComponent(Shortcuts);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('role', 'comptable');
    el = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should offer the priority journeys to the accountant', () => {
    expect(el.textContent).toContain('Nouvelle écriture');
    expect(el.textContent).toContain('Nouveau paiement');
    expect(el.textContent).toContain('Clôturer la période');
  });

  it('should link "Nouvelle écriture" to the entry wizard', () => {
    const link = el.querySelector<HTMLAnchorElement>('a[href="/ecritures/nouvelle"]');
    expect(link?.textContent).toContain('Nouvelle écriture');
  });

  it('should disable shortcuts that have no screen yet', () => {
    const button = Array.from(el.querySelectorAll<HTMLButtonElement>('button')).find((b) => b.textContent?.includes('Nouveau paiement'));
    expect(button?.disabled).toBe(true);
  });

  it('should offer simpler actions to the manager', async () => {
    fixture.componentRef.setInput('role', 'dirigeant');
    await fixture.whenStable();
    const text = el.textContent ?? '';
    expect(text).toContain('Valider des paiements');
    expect(text).not.toContain('Nouvelle écriture');
  });
});
