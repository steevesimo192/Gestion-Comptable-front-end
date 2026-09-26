import { Component, ElementRef, HostListener, inject, output, signal } from '@angular/core';
import { DashboardStore } from '../../core/dashboard-store';
import { Icon } from '../../shared/icon/icon';

@Component({
  selector: 'app-topbar',
  imports: [Icon],
  templateUrl: './topbar.html',
  styleUrl: './topbar.css',
  host: { class: 'sticky top-0 z-30 block bg-canvas/90 backdrop-blur' },
})
export class Topbar {
  readonly menu = output<void>();
  protected readonly store = inject(DashboardStore);
  protected readonly open = signal(false);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected pick(id: string) {
    this.store.selectDossier(id);
    this.open.set(false);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (!this.host.nativeElement.contains(event.target as Node)) this.open.set(false);
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    this.open.set(false);
  }
}
