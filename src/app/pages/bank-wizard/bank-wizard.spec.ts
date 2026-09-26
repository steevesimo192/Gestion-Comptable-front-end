import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { BankWizard } from './bank-wizard';
import { BankReconciliationStore } from '../../core/bank-store';

const KEY = 'gc.bank-reconciliation.v1';

describe('BankWizard', () => {
  let fixture: ComponentFixture<BankWizard>;
  let store: BankReconciliationStore;
  let el: HTMLElement;

  const text = () => (el.textContent ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ');
  const button = (label: string) =>
    Array.from(el.querySelectorAll<HTMLButtonElement>('button')).find((b) => b.textContent?.trim() === label);
  const click = (label: string) => {
    button(label)?.click();
    fixture.detectChanges();
  };
  const opButton = (label: string) =>
    Array.from(el.querySelectorAll<HTMLButtonElement>('button')).find((b) => b.textContent?.includes(label));
  const entryCheckbox = (ref: string) =>
    Array.from(el.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')).find((c) =>
      c.closest('label')?.textContent?.includes(ref),
    )!;

  const importSample = () => {
    click('Charger un relevé d\'exemple');
    click('Importer le relevé');
  };
  const treatRemainingManually = () => {
    ['FRAIS TENUE DE COMPTE', 'COMMISSION VIREMENT', 'VIR FOURNISSEUR Y'].forEach((label) => {
      opButton(label)?.click();
      fixture.detectChanges();
      click('Créer l\'écriture manquante');
      const select = el.querySelector<HTMLSelectElement>('#man-create-compte')!;
      select.value = '627000';
      select.dispatchEvent(new Event('change'));
      fixture.detectChanges();
      click('Créer et rapprocher');
    });
    opButton('VIR RECU REF 998')?.click();
    fixture.detectChanges();
    click('Marquer à investiguer');
    const textarea = el.querySelector<HTMLTextAreaElement>('#man-note')!;
    textarea.value = 'Donneur inconnu';
    textarea.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    click('Marquer à investiguer');
  };

  beforeEach(async () => {
    localStorage.removeItem(KEY);
    await TestBed.configureTestingModule({ imports: [BankWizard], providers: [provideRouter([])] }).compileComponents();
    store = TestBed.inject(BankReconciliationStore);
    fixture = TestBed.createComponent(BankWizard);
    el = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  });

  afterEach(() => localStorage.removeItem(KEY));

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should start on the statement step', () => {
    expect(store.currentStep()).toBe(1);
    expect(text()).toContain('Étape 1 sur 5 : Relevé');
    expect(el.querySelector('ol')?.getAttribute('aria-label')).toBe('Étapes du rapprochement bancaire');
  });

  it('should refuse to import an incomplete statement and explain why', () => {
    click('Importer le relevé');
    expect(store.currentStep()).toBe(1);
    expect(text()).toContain('Indiquez la date de début.');
  });

  it('should import the sample statement and move to suggestions', () => {
    importSample();
    expect(store.currentStep()).toBe(2);
    expect(text()).toContain('Étape 2 sur 5 : Suggestions');
    expect(text()).toContain('Relevé 09/2026');
  });

  it('should validate sure suggestions and go to manual reconciliation for the rest', () => {
    importSample();
    click('Valider les 9 correspondances');
    click('Rapprochement manuel');
    expect(store.currentStep()).toBe(3);
    expect(text()).toContain('Étape 3 sur 5');
  });

  it('should block the recap step until every operation is treated, then let it through', () => {
    importSample();
    click('Rapprochement manuel');
    expect(button('Voir le récapitulatif')?.disabled).toBe(true);
    expect(text()).toContain('Encore 15 opérations à traiter');

    store.validateAllSafe();
    store.reviewSuggestions().forEach((s) => store.validateSuggestion(s.opId));
    fixture.detectChanges();
    treatRemainingManually();

    expect(store.progress().remaining).toBe(0);
    click('Voir le récapitulatif');
    expect(store.currentStep()).toBe(4);
    expect(text()).toContain('Rapprochement complet');
  });

  it('should go through the closing confirmation and reach the result', () => {
    importSample();
    store.validateAllSafe();
    store.reviewSuggestions().forEach((s) => store.validateSuggestion(s.opId));
    store.toManual();
    fixture.detectChanges();
    treatRemainingManually();
    click('Voir le récapitulatif');
    click('Clôturer le rapprochement');
    expect(store.currentStep()).toBe(5);
    expect(text()).toContain('Dernière vérification');

    click('Confirmer la clôture');
    expect(store.currentStep()).toBe(6);
    expect(text()).toContain('Relevé rapproché');
    expect(store.statements().find((s) => s.id === store.statementId())?.statut).toBe('cloture');
  });

  it('should come back from the closing step without closing anything', () => {
    importSample();
    store.validateAllSafe();
    store.reviewSuggestions().forEach((s) => store.validateSuggestion(s.opId));
    store.toManual();
    fixture.detectChanges();
    treatRemainingManually();
    click('Voir le récapitulatif');
    click('Clôturer le rapprochement');
    click('Annuler');
    expect(store.currentStep()).toBe(4);
    expect(store.statements().find((s) => s.id === store.statementId())?.statut).toBe('en-cours');
  });

  it('should start a brand new reconciliation after one is closed', () => {
    importSample();
    store.validateAllSafe();
    store.reviewSuggestions().forEach((s) => store.validateSuggestion(s.opId));
    store.toManual();
    fixture.detectChanges();
    treatRemainingManually();
    store.toRecap();
    store.requestClose();
    store.confirmClose();
    fixture.detectChanges();

    click('Nouveau rapprochement');
    expect(store.currentStep()).toBe(1);
    expect(text()).toContain('Relevés clôturés');
  });

  it('should not show the result of a previous reconciliation when the page is opened again', async () => {
    importSample();
    store.validateAllSafe();
    store.reviewSuggestions().forEach((s) => store.validateSuggestion(s.opId));
    store.toManual();
    fixture.detectChanges();
    treatRemainingManually();
    store.toRecap();
    store.requestClose();
    store.confirmClose();
    expect(store.currentStep()).toBe(6);

    fixture = TestBed.createComponent(BankWizard);
    el = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
    expect(store.currentStep()).toBe(1);
    expect(text()).not.toContain('Relevé rapproché');
  });

  it('should let the user step back with the progress dots, but never from the result', () => {
    importSample();
    click('Rapprochement manuel');
    click('Suggestions');
    expect(store.currentStep()).toBe(2);
  });
});
