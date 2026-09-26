import { Component, ElementRef, HostListener, computed, inject, signal } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { EntryWizardStore } from '../../core/entry-wizard-store';
import { AccountOption } from '../../core/models';
import { Icon } from '../../shared/icon/icon';
import { FcfaPipe } from '../../core/fcfa-pipe';

@Component({
  selector: 'app-entry-step-lines',
  imports: [ReactiveFormsModule, Icon, FcfaPipe],
  templateUrl: './entry-step-lines.html',
  styleUrl: './entry-step-lines.css',
})
export class EntryStepLines {
  protected readonly store = inject(EntryWizardStore);
  protected readonly lines = this.store.lignes;
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Index de la ligne dont le sélecteur de compte est ouvert, ou null si aucune. */
  protected readonly openPicker = signal<number | null>(null);
  protected readonly accountQuery = signal('');

  protected readonly filteredAccounts = computed<AccountOption[]>(() => this.store.searchAccounts(this.accountQuery()));

  protected togglePicker(index: number) {
    this.openPicker.set(this.openPicker() === index ? null : index);
    this.accountQuery.set('');
  }

  protected pickAccount(index: number, code: string) {
    this.lines.at(index).get('compte')?.setValue(code);
    this.lines.at(index).get('compte')?.markAsTouched();
    this.openPicker.set(null);
    this.accountQuery.set('');
  }

  protected accountLabel(code: string) {
    return code ? this.store.accountLabel(code) : '';
  }

  protected addLine() {
    this.store.addLine();
  }

  protected removeLine(index: number) {
    this.store.removeLine(index);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (!this.host.nativeElement.contains(event.target as Node)) this.openPicker.set(null);
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    this.openPicker.set(null);
  }
}
