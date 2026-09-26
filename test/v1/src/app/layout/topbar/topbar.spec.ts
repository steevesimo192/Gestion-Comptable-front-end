import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Topbar } from './topbar';
import { DashboardStore } from '../../core/dashboard-store';

describe('Topbar', () => {
  let component: Topbar;
  let fixture: ComponentFixture<Topbar>;
  let store: DashboardStore;
  let el: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Topbar] }).compileComponents();
    store = TestBed.inject(DashboardStore);
    fixture = TestBed.createComponent(Topbar);
    component = fixture.componentInstance;
    el = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should always show the current dossier, exercise and period', () => {
    const text = el.textContent ?? '';
    expect(text).toContain(store.data().dossier.name);
    expect(text).toContain('Exercice 2026');
    expect(text).toContain('Septembre 2026');
  });

  it('should show the user and the number of urgent alerts', () => {
    expect(el.textContent).toContain('Steeve Joel');
    expect(el.textContent).toContain(String(store.urgentCount()));
  });

  it('should show fewer urgent alerts in the manager view', async () => {
    const before = store.urgentCount();
    store.setRole('dirigeant');
    await fixture.whenStable();
    expect(store.urgentCount()).toBeLessThan(before);
  });
});
