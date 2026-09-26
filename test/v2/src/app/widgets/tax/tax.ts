import { Component, computed, input } from '@angular/core';
import { TaxInfo } from '../../core/models';
import { FcfaPipe } from '../../core/fcfa-pipe';

@Component({
  selector: 'app-tax',
  imports: [FcfaPipe],
  templateUrl: './tax.html',
  styleUrl: './tax.css',
})
export class Tax {
  readonly tax = input.required<TaxInfo>();
  protected readonly due = computed(() => this.tax().collected - this.tax().deductible);
}
