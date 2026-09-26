import { Component, input } from '@angular/core';
import { EntryRow, EntryStatus } from '../../core/models';
import { FcfaPipe } from '../../core/fcfa-pipe';

const STATUS: Record<EntryStatus, { label: string; css: string }> = {
  brouillon: { label: 'Brouillon', css: 'badge badge-draft' },
  comptabilisee: { label: 'Comptabilisée', css: 'badge badge-posted' },
  verrouillee: { label: 'Verrouillée', css: 'badge badge-locked' },
};

@Component({
  selector: 'app-entries',
  imports: [FcfaPipe],
  templateUrl: './entries.html',
  styleUrl: './entries.css',
  host: { class: 'flex w-full min-w-0' },
})
export class Entries {
  readonly entries = input.required<EntryRow[]>();
  protected readonly status = STATUS;
}
