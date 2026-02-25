import { HttpClient } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

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
    this.http
      .post<ImportApiResponse>('/api/import/fidelity', this.selectedFile)
      .subscribe({
        next: function onUploadSuccess(response: ImportApiResponse) {
          context.uploading.set(false);
          if (response.success) {
            context.success.set(true);
            context.importCount.set(response.imported);
            context.warnings.set(response.warnings);
            const result: ImportDialogResult = {
              success: true,
              imported: response.imported,
            };
            context.dialogRef.close(result);
          } else {
            context.errors.set(response.errors);
            context.warnings.set(response.warnings);
          }
        },
        error: function onUploadError(error: unknown) {
          context.uploading.set(false);
          const httpError = error as { status: number };
          if (httpError.status === 0) {
            context.errors.set([
              'Network connection error. Please check your connection and try again.',
            ]);
          } else {
            context.errors.set([
              'An error occurred during import. Please try again.',
            ]);
          }
        },
      });
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
