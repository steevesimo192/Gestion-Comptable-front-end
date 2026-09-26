import { Component, ElementRef, HostListener, computed, inject, signal } from '@angular/core';
import { AbstractControl, ReactiveFormsModule } from '@angular/forms';
import { EntryWizardStore } from '../../core/entry-wizard-store';
import { describeLineIssue } from '../../core/entry-logic';
import { AccountOption } from '../../core/models';
import { Icon } from '../../shared/icon/icon';
import { FcfaPipe } from '../../core/fcfa-pipe';

/** Nombre de raisons de blocage affichées avant de résumer le reste. */
const MAX_BLOCKERS_SHOWN = 4;

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
  /**
   * Position du menu des comptes. Il est en `position: fixed` : le tableau est dans un conteneur
   * `overflow-x-auto`, qui rognerait un menu positionné normalement sous la dernière ligne.
   */
  protected readonly pickerPos = signal<{ left: number; top: number | null; bottom: number | null }>({
    left: 0,
    top: 0,
    bottom: null,
  });

  protected readonly filteredAccounts = computed<AccountOption[]>(() => this.store.searchAccounts(this.accountQuery()));

  protected readonly blockers = computed(() => this.store.postBlockers().slice(0, MAX_BLOCKERS_SHOWN));
  protected readonly hiddenBlockers = computed(() => Math.max(0, this.store.postBlockers().length - MAX_BLOCKERS_SHOWN));

  /** Vert quand équilibrée, neutre tant que rien n'est saisi (pas d'alarme au premier affichage), rouge sinon. */
  protected readonly tone = computed<'ok' | 'neutral' | 'bad'>(() => {
    if (this.store.balanced()) return 'ok';
    return this.store.totalDebit() === 0 && this.store.totalCredit() === 0 ? 'neutral' : 'bad';
  });

  protected togglePicker(index: number, trigger: HTMLElement) {
    if (this.openPicker() === index) {
      this.closePicker();
      return;
    }
    const rect = trigger.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < 300 && rect.top > spaceBelow;
    this.pickerPos.set({
      left: Math.max(8, Math.min(rect.left, window.innerWidth - 296)),
      top: openUp ? null : rect.bottom + 6,
      bottom: openUp ? window.innerHeight - rect.top + 6 : null,
    });
    this.accountQuery.set('');
    this.openPicker.set(index);
  }

  protected closePicker() {
    this.openPicker.set(null);
    this.accountQuery.set('');
  }

  protected pickAccount(index: number, code: string) {
    const compte = this.lines.at(index).controls.compte;
    compte.setValue(code);
    compte.markAsTouched();
    this.closePicker();
  }

  protected accountLabel(code: string) {
    return code ? this.store.accountLabel(code) : '';
  }

  /** Explication sous une ligne invalide (le compte manquant est signalé sous le sélecteur, pas ici). */
  protected lineError(line: AbstractControl): string | null {
    if (!line.touched || !line.errors) return null;
    const issue = describeLineIssue(line.getRawValue());
    if (!issue || issue.startsWith('choisissez')) return null;
    return issue.charAt(0).toUpperCase() + issue.slice(1);
  }

  protected addLine() {
    this.store.addLine();
  }

  protected removeLine(index: number) {
    // Les index changent quand on retire une ligne : on referme le menu plutôt que de le laisser sur la mauvaise ligne.
    this.closePicker();
    this.store.removeLine(index);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (!this.host.nativeElement.contains(event.target as Node)) this.closePicker();
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    this.closePicker();
  }

  @HostListener('window:scroll')
  @HostListener('window:resize')
  onViewportChange() {
    if (this.openPicker() !== null) this.closePicker();
  }
}
