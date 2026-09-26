import { Component, inject } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { EntryWizardStore } from '../../core/entry-wizard-store';
import { Icon } from '../../shared/icon/icon';

@Component({
  selector: 'app-entry-step-info',
  imports: [ReactiveFormsModule, Icon],
  templateUrl: './entry-step-info.html',
  styleUrl: './entry-step-info.css',
})
export class EntryStepInfo {
  protected readonly store = inject(EntryWizardStore);
  protected readonly group = this.store.informations;

  protected onFileChange(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    this.group.controls.piece.setValue(file?.name ?? '');
  }

  protected clearFile(input: HTMLInputElement) {
    input.value = '';
    this.group.controls.piece.setValue('');
  }

  protected focusDate() {
    document.getElementById('date-comptable')?.focus();
  }
}
