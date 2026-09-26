import { CHART_OF_ACCOUNTS } from './entry-wizard-data';
import { LettrageLine, TiersOption } from './models';

/**
 * Les tiers du lettrage sont les comptes de tiers du plan de comptes utilisé
 * pour la saisie d'écriture : une écriture saisie sur 411002 dans le parcours 2
 * concerne donc bien le même tiers que celui qu'on lettre ici.
 */
export function buildTiers(): TiersOption[] {
  return CHART_OF_ACCOUNTS.filter((a) => a.kind === 'tiers-client' || a.kind === 'tiers-fournisseur').map((a) => ({
    id: a.code,
    code: a.code,
    name: a.label,
    kind: a.kind === 'tiers-client' ? 'client' : 'fournisseur',
  }));
}

type Seed = Omit<LettrageLine, 'restant'>;

const SEEDS: Seed[] = [
  // 411002 — Le Bon Prix : de quoi tester un lettrage exact (F-0142 + F-0158 = RG-0087)
  // et un lettrage partiel (les mêmes factures contre RG-0091, 50 000 restent).
  { id: 'lp-f1', tiersId: '411002', side: 'facture', nature: 'Facture', date: '2026-08-12', reference: 'F-2026-0142', libelle: 'Livraison rayon boissons, août', montant: 150000 },
  { id: 'lp-f2', tiersId: '411002', side: 'facture', nature: 'Facture', date: '2026-08-28', reference: 'F-2026-0158', libelle: 'Livraison produits frais', montant: 100000 },
  { id: 'lp-f3', tiersId: '411002', side: 'facture', nature: 'Facture', date: '2026-09-09', reference: 'F-2026-0171', libelle: 'Livraison hebdomadaire S36', montant: 320000 },
  { id: 'lp-f4', tiersId: '411002', side: 'facture', nature: 'Facture', date: '2026-09-18', reference: 'F-2026-0183', libelle: 'Livraison hebdomadaire S38', montant: 90000 },
  { id: 'lp-p1', tiersId: '411002', side: 'paiement', nature: 'Règlement', date: '2026-09-05', reference: 'RG-0087', libelle: 'Virement Le Bon Prix', montant: 250000 },
  { id: 'lp-p2', tiersId: '411002', side: 'paiement', nature: 'Règlement', date: '2026-09-19', reference: 'RG-0091', libelle: 'Chèque n° 004521', montant: 200000 },
  { id: 'lp-p3', tiersId: '411002', side: 'paiement', nature: 'Avoir', date: '2026-09-10', reference: 'AV-0012', libelle: 'Avoir sur retour de marchandises', montant: 40000 },

  // 411001 — un règlement supérieur à la facture : le reste est un trop-perçu.
  { id: 'lk-f1', tiersId: '411001', side: 'facture', nature: 'Facture', date: '2026-09-02', reference: 'F-2026-0120', libelle: 'Prestation de transport', montant: 90000 },
  { id: 'lk-p1', tiersId: '411001', side: 'paiement', nature: 'Règlement', date: '2026-09-12', reference: 'RG-0079', libelle: 'Virement reçu', montant: 120000 },

  // 401170 — un fournisseur : les « factures » sont des dettes, les « paiements » des règlements émis.
  { id: 'bw-f1', tiersId: '401170', side: 'facture', nature: 'Facture', date: '2026-08-20', reference: 'FA-2026-311', libelle: 'Achat de boissons, août', montant: 400000 },
  { id: 'bw-f2', tiersId: '401170', side: 'facture', nature: 'Facture', date: '2026-09-03', reference: 'FA-2026-327', libelle: 'Achat de boissons, septembre', montant: 260000 },
  { id: 'bw-f3', tiersId: '401170', side: 'facture', nature: 'Facture', date: '2026-09-15', reference: 'FA-2026-340', libelle: 'Consignes et emballages', montant: 180000 },
  { id: 'bw-p1', tiersId: '401170', side: 'paiement', nature: 'Règlement', date: '2026-09-10', reference: 'RG-F-0044', libelle: 'Virement fournisseur', montant: 400000 },
  { id: 'bw-p2', tiersId: '401170', side: 'paiement', nature: 'Règlement', date: '2026-09-20', reference: 'RG-F-0047', libelle: 'Acompte fournisseur', montant: 100000 },

  // 401169 — volontairement sans aucune ligne : sert à vérifier l'état vide.
];

/** Copie neuve à chaque appel : le store modifie les `restant`, jamais la source. */
export function initialLettrageLines(): LettrageLine[] {
  return SEEDS.map((s) => ({ ...s, restant: s.montant }));
}
