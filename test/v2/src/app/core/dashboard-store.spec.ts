import { TestBed } from '@angular/core/testing';
import { DashboardStore } from './dashboard-store';

describe('DashboardStore', () => {
  let store: DashboardStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    store = TestBed.inject(DashboardStore);
  });

  it('should be created', () => {
    expect(store).toBeTruthy();
  });

  it('should expose the first dossier by default', () => {
    expect(store.data().dossier.id).toBe(store.dossiers[0].id);
  });

  it('should change the data when another dossier is selected', () => {
    const before = store.data().cash;
    store.selectDossier(store.dossiers[1].id);
    expect(store.data().dossier.id).toBe(store.dossiers[1].id);
    expect(store.data().cash).not.toBe(before);
  });

  it('should switch the user title with the role', () => {
    expect(store.user().title).toBe('Comptable');
    store.setRole('dirigeant');
    expect(store.user().title).toBe('Dirigeant');
  });

  it('should count fewer urgent alerts for the manager', () => {
    const accountant = store.urgentCount();
    store.setRole('dirigeant');
    expect(store.urgentCount()).toBeLessThan(accountant);
  });

  it('should expose four key figures', () => {
    expect(store.data().kpis.length).toBe(4);
  });
});
