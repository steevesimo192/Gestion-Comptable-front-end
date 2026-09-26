import { Injectable, computed, signal } from '@angular/core';
import { WizardStepMeta } from './dossier-wizard-store';
import {
  BANK_ACCOUNTS,
  COUNTERPART_ACCOUNTS,
  SAMPLE_CSV,
  SAMPLE_STATEMENT,
  SEED_ENTRIES,
  SEED_STATEMENTS,
} from './bank-data';
import {
  ImportForm,
  ParsedOperation,
  analyseManualRow,
  buildReportCsv,
  checkImport,
  computeBalances,
  daysBetween,
  findDuplicate,
  formatFcfa,
  isBankStatement,
  isTreasuryEntry,
  pairKey,
  parseDate,
  parseStatementCsv,
  poolFor,
  progressOf,
  statementLabel,
  suggestCounterpart,
  suggestMatches,
  suggestPeriod,
} from './bank-logic';
import { BankOperation, BankStatement, MatchMode, TreasuryEntry } from './models';
import { roundMoney, sumMoney } from './money';

const STORAGE_KEY = 'gc.bank-reconciliation.v1';

const todayIso = () => new Date().toISOString().slice(0, 10);

export type ImportSource = 'fichier' | 'manuel';

export interface ManualRow {
  id: number;
  date: string;
  libelle: string;
  sortie: string;
  entree: string;
}

export interface CreateForm {
  date: string;
  libelle: string;
  contrepartie: string;
}

let rowSequence = 0;
const newRow = (): ManualRow => ({ id: ++rowSequence, date: '', libelle: '', sortie: '', entree: '' });

const emptyForm = (): ImportForm => ({
  compteId: BANK_ACCOUNTS[0]?.id ?? '',
  debut: '',
  fin: '',
  soldeInitial: '',
  soldeFinal: '',
});

const nextNumber = (ids: readonly string[], pattern: RegExp): number =>
  ids.reduce((max, id) => {
    const m = pattern.exec(id);
    return m ? Math.max(max, Number(m[1])) : max;
  }, 0) + 1;

/**
 * Parcours 4 : « Rapprocher un relevé bancaire ».
 *
 * 5 étapes (relevé, suggestions, rapprochement manuel, récapitulatif, clôture) puis un
 * écran de résultat (étape 6). Une opération du relevé est « à rapprocher », « rapprochée »
 * ou « à investiguer » ; on ne peut clôturer que quand plus aucune n'est « à rapprocher ».
 *
 * Tout est en signaux (jamais de valeur de formulaire lue dans un `computed()`).
 * Les relevés et les écritures créées sont gardés dans le navigateur, pour qu'un
 * rapprochement en cours ne se perde pas en rechargeant la page.
 */
@Injectable({ providedIn: 'root' })
export class BankReconciliationStore {
  readonly accounts = BANK_ACCOUNTS;
  readonly counterparts = COUNTERPART_ACCOUNTS;

  readonly steps: WizardStepMeta[] = [
    { index: 1, label: 'Relevé' },
    { index: 2, label: 'Suggestions' },
    { index: 3, label: 'Rapprochement manuel' },
    { index: 4, label: 'Récapitulatif' },
    { index: 5, label: 'Clôture' },
  ];

  /* ---- Données ---- */
  readonly statements = signal<BankStatement[]>(structuredClone(SEED_STATEMENTS));
  readonly entries = signal<TreasuryEntry[]>(structuredClone(SEED_ENTRIES));

  /* ---- État de l'assistant ---- */
  readonly currentStep = signal(1);
  readonly statementId = signal<string | null>(null);
  readonly error = signal<string | null>(null);

  /* ---- Étape 1 : import ---- */
  readonly form = signal<ImportForm>(emptyForm());
  readonly source = signal<ImportSource>('fichier');
  readonly fileName = signal('');
  readonly fileOps = signal<ParsedOperation[]>([]);
  readonly fileErrors = signal<string[]>([]);
  readonly manualRows = signal<ManualRow[]>([newRow()]);
  readonly touched = signal(false);
  readonly duplicate = signal<BankStatement | null>(null);
  readonly discardPending = signal<string | null>(null);

