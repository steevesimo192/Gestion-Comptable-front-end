export type Role = 'comptable' | 'dirigeant';
export type Urgency = 'urgent' | 'soon' | 'normal';
export type EntryStatus = 'brouillon' | 'comptabilisee' | 'verrouillee';

export interface Dossier {
  id: string;
  name: string;
  sector: string;
  city: string;
  niu: string;
  referentiel: string;
  devise: string;
  exercice: string;
}

export interface TreasuryAccount {
  name: string;
  kind: string;
  balance: number;
}

export interface CashflowPoint {
  month: string;
  inflow: number;
  outflow: number;
  partial?: boolean;
}

export interface AgingBucket {
  label: string;
  amount: number;
  late: boolean;
}

export interface AgingSummary {
  title: string;
  total: number;
  late: number;
  buckets: AgingBucket[];
}

export interface Task {
  id: string;
  icon: string;
  title: string;
  detail: string;
  due: string;
  urgency: Urgency;
  action: string;
  audience: 'tous' | 'comptable';
  /** Route de l'écran qui traite cette alerte, s'il existe déjà. */
  link?: string;
}

export interface ClosingStep {
  label: string;
  detail: string;
  done: boolean;
}

export interface ClosingInfo {
  periodLabel: string;
  plannedDate: string;
  steps: ClosingStep[];
}

export interface BudgetLine {
  centre: string;
  budget: number;
  spent: number;
}

export interface TaxInfo {
  name: string;
  period: string;
  dueDate: string;
  status: string;
  collected: number;
  deductible: number;
  lastFiled: string;
}

export type KpiTone = 'brand' | 'deep' | 'amber' | 'green';

export interface Kpi {
  key: string;
  label: string;
  value: number;
  hint: string;
  /** Variation en % par rapport au mois précédent. */
  delta: number;
  /** true si cette variation est une bonne nouvelle pour l'entreprise. */
  good: boolean;
  icon: string;
  tone: KpiTone;
}

export interface EntryRow {
  kind: 'Écriture' | 'Paiement';
  date: string;
  ref: string;
  journal: string;
  label: string;
  amount: number;
  status: EntryStatus;
  author: string;
  gap?: number;
}

export interface AuditItem {
  who: string;
  what: string;
  when: string;
}

export interface DashboardData {
  dossier: Dossier;
  kpis: Kpi[];
  accounts: TreasuryAccount[];
  cash: number;
  receivables: AgingSummary;
  payables: AgingSummary;
  net: number;
  cashflow: CashflowPoint[];
  tasks: Task[];
  closing: ClosingInfo;
  elapsedShare: number;
  budget: BudgetLine[];
  tax: TaxInfo;
  entries: EntryRow[];
  audit: AuditItem[];
}

/* ==========================================================================
   Assistant de création de dossier comptable (parcours 1)
   ========================================================================== */
export interface CompanyOption {
  id: string;
  name: string;
  sector: string;
  city: string;
}

export interface ReferenceFrameworkOption {
  id: string;
  label: string;
  description: string;
}

export interface CurrencyOption {
  code: string;
  label: string;
}

export interface TimezoneOption {
  id: string;
  label: string;
}

export interface MonthOption {
  id: string;
  label: string;
}

/* ==========================================================================
   Saisie d'écriture comptable (parcours 2)
   ========================================================================== */
export interface JournalOption {
  id: string;
  label: string;
}

export interface AccountOption {
  code: string;
  label: string;
  /** Sert à repérer les comptes de tiers pour déduire un « Tiers » dans le récap. */
  kind: 'tiers-client' | 'tiers-fournisseur' | 'tresorerie' | 'charge' | 'produit' | 'tva';
}

/* ==========================================================================
   Lettrage d'un règlement avec une facture (parcours 3)
   ========================================================================== */
export type TiersKind = 'client' | 'fournisseur';

export interface TiersOption {
  id: string;
  /** Compte de tiers (ex. 411002), identique à celui du plan de comptes de la saisie d'écriture. */
  code: string;
  name: string;
  kind: TiersKind;
}

/** Colonne de gauche : factures et dettes. Colonne de droite : paiements et avoirs. */
export type LettrageSide = 'facture' | 'paiement';

export interface LettrageLine {
  id: string;
  tiersId: string;
  side: LettrageSide;
  nature: 'Facture' | 'Règlement' | 'Avoir';
  /** AAAA-MM-JJ */
  date: string;
  reference: string;
  libelle: string;
  /** Montant d'origine de la ligne. */
  montant: number;
  /** Ce qui n'est pas encore lettré. 0 = ligne entièrement lettrée. */
  restant: number;
}

export interface LettrageAllocation {
  ligneId: string;
  montant: number;
}

export interface LettrageRecord {
  /** Code de lettrage propre au tiers : A, B, ... Z, AA, AB... */
  code: string;
  tiersId: string;
  date: string;
  /** Montant réellement lettré (le plus petit des deux côtés). */
  montant: number;
  /** Ce qui reste non lettré à l'issue de l'opération (0 si lettrage total). */
  reste: number;
  resteSide: LettrageSide | null;
  statut: 'total' | 'partiel';
  lignes: LettrageAllocation[];
  annule: boolean;
}

export interface LettrageAuditEntry {
  when: string;
  what: string;
}

/* ==========================================================================
   Rapprochement bancaire (parcours 4)
   ========================================================================== */
export interface BankAccountOption {
  id: string;
  code: string;
  label: string;
}

/** Compte utilisable comme contrepartie quand on crée une écriture manquante. */
export interface CounterpartOption {
  code: string;
  label: string;
}

export type OperationStatus = 'a-rapprocher' | 'rapprochee' | 'a-investiguer';
export type MatchMode = 'auto' | 'manuelle';
export type StatementStatus = 'en-cours' | 'cloture';

/** Ligne du relevé de la banque. Montant signé : positif = entrée d'argent, négatif = sortie. */
export interface BankOperation {
  id: string;
  date: string;
  libelle: string;
  montant: number;
  statut: OperationStatus;
  mode: MatchMode | null;
  entryIds: string[];
  note: string;
  /** Écriture créée depuis le rapprochement pour cette opération (supprimée si on annule le rapprochement). */
  createdEntryId: string | null;
}

/** Écriture de trésorerie de la comptabilité. Même signe que le relevé : positif = encaissement. */
export interface TreasuryEntry {
  id: string;
  compteId: string;
  date: string;
  reference: string;
  libelle: string;
  montant: number;
  contrepartie?: string;
  creeeParRapprochement?: boolean;
  /** Relevé pour lequel l'écriture a été créée. */
  releveId?: string;
}

export interface BankStatement {
  id: string;
  compteId: string;
  debut: string;
  fin: string;
  soldeInitial: number;
  soldeFinal: number;
  operations: BankOperation[];
  /** Suggestions refusées, au format « idOperation|idEcriture ». */
  rejected: string[];
  statut: StatementStatus;
  creeLe: string;
  clotureLe: string | null;
}
