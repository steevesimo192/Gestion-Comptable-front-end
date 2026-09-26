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