  /* ---- Étape 3 : rapprochement manuel ---- */
  readonly selectedOpId = signal<string | null>(null);
  readonly selectedEntryIds = signal<readonly string[]>([]);
  readonly createOpen = signal(false);
  readonly createForm = signal<CreateForm>({ date: '', libelle: '', contrepartie: '' });
  readonly createError = signal<string | null>(null);
  readonly investigateOpen = signal(false);
  readonly note = signal('');
  readonly noteError = signal<string | null>(null);

  /* ==========================================================================
     Dérivés : relevé courant
     ========================================================================== */
  readonly statement = computed(() => this.statements().find((s) => s.id === this.statementId()) ?? null);
  readonly operations = computed(() => this.statement()?.operations ?? []);
  readonly label = computed(() => {
    const st = this.statement();
    return st ? statementLabel(st.debut, st.fin) : '';
  });
  readonly accountLabel = computed(() => this.accountLabelOf(this.statement()?.compteId ?? ''));

  private readonly matchedEverywhere = computed(() => {
    const ids = new Set<string>();
    for (const s of this.statements()) for (const o of s.operations) for (const id of o.entryIds) ids.add(id);
    return ids;
  });
  private readonly matchedHere = computed(() => new Set(this.operations().flatMap((o) => o.entryIds)));

  readonly pool = computed(() => {
    const st = this.statement();
    return st ? poolFor(st, this.entries(), this.matchedEverywhere()) : [];
  });
  readonly openOps = computed(() => this.operations().filter((o) => o.statut === 'a-rapprocher'));
  readonly openEntries = computed(() => this.pool().filter((e) => !this.matchedEverywhere().has(e.id)));
  readonly treatedOps = computed(() => this.operations().filter((o) => o.statut !== 'a-rapprocher'));
  readonly investigateOps = computed(() => this.operations().filter((o) => o.statut === 'a-investiguer'));
  readonly progress = computed(() => progressOf(this.operations()));
  readonly balances = computed(() => {
    const st = this.statement();
    return st
      ? computeBalances({
          soldeInitial: st.soldeInitial,
          soldeFinal: st.soldeFinal,
          operations: st.operations,
          pool: this.pool(),
          matchedEntryIds: this.matchedHere(),
        })
      : null;
  });

  /* ---- Suggestions ---- */
  readonly rejectedKeys = computed(() => new Set(this.statement()?.rejected ?? []));
  readonly suggestions = computed(() => suggestMatches(this.openOps(), this.openEntries(), this.rejectedKeys()));
  readonly safeSuggestions = computed(() => this.suggestions().filter((s) => s.confidence === 'haute'));
  readonly reviewSuggestions = computed(() => this.suggestions().filter((s) => s.confidence === 'moyenne'));
  readonly rejectedCount = computed(() => this.statement()?.rejected.length ?? 0);

  /* ---- Sélection manuelle ---- */
  readonly selectedOp = computed(() => this.openOps().find((o) => o.id === this.selectedOpId()) ?? null);
  readonly selectedEntries = computed(() => {
    const ids = new Set(this.selectedEntryIds());
    return this.openEntries().filter((e) => ids.has(e.id));
  });
  readonly selectedTotal = computed(() => sumMoney(this.selectedEntries().map((e) => e.montant)));
  /** Montant de l'opération moins celui des écritures cochées. */
  readonly difference = computed(() => {
    const op = this.selectedOp();
    return op ? roundMoney(op.montant - this.selectedTotal()) : 0;
  });
  readonly canAssociate = computed(
    () => this.selectedOp() !== null && this.selectedEntries().length > 0 && this.difference() === 0,
  );
  readonly associateHint = computed<string | null>(() => {
    const op = this.selectedOp();
    if (!op) return 'Sélectionnez d’abord une opération du relevé.';
    if (!this.selectedEntries().length) {
      return 'Cochez la ou les écritures qui correspondent, ou créez l’écriture manquante.';
    }
    const diff = this.difference();
    if (diff === 0) return null;
    const sameSign = (diff > 0) === (op.montant > 0);
    return sameSign
      ? `Il manque ${formatFcfa(Math.abs(diff))} : cochez une autre écriture, ou créez l’écriture manquante.`
      : `Les écritures cochées dépassent l’opération de ${formatFcfa(Math.abs(diff))}.`;
  });

