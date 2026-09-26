import { CHART_OF_ACCOUNTS } from './entry-wizard-data';
import { formatDateFr } from './lettrage-logic';
import { ParsedOperation } from './bank-logic';
import { BankAccountOption, BankStatement, CounterpartOption, TreasuryEntry } from './models';

/** Comptes de banque et de mobile money du plan de comptes (mêmes que ceux de la saisie d'écriture). */
export const BANK_ACCOUNTS: BankAccountOption[] = CHART_OF_ACCOUNTS.filter(
  (a) => a.kind === 'tresorerie' && a.code.startsWith('51'),
).map((a) => ({ id: a.code, code: a.code, label: a.label }));

/** Comptes proposés quand on crée une écriture manquante depuis le rapprochement. */
export const COUNTERPART_ACCOUNTS: CounterpartOption[] = [
  { code: '627000', label: 'Services bancaires et assimilés' },
  { code: '471000', label: "Compte d'attente (à régulariser)" },
  ...CHART_OF_ACCOUNTS.filter((a) => a.kind !== 'tresorerie').map((a) => ({ code: a.code, label: a.label })),
];

/* --------------------------------------------------------------------------
   Relevé d'exemple : septembre 2026, compte Banque ABC.
   15 opérations : 9 correspondances sûres, 2 à vérifier (même montant, deux écritures),
   4 sans écriture (frais, commission, paiement fournisseur, virement non identifié).
   -------------------------------------------------------------------------- */
export const SAMPLE_OPERATIONS: ParsedOperation[] = [
  { date: '2026-09-01', libelle: 'VIR SALAIRES AOUT', montant: -1_850_000 },
  { date: '2026-09-03', libelle: 'PRLV ENEO FACTURE', montant: -187_500 },
  { date: '2026-09-05', libelle: 'VIR SUPERMARCHE LE BON PRIX', montant: 250_000 },
  { date: '2026-09-08', libelle: 'VIR BRASSERIES DU WOURI', montant: -400_000 },
  { date: '2026-09-12', libelle: 'VIR KAMGA DISTRIBUTION', montant: 120_000 },
  { date: '2026-09-15', libelle: 'FRAIS TENUE DE COMPTE', montant: -15_000 },
  { date: '2026-09-15', libelle: 'COMMISSION VIREMENT', montant: -7_500 },
  { date: '2026-09-18', libelle: 'VIR FOURNISSEUR Y', montant: -76_000 },
  { date: '2026-09-20', libelle: 'VIR RECU REF 998 DONNEUR INCONNU', montant: 45_000 },
  { date: '2026-09-21', libelle: 'REMISE CHEQUE 004521', montant: 200_000 },
  { date: '2026-09-22', libelle: 'PRLV AXA ASSURANCES', montant: -92_000 },
  { date: '2026-09-24', libelle: 'VIR CLIENT DUPONT', montant: 310_000 },
  { date: '2026-09-25', libelle: 'VIR LOYER SEPTEMBRE', montant: -450_000 },
  { date: '2026-09-26', libelle: 'VIR CLIENT DUPONT', montant: 310_000 },
  { date: '2026-09-28', libelle: 'RETRAIT DAB', montant: -60_000 },
];

export const SAMPLE_STATEMENT = {
  compteId: '512006',
  debut: '2026-09-01',
  fin: '2026-09-30',
  soldeInitial: 11_170_000,
  soldeFinal: 9_267_000,
  fileName: 'releve-septembre-2026.csv',
};

/** Fichier CSV au format attendu : Date;Libellé;Débit;Crédit. */
export function buildCsv(operations: readonly ParsedOperation[]): string {
  const rows = operations.map((o) =>
    [formatDateFr(o.date), o.libelle, o.montant < 0 ? String(-o.montant) : '', o.montant > 0 ? String(o.montant) : ''].join(';'),
  );
  return ['Date;Libellé;Débit;Crédit', ...rows].join('\r\n');
}

export const SAMPLE_CSV = buildCsv(SAMPLE_OPERATIONS);

