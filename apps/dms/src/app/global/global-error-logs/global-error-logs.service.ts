import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

import { ErrorHandlingService } from '../../shared/services/error-handling.service';
import { ErrorLogResponse } from './error-log-response.interface';
import { LogFileInfo } from './log-file-info.interface';
import { LogFilters } from './log-filters.interface';

@Injectable({
  providedIn: 'root',
})
export class GlobalErrorLogsService {
  private http = inject(HttpClient);
  private errorHandling = inject(ErrorHandlingService);

  logs = signal<ErrorLogResponse>({
    logs: [],
    totalCount: 0,
    currentPage: 1,
    totalPages: 0,
  });

  logFiles = signal<LogFileInfo[]>([]);
  isLoading = signal(false);
  isLoadingFiles = signal(false);
  error = signal<string | null>(null);
  currentFilters = signal<LogFilters>({
    level: null,
    dateFrom: null,
    dateTo: null,
    search: '',
    selectedFile: null,
  });

  getErrorLogs(
    page = 1,
    limit = 50,
    filters: LogFilters = {
      level: null,
      dateFrom: null,
      dateTo: null,
      search: '',
      selectedFile: null,
    }
  ): Observable<ErrorLogResponse> {
    this.isLoading.set(true);
    this.error.set(null);
    this.currentFilters.set(filters);

    const params = this.buildHttpParams(page, limit, filters);

    const context = this;
    return this.http.get<ErrorLogResponse>('/api/logs/errors', { params }).pipe(
      tap({
        next: function handleSuccess(response: ErrorLogResponse) {
          context.logs.set(response);
          context.currentFilters.set(filters);
          context.isLoading.set(false);
        },
        error: function handleError(err: unknown) {
          const errorMessage = context.errorHandling.extractErrorMessage(err);
          context.error.set(errorMessage || 'Failed to load error logs');
          context.isLoading.set(false);
        },
      })
    );
  }

  getLogFiles(): Observable<{ files: LogFileInfo[] }> {
    this.isLoadingFiles.set(true);
    this.error.set(null);

    const context = this;
    return this.http.get<{ files: LogFileInfo[] }>('/api/logs/files').pipe(
      tap({
        next: function handleSuccess(response: { files: LogFileInfo[] }) {
          context.logFiles.set(response.files);
          context.isLoadingFiles.set(false);
        },
        error: function handleError(err: unknown) {
          const errorMessage = context.errorHandling.extractErrorMessage(err);
          context.error.set(errorMessage || 'Failed to load log files');
          context.isLoadingFiles.set(false);
        },
      })
    );
  }

  deleteLogFile(
    filename: string
  ): Observable<{ success: boolean; message: string }> {
    this.error.set(null);

    const context = this;
    return this.http
      .delete<{ success: boolean; message: string }>(
        `/api/logs/files/${filename}`
      )
      .pipe(
        tap({
          next: function handleSuccess() {
            // Refresh the file list after deletion
            context.getLogFiles().subscribe();
            // If the deleted file was currently selected, clear the selection
            const currentFilters = context.currentFilters();
            if (currentFilters.selectedFile === filename) {
              context
                .getErrorLogs(1, 50, {
                  ...currentFilters,
                  selectedFile: null,
                })
                .subscribe();
            }
          },
          error: function handleError(err: unknown) {
            const error = err as { message?: string };
            const errorMessage = error?.message ?? 'Failed to delete log file';
            context.error.set(errorMessage);
          },
        })
      );
  }

  refreshLogs(): void {
    const currentLogs = this.logs();
    const filters = this.currentFilters();
    this.getErrorLogs(currentLogs.currentPage, 50, filters).subscribe();
  }

  private buildHttpParams(
    page: number,
    limit: number,
    filters: LogFilters
  ): HttpParams {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    if (filters.level !== null && filters.level !== '') {
      params = params.set('level', filters.level);
    }
    if (filters.dateFrom) {
      params = params.set('from', filters.dateFrom.toISOString());
    }
    if (filters.dateTo) {
      params = params.set('to', filters.dateTo.toISOString());
    }
    if (filters.search.trim()) {
      params = params.set('search', filters.search.trim());
    }
    if (
      filters.selectedFile !== null &&
      filters.selectedFile !== undefined &&
      filters.selectedFile !== ''
    ) {
      params = params.set('file', filters.selectedFile);
    }

    return params;
  }
}
