import { Component, ElementRef, HostListener, computed, inject, signal } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { DossierWizardStore } from '../../core/dossier-wizard-store';
import { Icon } from '../../shared/icon/icon';

@Component({
  selector: 'app-wizard-step-info',
  imports: [ReactiveFormsModule, Icon],
  templateUrl: './wizard-step-info.html',
  styleUrl: './wizard-step-info.css',
})
export class WizardStepInfo {
  protected readonly store = inject(DossierWizardStore);
  protected readonly group = this.store.form.controls.informations;
  protected readonly selectedCompany = this.store.selectedCompany;

  protected readonly companyMenuOpen = signal(false);
  protected readonly companyQuery = signal('');
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly filteredCompanies = computed(() => {
    const q = this.companyQuery().trim().toLowerCase();
    if (!q) return this.store.companies;
    return this.store.companies.filter((c) => c.name.toLowerCase().includes(q));
  });

  protected pickCompany(id: string) {
    this.group.controls.entrepriseId.setValue(id);
    this.group.controls.entrepriseId.markAsTouched();
    this.companyMenuOpen.set(false);
    this.companyQuery.set('');
  }

  protected onCodeInput(value: string) {
    this.group.controls.code.setValue(value.toUpperCase());
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (!this.host.nativeElement.contains(event.target as Node)) this.companyMenuOpen.set(false);
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    this.companyMenuOpen.set(false);
  }
}
