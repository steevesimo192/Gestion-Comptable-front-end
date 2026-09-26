import {
  AgingSummary,
  DashboardData,
  Dossier,
  EntryRow,
  Kpi,
  Task,
} from './models';

export interface DossierSeed {
  dossier: Dossier;
  scale: number;
  clients: string[];
  suppliers: string[];
}

export const SEEDS: DossierSeed[] = [
  {
    dossier: {
      id: 'kamga',
      name: 'Kamga Distribution SARL',
      sector: 'Distribution de produits alimentaires',
      city: 'Douala',
      niu: 'M092612345678K',
      referentiel: 'SYSCOHADA révisé',
      devise: 'XAF',
      exercice: 'Exercice 2026',
    },
    scale: 1,
    clients: ['Supermarché Le Bon Prix', 'Hôtel Beau Séjour', 'Restaurant Chez Mama Eka', 'Pharmacie du Rond-Point'],
    suppliers: ['Brasseries du Wouri', 'Transports Mbappe et Fils', 'Énergie Littoral', 'Imprimerie Moderne'],
  },
  {
    dossier: {
      id: 'ndongo',
      name: 'Boulangerie Ndongo SARL',
      sector: 'Boulangerie et pâtisserie',
      city: 'Yaoundé',
      niu: 'M081798765432P',
      referentiel: 'SYSCOHADA révisé',
      devise: 'XAF',
      exercice: 'Exercice 2026',
    },
    scale: 0.22,
    clients: ['Lycée Bilingue de Bastos', 'Café du Marché Central', 'Traiteur Les Délices', 'Hôtel Mont Fébé'],
    suppliers: ['Minoterie du Centre', 'Sucreries Nyong', 'Énergie Centre', 'Emballages Camer'],
  },
  {
    dossier: {
      id: 'sotrap',
      name: 'Sotrap Logistique SA',
      sector: 'Transport et logistique',
      city: 'Douala',
      niu: 'M045511223344R',
      referentiel: 'SYSCOHADA révisé',
      devise: 'XAF',
      exercice: 'Exercice 2026',
    },
    scale: 3.4,
    clients: ['Société Agro Littoral', 'Cotonnière du Nord', 'Import Export Wouri', 'Chantiers Navals de Limbé'],
    suppliers: ['Station Total Bonabéri', 'Pneus et Services', 'Assurances Horizon', 'Garage Central'],
  },
];

const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);
const fmt = (n: number) => new Intl.NumberFormat('fr-FR').format(n).replace(/\u202f/g, '\u00a0') + '\u00a0FCFA';

