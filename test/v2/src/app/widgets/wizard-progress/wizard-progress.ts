import { Component, input, output } from '@angular/core';
import { WizardStepMeta } from '../../core/dossier-wizard-store';
import { Icon } from '../../shared/icon/icon';

@Component({
  selector: 'app-wizard-progress',
  imports: [Icon],
  templateUrl: './wizard-progress.html',
  styleUrl: './wizard-progress.css',
})
export class WizardProgress {
  readonly steps = input.required<WizardStepMeta[]>();
  readonly current = input.required<number>();
  readonly furthest = input.required<number>();
  readonly stepClick = output<number>();

  protected dotClass(index: number): string {
    if (index < this.current()) return 'border-brand-600 bg-brand-600 text-white';
    if (index === this.current()) return 'border-brand-600 bg-white text-brand-700';
    return 'border-line bg-white text-muted';
  }

  protected lineClass(index: number): string {
    return index < this.current() ? 'bg-brand-600' : 'bg-line';
  }
}
