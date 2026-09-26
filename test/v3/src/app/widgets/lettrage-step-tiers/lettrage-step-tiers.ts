import { Component, ElementRef, HostListener, computed, inject, signal } from '@angular/core';
import { LettrageStore } from '../../core/lettrage-store';
import { TiersKind } from '../../core/models';
import { Icon } from '../../shared/icon/icon';

@Component({
  selector: 'app-lettrage-step-tiers',
  imports: [Icon],
  templateUrl: './lettrage-step-tiers.html',
  styleUrl: './lettrage-step-tiers.css',
})
export class LettrageStepTiers {
  protected readonly store = inject(LettrageStore);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly menuOpen = signal(false);
  protected readonly query = signal('');

  /** Recherche par nom ou par numéro de compte : pas de liste déroulante brute (volume potentiel de tiers). */
  protected readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    const all = this.store.tiersSummaries();
    if (!q) return all;
    return all.filter((s) => s.tiers.name.toLowerCase().includes(q) || s.tiers.code.includes(q));
  });

  protected readonly showError = computed(() => this.store.tiersTouched() && !this.store.tiersId());

  protected kindLabel(kind: TiersKind): string {
    return kind === 'client' ? 'Client' : 'Fournisseur';
  }

  protected toggleMenu() {
    this.menuOpen.update((open) => !open);
    this.query.set('');
  }

  protected pick(id: string) {
    this.store.selectTiers(id);
    this.menuOpen.set(false);
    this.query.set('');
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (!this.host.nativeElement.contains(event.target as Node)) this.menuOpen.set(false);
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    this.menuOpen.set(false);
  }
}