  /** Écritures libres, celles de même montant que l'opération choisie d'abord. */
  readonly rankedEntries = computed(() => {
    const op = this.selectedOp();
    const list = [...this.openEntries()];
    if (!op) return list;
    const score = (e: TreasuryEntry) => (roundMoney(e.montant) === roundMoney(op.montant) ? 0 : 1);
    return list.sort(
      (a, b) =>
        score(a) - score(b) ||
        daysBetween(a.date, op.date) - daysBetween(b.date, op.date) ||
        a.date.localeCompare(b.date) ||
        a.id.localeCompare(b.id),
    );
  });

  /* ---- Import ---- */
  private readonly manualStates = computed(() =>
    this.manualRows().map((row) => ({ row, state: analyseManualRow(row) })),
  );
  readonly manualErrors = computed(() => {
    const map = new Map<number, string>();
    for (const { row, state } of this.manualStates()) if (state.kind === 'error') map.set(row.id, state.message);
    return map;
  });
  readonly importOps = computed<ParsedOperation[]>(() => {
    if (this.source() === 'fichier') return this.fileOps();
    const ops: ParsedOperation[] = [];
    for (const { state } of this.manualStates()) if (state.kind === 'op') ops.push(state.op);
    return ops.sort((a, b) => a.date.localeCompare(b.date));
  });
  readonly importCheck = computed(() => checkImport(this.form(), this.importOps()));
  readonly importBlockers = computed(() => {
    if (this.source() === 'fichier' && this.fileErrors().length) {
      return ['Le fichier contient des erreurs : corrigez-le puis importez-le de nouveau.'];
    }
    const bad = this.manualErrors().size;
    if (this.source() === 'manuel' && bad > 0) {
      return [`${bad} ligne${bad > 1 ? 's' : ''} saisie${bad > 1 ? 's' : ''} à compléter ou à corriger.`];
    }
    return this.importCheck().issues;
  });
  readonly canImport = computed(
    () => Object.keys(this.importCheck().fieldErrors).length === 0 && this.importBlockers().length === 0,
  );

  /** Opérations restées « à investiguer » sur des relevés clôturés du compte choisi. */
  readonly carryOver = computed(() =>
    this.statements()
      .filter((s) => s.statut === 'cloture' && s.compteId === this.form().compteId)
      .flatMap((s) =>
        s.operations
          .filter((o) => o.statut === 'a-investiguer')
          .map((op) => ({ statementId: s.id, statementLabel: statementLabel(s.debut, s.fin), op })),
      ),
  );

  readonly statementRows = computed(() =>
    [...this.statements()]
      .sort((a, b) => b.debut.localeCompare(a.debut) || b.id.localeCompare(a.id))
      .map((statement) => ({
        statement,
        label: statementLabel(statement.debut, statement.fin),
        account: this.accountLabelOf(statement.compteId),
        progress: progressOf(statement.operations),
      })),
  );
  readonly inProgressRows = computed(() => this.statementRows().filter((r) => r.statement.statut === 'en-cours'));
  readonly closedRows = computed(() => this.statementRows().filter((r) => r.statement.statut === 'cloture'));

