/**
 * Petits utilitaires de montants, sans dépendance Angular (testables seuls).
 * Le FCFA n'a pas de centimes, mais on arrondit quand même au centième pour
 * qu'une somme comme 0,1 + 0,2 ne fasse jamais échouer une comparaison
 * « débit = crédit » à cause des flottants.
 */
export function roundMoney(value: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
}

/** Montant exploitable : un nombre fini strictement positif, sinon 0 (vide, NaN, négatif). */
export function positiveAmount(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function sumMoney(values: readonly number[]): number {
  return roundMoney(values.reduce((total, v) => total + (Number(v) || 0), 0));
}
