import { Component, computed, inject, signal } from '@angular/core';
import { ImportField, formatFcfa, formatSignedFcfa } from '../../core/bank-logic';
import { SAMPLE_CSV } from '../../core/bank-data';
import { BankReconciliationStore, ManualRow } from '../../core/bank-store';
import { downloadText, readTextFile } from '../../core/download';
import { formatDateFr } from '../../core/lettrage-logic';
import { Icon } from '../../shared/icon/icon';

const MAX_FILE_BYTES = 2_000_000;

@Component({
  selector: 'app-bank-step-import',
  imports: [Icon],
  templateUrl: './bank-step-import.html',
  styleUrl: './bank-step-import.css',
})
export class BankStepImport {
  protected readonly store = inject(BankReconciliationStore);

  protected readonly dragging = signal(false);
  protected readonly reading = signal(false);

  protected readonly fmt = formatFcfa;
  protected readonly fmtSigned = formatSignedFcfa;
  protected readonly date = formatDateFr;

  protected readonly check = this.store.importCheck;
  protected readonly preview = computed(() => this.store.fileOps().slice(0, 5));
  protected readonly hiddenCount = computed(() => Math.max(0, this.store.fileOps().length - 5));
  protected readonly showControl = computed(
    () => this.store.importOps().length > 0 && this.check().soldeInitial !== null && this.check().soldeFinal !== null,
  );

  /** Une erreur de champ n'apparaît qu'après une tentative d'import : pas de rouge pendant la saisie. */
  protected fieldError(field: ImportField): string | null {
    return this.store.touched() ? (this.check().fieldErrors[field] ?? null) : null;
  }

  protected manualError(row: ManualRow): string | null {
    return this.store.touched() ? (this.store.manualErrors().get(row.id) ?? null) : null;
  }

  protected onField(field: ImportField, event: Event) {
    this.store.setField(field, (event.target as HTMLInputElement | HTMLSelectElement).value);
  }

  protected onRow(id: number, field: 'date' | 'libelle' | 'sortie' | 'entree', event: Event) {
    this.store.updateManualRow(id, { [field]: (event.target as HTMLInputElement).value } as Partial<Omit<ManualRow, 'id'>>);
  }

  protected async onFileChosen(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (file) await this.readFile(file);
  }

  protected onDragOver(event: DragEvent) {
    event.preventDefault();
    this.dragging.set(true);
  }

  protected onDragLeave() {
    this.dragging.set(false);
  }

  protected async onDrop(event: DragEvent) {
    event.preventDefault();
    this.dragging.set(false);
    const file = event.dataTransfer?.files?.[0];
    if (file) await this.readFile(file);
  }

  protected downloadTemplate() {
    downloadText('modele-releve-bancaire.csv', SAMPLE_CSV);
  }

  private async readFile(file: File) {
    if (file.size > MAX_FILE_BYTES) {
      this.store.failFile(file.name, 'Ce fichier est trop volumineux (2 Mo maximum) : découpez-le par période.');
      return;
    }
    this.reading.set(true);
    try {
      this.store.loadCsv(file.name, await readTextFile(file));
    } catch {
      this.store.failFile(file.name, 'Ce fichier n’a pas pu être lu. Vérifiez qu’il s’agit bien d’un fichier texte (.csv).');
    } finally {
      this.reading.set(false);
    }
  }
}
