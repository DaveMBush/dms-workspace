import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';

import { AuditResult } from './audit-result.interface';
import { CusipCacheEntry } from './cusip-cache-entry.interface';
import { CusipCacheStats } from './cusip-cache-stats.interface';
import { SearchResult } from './search-result.interface';

@Injectable({
  providedIn: 'root',
})
export class CusipCacheAdminService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/admin/cusip-cache';
  private readonly statsSignal = signal<CusipCacheStats | null>(null);
  private readonly searchResultsSignal = signal<CusipCacheEntry[]>([]);
  private readonly auditEntriesSignal = signal<AuditResult>({
    entries: [],
    total: 0,
  });

  private readonly loadingSignal = signal(false);
  private readonly errorSignal = signal<string | null>(null);

  readonly stats = this.statsSignal.asReadonly();
  readonly searchResults = this.searchResultsSignal.asReadonly();
  readonly auditEntries = this.auditEntriesSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();

  fetchStats(): void {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);
    const self = this;
    this.http.get<CusipCacheStats>(`${this.baseUrl}/stats`).subscribe({
      next: function onStatsSuccess(data) {
        self.statsSignal.set(data);
        self.loadingSignal.set(false);
      },
      error: function onStatsError(err: unknown) {
        self.errorSignal.set(formatHttpError(err));
        self.loadingSignal.set(false);
      },
    });
  }

  search(cusip?: string, symbol?: string): void {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);
    const params: Record<string, string> = {};
    if (cusip !== undefined && cusip !== '') {
      params['cusip'] = cusip;
    }
    if (symbol !== undefined && symbol !== '') {
      params['symbol'] = symbol;
    }
    const self = this;
    this.http
      .get<SearchResult>(`${this.baseUrl}/search`, { params })
      .subscribe({
        next: function onSearchSuccess(data) {
          self.searchResultsSignal.set(data.entries);
          self.loadingSignal.set(false);
        },
        error: function onSearchError(err: unknown) {
          self.errorSignal.set(formatHttpError(err));
          self.loadingSignal.set(false);
        },
      });
  }

  clearSearch(): void {
    this.searchResultsSignal.set([]);
  }

  addMapping(
    cusip: string,
    symbol: string,
    source: string,
    reason?: string
  ): void {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);
    const self = this;
    this.http
      .post<CusipCacheEntry>(`${this.baseUrl}/add`, {
        cusip,
        symbol,
        source,
        reason,
      })
      .subscribe({
        next: function onAddSuccess() {
          self.loadingSignal.set(false);
        },
        error: function onAddError(err: unknown) {
          self.errorSignal.set(formatHttpError(err));
          self.loadingSignal.set(false);
        },
      });
  }

  deleteMapping(id: string): void {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);
    const self = this;
    this.http.delete(`${this.baseUrl}/${id}`).subscribe({
      next: function onDeleteSuccess() {
        self.loadingSignal.set(false);
      },
      error: function onDeleteError(err: unknown) {
        self.errorSignal.set(formatHttpError(err));
        self.loadingSignal.set(false);
      },
    });
  }

  fetchAuditLog(limit = 20): void {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);
    const self = this;
    this.http
      .get<AuditResult>(`${this.baseUrl}/audit`, {
        params: { limit: limit.toString() },
      })
      .subscribe({
        next: function onAuditSuccess(data) {
          self.auditEntriesSignal.set(data);
          self.loadingSignal.set(false);
        },
        error: function onAuditError(err: unknown) {
          self.errorSignal.set(formatHttpError(err));
          self.loadingSignal.set(false);
        },
      });
  }
}

function formatHttpError(err: unknown): string {
  if (typeof err !== 'object' || err === null) {
    return 'An unexpected error occurred';
  }
  const errObj = err as Record<string, unknown>;
  if (hasNestedError(errObj)) {
    return (errObj['error'] as Record<string, string>)['error'];
  }
  if ('status' in errObj && 'message' in errObj) {
    return `Server error: ${String(errObj['status'])} ${String(
      errObj['message']
    )}`;
  }
  return 'An unexpected error occurred';
}

function hasNestedError(obj: Record<string, unknown>): boolean {
  return (
    'error' in obj &&
    typeof obj['error'] === 'object' &&
    obj['error'] !== null &&
    'error' in (obj['error'] as Record<string, unknown>) &&
    typeof (obj['error'] as Record<string, unknown>)['error'] === 'string'
  );
}
