import { Component, input } from '@angular/core';
import { AuditItem } from '../../core/models';

@Component({
  selector: 'app-audit',
  imports: [],
  templateUrl: './audit.html',
  styleUrl: './audit.css',
  host: { class: 'flex w-full min-w-0' },
})
export class Audit {
  readonly items = input.required<AuditItem[]>();
}
