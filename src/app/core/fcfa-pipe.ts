import { Pipe, PipeTransform } from '@angular/core';

const NBSP = '\u00a0';
const full = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
const one = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 });

/**
 * full  : 48 250 000 FCFA
 * plain : 48 250 000
 * short : 48,3 M  (ou 850 k)
 */
@Pipe({
  name: 'fcfa',
})
export class FcfaPipe implements PipeTransform {
  transform(value: number, mode: 'full' | 'plain' | 'short' = 'full'): string {
    if (mode === 'short') {
      const abs = Math.abs(value);
      if (abs >= 1_000_000) return one.format(value / 1_000_000) + NBSP + 'M';
      if (abs >= 1_000) return full.format(value / 1_000) + NBSP + 'k';
      return full.format(value);
    }
    const text = full.format(value).replace(/\u202f/g, NBSP);
    return mode === 'plain' ? text : text + NBSP + 'FCFA';
  }
}
