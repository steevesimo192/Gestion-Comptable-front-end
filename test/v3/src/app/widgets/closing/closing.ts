import { Component, computed, input } from '@angular/core';
import { ClosingInfo } from '../../core/models';
import { Icon } from '../../shared/icon/icon';

/**
 * Parcours « clôturer une période » : moment d'anxiété fort d'après le
 * user research. On montre ce qui reste à faire et on annonce clairement
 * qu'un aperçu précède tout verrouillage.
 */
@Component({
  selector: 'app-closing',
  imports: [Icon],
  templateUrl: './closing.html',
  styleUrl: './closing.css',
})
export class Closing {
  readonly closing = input.required<ClosingInfo>();
  protected readonly doneCount = computed(() => this.closing().steps.filter((s) => s.done).length);
  protected readonly remaining = computed(() => this.closing().steps.length - this.doneCount());
  protected readonly pct = computed(() => (this.doneCount() / this.closing().steps.length) * 100);
}