export function buildDashboard(seed: DossierSeed): DashboardData {
  const k = seed.scale;
  const s = (n: number) => Math.round((n * k) / 500) * 500;
  const [c, f] = [seed.clients, seed.suppliers];

  // Trésorerie
  const accounts = [
    { name: 'Compte courant principal', kind: 'Banque', balance: s(31_600_000) },
    { name: "Compte d'épargne", kind: 'Banque', balance: s(12_000_000) },
    { name: 'Mobile money', kind: 'Mobile', balance: s(3_500_000) },
    { name: 'Caisse', kind: 'Espèces', balance: s(1_150_000) },
  ];
  const cash = sum(accounts.map((a) => a.balance));

  // Créances et dettes, classées par ancienneté
  const aging = (title: string, rows: [string, number, boolean][]): AgingSummary => {
    const buckets = rows.map(([label, amount, late]) => ({ label, amount: s(amount), late }));
    return {
      title,
      buckets,
      total: sum(buckets.map((b) => b.amount)),
      late: sum(buckets.filter((b) => b.late).map((b) => b.amount)),
    };
  };
  const receivables = aging('Ce que vos clients vous doivent', [
    ['À jour', 31_200_000, false],
    ['1 à 30 jours de retard', 17_500_000, true],
    ['31 à 60 jours de retard', 8_700_000, true],
    ['Plus de 60 jours de retard', 5_000_000, true],
  ]);
  const payables = aging('Ce que vous devez à vos fournisseurs', [
    ['À jour', 24_100_000, false],
    ['1 à 30 jours de retard', 9_800_000, true],
    ['31 à 60 jours de retard', 3_200_000, true],
    ['Plus de 60 jours de retard', 700_000, true],
  ]);
  const net = cash + receivables.total - payables.total;

  // Flux de trésorerie, d'avril à septembre (septembre en cours)
  const inflows = [38.2, 41.5, 36.9, 44.8, 47.1, 43.6];
  const outflows = [34.1, 37.8, 39.5, 38.2, 41.9, 40.3];
  const months = ['Avr.', 'Mai', 'Juin', 'Juil.', 'Août', 'Sept.'];
  const cashflow = months.map((month, i) => ({
    month,
    inflow: s(inflows[i] * 1_000_000),
    outflow: s(outflows[i] * 1_000_000),
    partial: i === months.length - 1,
  }));

  // À faire
  const lateOver30 = receivables.buckets[2].amount + receivables.buckets[3].amount;
  const tasks: Task[] = [
    { id: 't1', icon: 'cash', title: 'Valider 2 paiements fournisseurs', detail: `${fmt(s(2_350_000))} attendent votre accord`, due: "aujourd'hui", urgency: 'urgent', action: 'Valider', audience: 'tous' },
    { id: 't2', icon: 'pen', title: '3 écritures en brouillon à valider', detail: 'Une des trois est déséquilibrée', due: 'avant la clôture', urgency: 'urgent', action: 'Valider', audience: 'comptable' },
    { id: 't3', icon: 'calendar', title: '3 factures fournisseurs arrivent à échéance', detail: `Total de ${fmt(s(6_840_000))} à régler`, due: "jusqu'au 25 sept.", urgency: 'urgent', action: 'Voir les échéances', audience: 'tous' },
    { id: 't4', icon: 'lock', title: 'Période 09/2026 à clôturer avant le 05/10/2026', detail: '2 étapes sur 5 sont déjà prêtes', due: 'dans 14 jours', urgency: 'soon', action: 'Clôturer', audience: 'comptable' },
    { id: 't5', icon: 'percent', title: 'TVA de septembre à déclarer', detail: 'Le brouillon est prêt à être relu', due: 'échéance dans 24 jours', urgency: 'soon', action: 'Préparer', audience: 'tous' },
    { id: 't6', icon: 'users', title: 'Relancer 4 clients en retard de plus de 30 jours', detail: `${fmt(lateOver30)} restent à recouvrer`, due: 'cette semaine', urgency: 'soon', action: 'Relancer', audience: 'tous' },
    { id: 't7', icon: 'bank', title: 'Rapprocher le relevé de septembre', detail: '14 opérations bancaires sans écriture correspondante', due: 'avant la clôture', urgency: 'normal', action: 'Rapprocher', audience: 'comptable', link: '/tresorerie/rapprochements' },
    { id: 't8', icon: 'file', title: 'Lettrer 5 règlements reçus', detail: `${fmt(s(4_120_000))} ne sont pas encore affectés à une facture`, due: 'avant la clôture', urgency: 'normal', action: 'Lettrer', audience: 'comptable', link: '/tresorerie/lettrages' },
  ];

  // Écritures récentes
  const gap = Math.max(500, s(12_500));
  const entries: EntryRow[] = [
    { kind: 'Écriture', date: '21 sept.', ref: 'VE-0187', journal: 'Ventes', label: `Facture ${c[0]}`, amount: s(4_680_000), status: 'brouillon', author: 'Steeve J.' },
    { kind: 'Écriture', date: '21 sept.', ref: 'AC-0342', journal: 'Achats', label: `Facture ${f[0]}`, amount: s(2_915_000), status: 'brouillon', author: 'Steeve J.', gap },
    { kind: 'Paiement', date: '20 sept.', ref: 'BQ-0219', journal: 'Banque', label: `Encaissement ${c[1]}`, amount: s(3_200_000), status: 'comptabilisee', author: 'Steeve J.' },
    { kind: 'Écriture', date: '19 sept.', ref: 'CA-0056', journal: 'Caisse', label: 'Fournitures de bureau', amount: Math.max(500, s(86_500)), status: 'comptabilisee', author: 'Steeve J.' },
    { kind: 'Écriture', date: '18 sept.', ref: 'OD-0031', journal: 'Opérations diverses', label: 'Loyer de septembre', amount: s(1_250_000), status: 'comptabilisee', author: 'Automatique' },
    { kind: 'Paiement', date: '15 sept.', ref: 'BQ-0208', journal: 'Banque', label: `Règlement ${f[1]}`, amount: s(5_420_000), status: 'comptabilisee', author: 'Jean-Paul M.' },
    { kind: 'Écriture', date: '31 août', ref: 'VE-0171', journal: 'Ventes', label: `Facture ${c[2]}`, amount: s(7_905_000), status: 'verrouillee', author: 'Steeve J.' },
    { kind: 'Écriture', date: '31 août', ref: 'OD-0027', journal: 'Opérations diverses', label: "Amortissements d'août", amount: s(1_860_000), status: 'verrouillee', author: 'Automatique' },
  ];

const kpis: Kpi[] = [
    { key: 'cash', label: 'Trésorerie', value: cash, hint: 'Banque, caisse et mobile money', delta: 12, good: true, icon: 'cash', tone: 'brand' },
    { key: 'receivables', label: 'Créances clients', value: receivables.total, hint: `${fmt(receivables.late)} en retard`, delta: 8, good: false, icon: 'users', tone: 'deep' },
    { key: 'payables', label: 'Dettes fournisseurs', value: payables.total, hint: `${fmt(payables.late)} en retard`, delta: -5, good: true, icon: 'file', tone: 'amber' },
    { key: 'result', label: 'Résultat provisoire', value: s(18_400_000), hint: 'Produits moins charges, à ce jour', delta: 15, good: true, icon: 'trend', tone: 'green' },
  ];

  return {
    dossier: seed.dossier,
    kpis,
    accounts,
    cash,
    receivables,
    payables,
    net,
    cashflow,
    tasks,
    closing: {
      periodLabel: 'Septembre 2026',
      plannedDate: '5 octobre 2026',
      steps: [
        { label: 'Écritures en brouillon validées', detail: '3 restantes', done: false },
        { label: 'Relevé bancaire rapproché', detail: '92 % des opérations rapprochées', done: false },
        { label: 'Règlements lettrés', detail: '5 restants', done: false },
        { label: 'Amortissements du mois comptabilisés', detail: 'Terminé le 18 sept.', done: true },
        { label: 'Écritures récurrentes générées', detail: 'Loyer et abonnements', done: true },
      ],
    },
    elapsedShare: 0.72,
    budget: [
      { centre: 'Achats de marchandises', budget: s(180_000_000), spent: s(128_000_000) },
      { centre: 'Personnel', budget: s(54_000_000), spent: s(41_000_000) },
      { centre: 'Transport et logistique', budget: s(24_000_000), spent: s(21_600_000) },
      { centre: 'Loyers et charges', budget: s(12_000_000), spent: s(8_900_000) },
      { centre: 'Marketing', budget: s(9_000_000), spent: s(4_100_000) },
    ],
    tax: {
      name: 'TVA',
      period: 'Septembre 2026',
      dueDate: '15 octobre 2026',
      status: 'Brouillon',
      collected: s(8_120_000),
      deductible: s(5_380_000),
      lastFiled: "Août 2026, déposée le 12 septembre",
    },
    entries,
    audit: [
      { who: 'Steeve J.', what: `a enregistré la facture VE-0187 en brouillon`, when: 'Il y a 35 min' },
      { who: 'Jean-Paul M.', what: 'a validé le paiement BQ-0208', when: 'Il y a 2 h' },
      { who: 'Le système', what: "a généré l'écriture récurrente du loyer", when: 'Il y a 3 jours' },
      { who: 'Steeve J.', what: 'a importé le relevé bancaire de septembre', when: '18 sept.' },
      { who: 'Fatou N. (cabinet)', what: 'a consulté le journal des ventes', when: '16 sept.' },
      { who: 'Jean-Paul M.', what: "a verrouillé la période d'août 2026", when: '4 sept. à 17:42' },
    ],
  };
}
