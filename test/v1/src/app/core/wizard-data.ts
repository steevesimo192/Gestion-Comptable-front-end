import { CompanyOption, CurrencyOption, MonthOption, ReferenceFrameworkOption, TimezoneOption } from './models';

/**
 * Entreprises déjà enregistrées dans le service externe « Entreprise ».
 * Le microservice de gestion comptable ne crée pas ces entités, il les
 * référence seulement : c'est pourquoi ce champ est une recherche, pas
 * une simple saisie libre.
 */
export const COMPANIES: CompanyOption[] = [
  { id: 'kamga', name: 'Kamga Distribution SARL', sector: 'Distribution de produits alimentaires', city: 'Douala' },
  { id: 'ndongo', name: 'Boulangerie Ndongo SARL', sector: 'Boulangerie et pâtisserie', city: 'Yaoundé' },
  { id: 'sotrap', name: 'Sotrap Logistique SA', sector: 'Transport et logistique', city: 'Douala' },
  { id: 'mballa', name: 'Établissements Mballa & Fils', sector: 'Quincaillerie et matériaux', city: 'Douala' },
  { id: 'essiane', name: 'Essiane Consulting SARL', sector: 'Conseil et services aux entreprises', city: 'Yaoundé' },
  { id: 'nkolo', name: 'Ferme Avicole Nkolo', sector: 'Agriculture et élevage', city: 'Bafoussam' },
];

export const REFERENTIALS: ReferenceFrameworkOption[] = [
  {
    id: 'syscohada-revise',
    label: 'SYSCOHADA révisé',
    description: "Référentiel des 17 pays de l'espace OHADA. Recommandé pour une entreprise basée en Afrique centrale ou de l'Ouest.",
  },
  {
    id: 'ifrs',
    label: 'IFRS',
    description: "Normes internationales d'information financière. Utile pour un groupe coté ou filiale d'un groupe international.",
  },
  {
    id: 'pcg',
    label: 'Plan comptable général',
    description: 'Référentiel français, pour un dossier rattaché à une entité en France.',
  },
];

export const CURRENCIES: CurrencyOption[] = [
  { code: 'XAF', label: 'Franc CFA — BEAC (XAF)' },
  { code: 'XOF', label: 'Franc CFA — BCEAO (XOF)' },
  { code: 'EUR', label: 'Euro (EUR)' },
  { code: 'USD', label: 'Dollar américain (USD)' },
  { code: 'GBP', label: 'Livre sterling (GBP)' },
];

export const TIMEZONES: TimezoneOption[] = [
  { id: 'Africa/Douala', label: 'Afrique/Douala (UTC+1)' },
  { id: 'Africa/Abidjan', label: 'Afrique/Abidjan (UTC+0)' },
  { id: 'Europe/Paris', label: 'Europe/Paris (UTC+1, UTC+2 en été)' },
];

export const MONTHS: MonthOption[] = [
  { id: '01', label: 'Janvier' },
  { id: '02', label: 'Février' },
  { id: '03', label: 'Mars' },
  { id: '04', label: 'Avril' },
  { id: '05', label: 'Mai' },
  { id: '06', label: 'Juin' },
  { id: '07', label: 'Juillet' },
  { id: '08', label: 'Août' },
  { id: '09', label: 'Septembre' },
  { id: '10', label: 'Octobre' },
  { id: '11', label: 'Novembre' },
  { id: '12', label: 'Décembre' },
];

/** Codes de dossier déjà pris, pour simuler la validation d'unicité en temps réel. */
export const EXISTING_CODES = ['KAM-2026', 'NDG-2026', 'STP-2026', 'DEMO-01'];