  /* ---- Résultat ---- */
  readonly summary = computed(() => {
    const st = this.statement();
    const balances = this.balances();
    if (!st || !balances) return null;
    return {
      label: this.label(),
      account: this.accountLabel(),
      closedOn: st.clotureLe,
      progress: this.progress(),
      balances,
      investigateOps: this.investigateOps(),
      createdCount: st.operations.filter((o) => o.createdEntryId !== null).length,
    };
  });
  readonly reportCsv = computed(() => {
    const st = this.statement();
    const balances = this.balances();
    if (!st || !balances) return '';
    return buildReportCsv({ statement: st, entries: this.entries(), accountLabel: this.accountLabel(), balances });
  });
  readonly reportFileName = computed(() => {
    const st = this.statement();
    return st ? `rapprochement-${st.compteId}-${st.debut}-${st.fin}.csv` : 'rapprochement.csv';
  });

  constructor() {
    this.restore();
  }

  accountLabelOf(code: string): string {
    const a = this.accounts.find((x) => x.id === code);
    return a ? `${a.label} (${a.code})` : code;
  }

  /* ==========================================================================
     Cycle de vie
     ========================================================================== */

  /** À l'ouverture de la page : on ne réaffiche jamais un ancien résultat ; le travail en cours est conservé. */
  enter() {
    if (this.currentStep() === 6 || (this.statementId() !== null && this.statement() === null)) this.resetFlow();
  }

  resetFlow() {
    this.currentStep.set(1);
    this.statementId.set(null);
    this.error.set(null);
    this.clearSelection();
    this.resetImport();
  }

  /** « Nouveau rapprochement » : repart de zéro sans toucher aux relevés enregistrés. */
  startNew() {
    this.resetFlow();
  }

