import { HttpClient } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatToolbarModule } from '@angular/material/toolbar';

interface LogFileInfo {
  filename: string;
  displayName: string;
  size: number;
  lastModified: string;
}

@Component({
  selector: 'dms-global-error-logs',
  standalone: true,
  imports: [
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatListModule,
    MatProgressSpinnerModule,
    MatToolbarModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './global-error-logs.html',
})
export class GlobalErrorLogs {
  private readonly http = inject(HttpClient);

  readonly loading$ = signal(true);
  readonly errorMessage$ = signal('');
  readonly files$ = signal<LogFileInfo[]>([]);

  constructor() {
    this.loadFiles();
  }

  loadFiles(): void {
    const self = this;
    self.loading$.set(true);
    self.errorMessage$.set('');
    this.http
      .get<{ files: LogFileInfo[] }>('/api/logs/files')
      .subscribe({
        next: function onFilesSuccess(response) {
          self.files$.set(response.files);
          self.loading$.set(false);
        },
        error: function onFilesError() {
          self.errorMessage$.set('Failed to load error log files.');
          self.loading$.set(false);
        },
      });
  }

  deleteFile(filename: string): void {
    const self = this;
    this.http
      .delete<{ success: boolean; message: string }>(
        `/api/logs/files/${encodeURIComponent(filename)}`
      )
      .subscribe({
        next: function onDeleteSuccess() {
          self.files$.update(function removeDeleted(files) {
            return files.filter(function isNotDeleted(f) {
              return f.filename !== filename;
            });
          });
        },
        error: function onDeleteError() {
          self.errorMessage$.set(`Failed to delete file: ${filename}`);
        },
      });
  }
}