/* --------------------------------------------------------------------------
   Écritures de trésorerie déjà saisies dans la comptabilité (compte 512006).
   Les références RG-0087 et RG-0091 sont celles du lettrage (parcours 3).
   -------------------------------------------------------------------------- */
export const SEED_ENTRIES: TreasuryEntry[] = [
  { id: 'ea-1', compteId: '512006', date: '2026-08-05', reference: 'RG-0071', libelle: 'Règlement Le Bon Prix', montant: 500_000 },
  { id: 'ea-2', compteId: '512006', date: '2026-08-12', reference: 'BQ-0912', libelle: 'Loyer août', montant: -300_000 },

  { id: 'es-1', compteId: '512006', date: '2026-09-01', reference: 'BQ-0921', libelle: "Paie du mois d'août", montant: -1_850_000 },
  { id: 'es-2', compteId: '512006', date: '2026-09-03', reference: 'BQ-0922', libelle: 'Facture électricité ENEO', montant: -187_500 },
  { id: 'es-3', compteId: '512006', date: '2026-09-05', reference: 'RG-0087', libelle: 'Règlement Le Bon Prix', montant: 250_000 },
  { id: 'es-4', compteId: '512006', date: '2026-09-10', reference: 'BQ-0923', libelle: 'Règlement Brasseries du Wouri', montant: -400_000 },
  { id: 'es-5', compteId: '512006', date: '2026-09-12', reference: 'RG-0079', libelle: 'Règlement Kamga Distribution', montant: 120_000 },
  { id: 'es-6', compteId: '512006', date: '2026-09-19', reference: 'RG-0091', libelle: 'Chèque n°004521 Le Bon Prix', montant: 200_000 },
  { id: 'es-7', compteId: '512006', date: '2026-09-22', reference: 'BQ-0925', libelle: 'Prime assurance AXA', montant: -92_000 },
  { id: 'es-8', compteId: '512006', date: '2026-09-24', reference: 'F-2026-0201', libelle: 'Encaissement Dupont F-2026-0201', montant: 310_000 },
  { id: 'es-9', compteId: '512006', date: '2026-09-26', reference: 'F-2026-0207', libelle: 'Encaissement Dupont F-2026-0207', montant: 310_000 },
  { id: 'es-10', compteId: '512006', date: '2026-09-25', reference: 'BQ-0927', libelle: 'Loyer septembre', montant: -450_000 },
  { id: 'es-11', compteId: '512006', date: '2026-09-27', reference: 'CA-0104', libelle: 'Retrait espèces pour la caisse', montant: -60_000 },
];

/**
 * Relevé d'août déjà clôturé : il montre le statut « clôturé » dans la liste et une
 * opération restée « à investiguer », visible au cycle suivant.
 */
export const SEED_STATEMENTS: BankStatement[] = [
  {
    id: 'rel-1',
    compteId: '512006',
    debut: '2026-08-01',
    fin: '2026-08-31',
    soldeInitial: 11_000_000,
    soldeFinal: 11_170_000,
    operations: [
      {
        id: 'rel-1-o1',
        date: '2026-08-05',
        libelle: 'VIR SUPERMARCHE LE BON PRIX',
        montant: 500_000,
        statut: 'rapprochee',
        mode: 'auto',
        entryIds: ['ea-1'],
        note: '',
        createdEntryId: null,
      },
      {
        id: 'rel-1-o2',
        date: '2026-08-12',
        libelle: 'PRLV LOYER AOUT',
        montant: -300_000,
        statut: 'rapprochee',
        mode: 'auto',
        entryIds: ['ea-2'],
        note: '',
        createdEntryId: null,
      },
      {
        id: 'rel-1-o3',
        date: '2026-08-29',
        libelle: 'VIR M NGONO',
        montant: -30_000,
        statut: 'a-investiguer',
        mode: null,
        entryIds: [],
        note: 'Bénéficiaire non identifié : demander le justificatif à la banque.',
        createdEntryId: null,
      },
    ],
    rejected: [],
    statut: 'cloture',
    creeLe: '2026-09-01',
    clotureLe: '2026-09-02',
  },
];
