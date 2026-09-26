import { Component, inject, output } from '@angular/core';
import { EntryWizardStore } from '../../core/entry-wizard-store';
import { Icon } from '../../shared/icon/icon';
import { FcfaPipe } from '../../core/fcfa-pipe';

@Component({
  selector: 'app-entry-step-confirm',
  imports: [Icon, FcfaPipe],
  templateUrl: './entry-step-confirm.html',
  styleUrl: './entry-step-confirm.css',
})
export class EntryStepConfirm {
  protected readonly store = inject(EntryWizardStore);
  readonly cancelled = output<void>();
  readonly confirmed = output<void>();
}
