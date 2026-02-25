import { HttpClient } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { from, switchMap } from 'rxjs';

import { ImportDialogData } from './import-dialog-data.interface';
import { ImportDialogResult } from './import-dialog-result.interface';

interface ImportApiResponse {
  success: boolean;
  imported: number;
  errors: string[];
  warnings: string[];
}

@Component({
  selector: 'dms-import-fidelity-dialog',
  imports: [
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './import-dialog.component.html',
  styleUrl: './import-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImportDialogComponent {
  readonly data = inject<ImportDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<ImportDialogComponent>);
  private readonly http = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);

  selectedFile: File | null = null;
  readonly uploading = signal(false);
  readonly success = signal(false);
  readonly importCount = signal(0);
  readonly errors = signal<string[]>([]);
  readonly warnings = signal<string[]>([]);

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    if (!files || files.length === 0) {
      this.selectedFile = null;
      return;
    }
    const file = files[0];
    if (!file.name.toLowerCase().endsWith('.csv')) {
      this.selectedFile = null;
      return;
    }
    this.selectedFile = file;
  }

  get isUploadDisabled(): boolean {
    return !this.selectedFile || this.uploading();
  }

  onUpload(): void {
    if (!this.selectedFile) {
      return;
    }

    this.uploading.set(true);
    this.errors.set([]);
    this.warnings.set([]);
    this.success.set(false);

    const context = this;
    from(this.selectedFile.text())
      .pipe(
        switchMap(function sendCsvToServer(csvContent: string) {
          return context.http.post<ImportApiResponse>(
            '/api/import/fidelity',
            csvContent,
            { headers: { 'Content-Type': 'text/plain' } }
          );
        }),
        takeUntilDestroyed(context.destroyRef)
      )
      .subscribe({
        next: function onUploadSuccess(response: ImportApiResponse) {
          context.handleUploadSuccess(response);
        },
        error: function onUploadError(error: unknown) {
          context.handleUploadError(error);
        },
      });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  private handleUploadSuccess(response: ImportApiResponse): void {
    this.uploading.set(false);
    if (response.success) {
      this.success.set(true);
      this.importCount.set(response.imported);
      this.warnings.set(response.warnings);
      const result: ImportDialogResult = {
        success: true,
        imported: response.imported,
      };
      this.dialogRef.close(result);
    } else {
      this.errors.set(response.errors);
      this.warnings.set(response.warnings);
    }
  }

  private handleUploadError(error: unknown): void {
    this.uploading.set(false);
    const httpError = error as { status: number };
    if (httpError.status === 0) {
      this.errors.set([
        'Network connection error. Please check your connection and try again.',
      ]);
    } else {
      this.errors.set(['An error occurred during import. Please try again.']);
    }
  }
}
