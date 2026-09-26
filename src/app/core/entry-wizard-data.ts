import { AccountOption, JournalOption } from './models';

/** Mêmes journaux que ceux déjà utilisés dans l'activité récente du tableau de bord. */
export const JOURNALS: JournalOption[] = [
  { id: 'ventes', label: 'Ventes' },
  { id: 'achats', label: 'Achats' },
  { id: 'banque', label: 'Banque' },
  { id: 'caisse', label: 'Caisse' },
  { id: 'od', label: 'Opérations diverses' },
];

/** Extrait du plan de comptes SYSCOHADA généré pour la démonstration. */
export const CHART_OF_ACCOUNTS: AccountOption[] = [
  { code: '512006', label: 'Banque ABC', kind: 'tresorerie' },
  { code: '514000', label: 'Mobile money', kind: 'tresorerie' },
  { code: '571000', label: 'Caisse', kind: 'tresorerie' },
  { code: '411001', label: 'Client Kamga Distribution', kind: 'tiers-client' },
  { code: '411002', label: 'Client Supermarché Le Bon Prix', kind: 'tiers-client' },
  { code: '401169', label: 'Fournisseur X', kind: 'tiers-fournisseur' },
  { code: '401170', label: 'Fournisseur Brasseries du Wouri', kind: 'tiers-fournisseur' },
  { code: '601000', label: 'Achats de marchandises', kind: 'charge' },
  { code: '613000', label: 'Locations', kind: 'charge' },
  { code: '622000', label: "Rémunérations d'intermédiaires", kind: 'charge' },
  { code: '628100', label: 'Frais de télécommunications', kind: 'charge' },
  { code: '706000', label: 'Ventes de marchandises', kind: 'produit' },
  { code: '445660', label: 'TVA déductible', kind: 'tva' },
  { code: '443300', label: 'TVA collectée', kind: 'tva' },
];

/**
 * Mois déjà clôturés dans ce dossier de démonstration (format AAAA-MM).
 * Août 2026 correspond aux écritures « verrouillée » déjà visibles dans
 * l'activité récente du tableau de bord.
 */
export const LOCKED_MONTHS = ['2026-08'];