  /** Remet les données de démonstration (utile aux tests). */
  resetData() {
    this.statements.set(structuredClone(SEED_STATEMENTS));
    this.entries.set(structuredClone(SEED_ENTRIES));
    this.resetFlow();
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* stockage indisponible : sans importance */
    }
  }

  /* ==========================================================================
     Étape 1 : import du relevé
     ========================================================================== */
  setField(field: keyof ImportForm, value: string) {
    this.form.update((f) => ({ ...f, [field]: value }));
    this.duplicate.set(null);
  }

  chooseSource(source: ImportSource) {
    this.source.set(source);
    this.duplicate.set(null);
  }

  loadCsv(name: string, text: string) {
    const result = parseStatementCsv(text);
    this.source.set('fichier');
    this.fileName.set(name);
    this.fileErrors.set(result.errors);
    this.fileOps.set(result.errors.length ? [] : result.operations);
    this.duplicate.set(null);
    if (!result.errors.length) {
      const period = suggestPeriod(result.operations.map((o) => o.date));
      const f = this.form();
      if (period && !f.debut && !f.fin) this.form.set({ ...f, debut: period.debut, fin: period.fin });
    }
  }

  /** Le fichier n'a pas pu être lu du tout (format, droits…). */
  failFile(name: string, message: string) {
    this.source.set('fichier');
    this.fileName.set(name);
    this.fileOps.set([]);
    this.fileErrors.set([message]);
  }

  clearFile() {
    this.fileName.set('');
    this.fileOps.set([]);
    this.fileErrors.set([]);
    this.duplicate.set(null);
  }

  loadSample() {
    this.form.set({
      compteId: SAMPLE_STATEMENT.compteId,
      debut: SAMPLE_STATEMENT.debut,
      fin: SAMPLE_STATEMENT.fin,
      soldeInitial: String(SAMPLE_STATEMENT.soldeInitial),
      soldeFinal: String(SAMPLE_STATEMENT.soldeFinal),
    });
    this.loadCsv(SAMPLE_STATEMENT.fileName, SAMPLE_CSV);
  }

  addManualRow() {
    this.manualRows.update((rows) => [...rows, newRow()]);
  }

  removeManualRow(id: number) {
    this.manualRows.update((rows) => {
      const left = rows.filter((r) => r.id !== id);
      return left.length ? left : [newRow()];
    });
  }

  updateManualRow(id: number, patch: Partial<Omit<ManualRow, 'id'>>) {
    this.manualRows.update((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    this.duplicate.set(null);
  }

  private resetImport() {
    this.form.set(emptyForm());
    this.source.set('fichier');
    this.fileName.set('');
    this.fileOps.set([]);
    this.fileErrors.set([]);
    this.manualRows.set([newRow()]);
    this.touched.set(false);
    this.duplicate.set(null);
    this.discardPending.set(null);
  }

  /** Crée le relevé et passe aux suggestions. Un doublon probable est signalé avant tout enregistrement. */
  submitImport(): boolean {
    this.touched.set(true);
    this.error.set(null);
    this.duplicate.set(null);
    if (!this.canImport()) return false;
    const f = this.form();
    const dup = findDuplicate(
      this.statements(),
      f.compteId,
      parseDate(f.debut) as string,
      parseDate(f.fin) as string,
      this.importOps(),
    );
    if (dup) {
      this.duplicate.set(dup);
      return false;
    }
    return this.createStatement();
  }

  /** L'utilisateur confirme qu'il ne s'agit pas d'un doublon. */
  importAnyway(): boolean {
    this.touched.set(true);
    if (!this.canImport()) return false;
    return this.createStatement();
  }

  dismissDuplicate() {
    this.duplicate.set(null);
  }

  private createStatement(): boolean {
    const f = this.form();
    const check = this.importCheck();
    const debut = parseDate(f.debut);
    const fin = parseDate(f.fin);
    if (!check.valid || debut === null || fin === null || check.soldeInitial === null || check.soldeFinal === null) {
      return false;
    }
    const id = `rel-${nextNumber(this.statements().map((s) => s.id), /^rel-(\d+)$/)}`;
    const operations: BankOperation[] = this.importOps().map((o, i) => ({
      id: `${id}-o${i + 1}`,
      date: o.date,
      libelle: o.libelle,
      montant: o.montant,
      statut: 'a-rapprocher',
      mode: null,
      entryIds: [],
      note: '',
      createdEntryId: null,
    }));
    const statement: BankStatement = {
      id,
      compteId: f.compteId,
      debut,
      fin,
      soldeInitial: check.soldeInitial,
      soldeFinal: check.soldeFinal,
      operations,
      rejected: [],
      statut: 'en-cours',
      creeLe: todayIso(),
      clotureLe: null,
    };
    this.statements.update((list) => [...list, statement]);
    this.persist();
    this.statementId.set(id);
    this.clearSelection();
    this.resetImport();
    this.currentStep.set(2);
    return true;
  }

  /** Reprend un rapprochement en cours là où il en était. */
  resume(id: string): boolean {
    const st = this.statements().find((s) => s.id === id);
    if (!st || st.statut !== 'en-cours') return false;
    this.error.set(null);
    this.clearSelection();
    this.statementId.set(id);
    const step = this.progress().remaining === 0 ? 4 : this.suggestions().length > 0 ? 2 : 3;
    this.currentStep.set(step);
    return true;
  }

  /** Consulte un relevé clôturé (lecture seule). */
  viewClosed(id: string): boolean {
    const st = this.statements().find((s) => s.id === id);
    if (!st || st.statut !== 'cloture') return false;
    this.error.set(null);
    this.clearSelection();
    this.statementId.set(id);
    this.currentStep.set(6);
    return true;
  }

  requestDiscard(id: string) {
    const st = this.statements().find((s) => s.id === id);
    if (st?.statut === 'en-cours') this.discardPending.set(id);
  }

  cancelDiscard() {
    this.discardPending.set(null);
  }

  /** Abandonne un relevé en cours (jamais un relevé clôturé) et supprime les écritures créées pour lui. */
  confirmDiscard(): boolean {
    const id = this.discardPending();
    this.discardPending.set(null);
    const st = id ? this.statements().find((s) => s.id === id) : undefined;
    if (!id || !st || st.statut !== 'en-cours') return false;
    this.statements.update((list) => list.filter((s) => s.id !== id));
    this.entries.update((list) => list.filter((e) => e.releveId !== id));
    if (this.statementId() === id) {
      this.statementId.set(null);
      this.currentStep.set(1);
    }
    this.persist();
    return true;
  }

  /* ==========================================================================
     Étape 2 : suggestions
     ========================================================================== */
  validateSuggestion(opId: string): boolean {
    const s = this.suggestions().find((x) => x.opId === opId);
    return s ? this.applyMatch(opId, [s.entryId], 'auto') : false;
  }

  /** Valide d'un coup toutes les correspondances sûres ; renvoie combien ont été validées. */
  validateAllSafe(): number {
    let count = 0;
    for (const s of [...this.safeSuggestions()]) {
      if (this.applyMatch(s.opId, [s.entryId], 'auto')) count++;
    }
    return count;
  }

  rejectSuggestion(opId: string) {
    const st = this.statement();
    const s = this.suggestions().find((x) => x.opId === opId);
    if (!st || st.statut !== 'en-cours' || !s) return;
    const key = pairKey(s.opId, s.entryId);
    this.updateStatement(st.id, (x) => ({ ...x, rejected: x.rejected.includes(key) ? x.rejected : [...x.rejected, key] }));
  }

  restoreRejected() {
    const st = this.statement();
    if (!st || st.statut !== 'en-cours') return;
    this.updateStatement(st.id, (x) => ({ ...x, rejected: [] }));
  }

  /** « Choisir moi-même » : ouvre le rapprochement manuel sur cette opération. */
  reviewManually(opId: string) {
    if (this.currentStep() !== 2) return;
    this.currentStep.set(3);
    this.selectedOpId.set(null);
    this.selectOperation(opId);
  }

  /* ==========================================================================
     Étape 3 : rapprochement manuel
     ========================================================================== */
  selectOperation(opId: string) {
    if (this.selectedOpId() === opId) {
      this.selectedOpId.set(null);
    } else if (this.openOps().some((o) => o.id === opId)) {
      this.selectedOpId.set(opId);
    } else {
      return;
    }
    this.selectedEntryIds.set([]);
    this.closeForms();
  }

  toggleEntry(entryId: string) {
    if (!this.openEntries().some((e) => e.id === entryId)) return;
    this.selectedEntryIds.update((ids) => (ids.includes(entryId) ? ids.filter((i) => i !== entryId) : [...ids, entryId]));
  }

  clearSelection() {
    this.selectedOpId.set(null);
    this.selectedEntryIds.set([]);
    this.closeForms();
  }

  private closeForms() {
    this.createOpen.set(false);
    this.createError.set(null);
    this.investigateOpen.set(false);
    this.noteError.set(null);
    this.note.set('');
  }

  associateSelection(): boolean {
    const op = this.selectedOp();
    if (!op || !this.canAssociate()) return false;
    const done = this.applyMatch(op.id, this.selectedEntries().map((e) => e.id), 'manuelle');
    if (done) this.clearSelection();
    return done;
  }

  openCreate() {
    const op = this.selectedOp();
    if (!op) return;
    this.investigateOpen.set(false);
    this.noteError.set(null);
    this.createError.set(null);
    this.createForm.set({ date: op.date, libelle: op.libelle, contrepartie: suggestCounterpart(op.libelle, op.montant) });
    this.createOpen.set(true);
  }

  closeCreate() {
    this.createOpen.set(false);
    this.createError.set(null);
  }

  setCreateField(field: keyof CreateForm, value: string) {
    this.createForm.update((f) => ({ ...f, [field]: value }));
  }

  /** Crée l'écriture de trésorerie qui manquait et la rapproche aussitôt de l'opération. */
  createMissingEntry(): boolean {
    const st = this.statement();
    const op = this.selectedOp();
    if (!st || st.statut !== 'en-cours' || !op) return false;
    const f = this.createForm();
    const date = parseDate(f.date);
    const libelle = f.libelle.replace(/\s+/g, ' ').trim();
    if (!date) return this.failCreate('Indiquez une date valide.');
    if (!libelle) return this.failCreate('Indiquez le libellé de l’écriture.');
    if (!this.counterparts.some((c) => c.code === f.contrepartie)) {
      return this.failCreate('Choisissez le compte de contrepartie.');
    }
    const ids = this.entries().map((e) => e.id);
    const refs = this.entries().map((e) => e.reference);
    const entry: TreasuryEntry = {
      id: `ec-${nextNumber(ids, /^ec-(\d+)$/)}`,
      compteId: st.compteId,
      date,
      reference: `BQ-${String(nextNumber(refs, /^BQ-(\d+)$/)).padStart(4, '0')}`,
      libelle,
      montant: op.montant,
      contrepartie: f.contrepartie,
      creeeParRapprochement: true,
      releveId: st.id,
    };
    this.entries.update((list) => [...list, entry]);
    if (!this.applyMatch(op.id, [entry.id], 'manuelle', entry.id)) {
      this.entries.update((list) => list.filter((e) => e.id !== entry.id));
      return this.failCreate('L’écriture n’a pas pu être rapprochée : réessayez.');
    }
    this.clearSelection();
    return true;
  }

  private failCreate(message: string): false {
    this.createError.set(message);
    return false;
  }

  openInvestigate() {
    if (!this.selectedOp()) return;
    this.createOpen.set(false);
    this.createError.set(null);
    this.noteError.set(null);
    this.note.set('');
    this.investigateOpen.set(true);
  }

  closeInvestigate() {
    this.investigateOpen.set(false);
    this.noteError.set(null);
  }

  setNote(value: string) {
    this.note.set(value);
  }

  /** Garde l'opération pour plus tard, avec une note qui explique pourquoi. */
  markInvestigate(): boolean {
    const st = this.statement();
    const op = this.selectedOp();
    if (!st || st.statut !== 'en-cours' || !op) return false;
    const note = this.note().replace(/\s+/g, ' ').trim();
    if (note.length < 3) {
      this.noteError.set('Écrivez une courte note : elle expliquera pourquoi cette opération reste ouverte.');
      return false;
    }
    this.updateOperation(st.id, op.id, (o) => ({ ...o, statut: 'a-investiguer', mode: null, entryIds: [], note }));
    this.clearSelection();
    return true;
  }

  /** Annule un rapprochement, ou remet à traiter une opération « à investiguer ». */
  undoOperation(opId: string): boolean {
    const st = this.statement();
    const op = st?.operations.find((o) => o.id === opId);
    if (!st || st.statut !== 'en-cours' || !op || op.statut === 'a-rapprocher') return false;
    this.updateOperation(st.id, opId, (o) => ({
      ...o,
      statut: 'a-rapprocher',
      mode: null,
      entryIds: [],
      note: '',
      createdEntryId: null,
    }));
    if (op.createdEntryId) {
      const created = op.createdEntryId;
      this.entries.update((list) => list.filter((e) => e.id !== created));
      this.persist();
    }
    return true;
  }

  /* ==========================================================================
     Navigation
     ========================================================================== */
  toManual() {
    if (this.currentStep() !== 2 || !this.statement()) return;
    this.error.set(null);
    this.currentStep.set(3);
  }

  toRecap(): boolean {
    if (this.currentStep() !== 3 || !this.statement()) return false;
    if (this.progress().remaining > 0) {
      const n = this.progress().remaining;
      this.error.set(`Il reste ${n} opération${n > 1 ? 's' : ''} à traiter avant le récapitulatif.`);
      return false;
    }
    this.error.set(null);
    this.clearSelection();
    this.currentStep.set(4);
    return true;
  }

  requestClose(): boolean {
    if (this.currentStep() !== 4 || !this.statement()) return false;
    if (this.progress().remaining > 0) {
      this.error.set('Toutes les opérations doivent être traitées avant la clôture.');
      return false;
    }
    this.error.set(null);
    this.currentStep.set(5);
    return true;
  }

  cancelClose() {
    if (this.currentStep() === 5) this.currentStep.set(4);
  }

  /** Clôture définitive. Revérifie tout au moment de confirmer. */
  confirmClose(): boolean {
    const st = this.statement();
    if (this.currentStep() !== 5 || !st || st.statut !== 'en-cours') return false;
    if (this.progress().remaining > 0) {
      this.error.set('Des opérations restent à traiter : retournez au rapprochement.');
      this.currentStep.set(3);
      return false;
    }
    this.error.set(null);
    this.updateStatement(st.id, (s) => ({ ...s, statut: 'cloture', clotureLe: todayIso() }));
    this.currentStep.set(6);
    return true;
  }

  /** Retour en arrière avec les pastilles de progression (jamais depuis le résultat). */
  goBackTo(step: number) {
    const current = this.currentStep();
    if (current === 6 || step < 1 || step >= current) return;
    if (step >= 2 && !this.statement()) return;
    this.error.set(null);
    this.closeForms();
    this.currentStep.set(step);
  }

  /* ==========================================================================
     Écriture des données
     ========================================================================== */
  private applyMatch(opId: string, entryIds: string[], mode: MatchMode, createdEntryId: string | null = null): boolean {
    const st = this.statement();
    if (!st || st.statut !== 'en-cours') return false;
    const op = st.operations.find((o) => o.id === opId);
    if (!op || op.statut !== 'a-rapprocher') return false;
    const open = new Map(this.openEntries().map((e) => [e.id, e]));
    if (!entryIds.length || new Set(entryIds).size !== entryIds.length || entryIds.some((id) => !open.has(id))) {
      return false;
    }
    const total = sumMoney(entryIds.map((id) => (open.get(id) as TreasuryEntry).montant));
    if (total !== roundMoney(op.montant)) return false;
    this.updateOperation(st.id, opId, (o) => ({
      ...o,
      statut: 'rapprochee',
      mode,
      entryIds: [...entryIds],
      note: '',
      createdEntryId,
    }));
    return true;
  }

  private updateOperation(statementId: string, opId: string, fn: (o: BankOperation) => BankOperation) {
    this.updateStatement(statementId, (s) => ({
      ...s,
      operations: s.operations.map((o) => (o.id === opId ? fn(o) : o)),
    }));
  }

  private updateStatement(id: string, fn: (s: BankStatement) => BankStatement) {
    this.statements.update((list) => list.map((s) => (s.id === id ? fn(s) : s)));
    this.persist();
  }

  private persist() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          v: 1,
          statements: this.statements(),
          createdEntries: this.entries().filter((e) => e.creeeParRapprochement),
        }),
      );
    } catch {
      /* stockage plein ou indisponible : le travail reste en mémoire */
    }
  }

  private restore() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data: unknown = JSON.parse(raw);
      if (typeof data !== 'object' || data === null) return;
      const { v, statements, createdEntries } = data as Record<string, unknown>;
      if (v !== 1 || !Array.isArray(statements) || !Array.isArray(createdEntries)) return;
      if (!statements.every(isBankStatement) || !createdEntries.every(isTreasuryEntry)) return;
      const entries = [...structuredClone(SEED_ENTRIES), ...(createdEntries as TreasuryEntry[])];
      const known = new Set(entries.map((e) => e.id));
      const consistent = (statements as BankStatement[]).every((s) =>
        s.operations.every((o) => o.entryIds.every((id) => known.has(id))),
      );
      if (!consistent) return;
      this.statements.set(statements as BankStatement[]);
      this.entries.set(entries);
    } catch {
      /* données illisibles : on repart des données de démonstration */
    }
  }
}
