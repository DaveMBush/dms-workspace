import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { defer, finalize, Observable, tap } from 'rxjs';

import { AuditResult } from './audit-result.interface';
import { CusipCacheEntry } from './cusip-cache-entry.interface';
import { CusipCacheSource } from './cusip-cache-source.type';
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

  private readonly loadingCountSignal = signal(0);
  private readonly errorSignal = signal<string | null>(null);

  readonly stats = this.statsSignal.asReadonly();
  readonly searchResults = this.searchResultsSignal.asReadonly();
  readonly auditEntries = this.auditEntriesSignal.asReadonly();
  readonly loading = computed(this.isLoading.bind(this));
  readonly error = this.errorSignal.asReadonly();

  fetchStats(): void {
    this.loadingCountSignal.update(function increment(c) {
      return c + 1;
    });
    this.errorSignal.set(null);
    const self = this;
    this.http.get<CusipCacheStats>(`${this.baseUrl}/stats`).subscribe({
      next: function onStatsSuccess(data) {
        self.statsSignal.set(data);
        self.loadingCountSignal.update(function decrement(c) {
          return c - 1;
        });
      },
      error: function onStatsError(err: unknown) {
        self.errorSignal.set(formatHttpError(err));
        self.loadingCountSignal.update(function decrement(c) {
          return c - 1;
        });
      },
    });
  }

  search(cusip?: string, symbol?: string): void {
    this.loadingCountSignal.update(function increment(c) {
      return c + 1;
    });
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
          self.loadingCountSignal.update(function decrement(c) {
            return c - 1;
          });
        },
        error: function onSearchError(err: unknown) {
          self.errorSignal.set(formatHttpError(err));
          self.loadingCountSignal.update(function decrement(c) {
            return c - 1;
          });
        },
      });
  }

  clearSearch(): void {
    this.searchResultsSignal.set([]);
  }

  addMapping(
    cusip: string,
    symbol: string,
    source: CusipCacheSource,
    reason?: string
  ): Observable<CusipCacheEntry> {
    const self = this;
    return defer(function deferAdd() {
      self.loadingCountSignal.update(function increment(c) {
        return c + 1;
      });
      self.errorSignal.set(null);
      return self.http.post<CusipCacheEntry>(`${self.baseUrl}/add`, {
        cusip,
        symbol,
        source,
        reason,
      });
    }).pipe(
      tap({
        error: function onAddError(err: unknown) {
          self.errorSignal.set(formatHttpError(err));
        },
      }),
      finalize(function onAddFinalize() {
        self.loadingCountSignal.update(function decrement(c) {
          return c - 1;
        });
      })
    );
  }

  deleteMapping(id: string): Observable<unknown> {
    const self = this;
    return defer(function deferDelete() {
      self.loadingCountSignal.update(function increment(c) {
        return c + 1;
      });
      self.errorSignal.set(null);
      return self.http.delete(`${self.baseUrl}/${id}`);
    }).pipe(
      tap({
        error: function onDeleteError(err: unknown) {
          self.errorSignal.set(formatHttpError(err));
        },
      }),
      finalize(function onDeleteFinalize() {
        self.loadingCountSignal.update(function decrement(c) {
          return c - 1;
        });
      })
    );
  }

  fetchAuditLog(limit = 20): void {
    this.loadingCountSignal.update(function increment(c) {
      return c + 1;
    });
    this.errorSignal.set(null);
    const self = this;
    this.http
      .get<AuditResult>(`${this.baseUrl}/audit`, {
        params: { limit: limit.toString() },
      })
      .subscribe({
        next: function onAuditSuccess(data) {
          self.auditEntriesSignal.set(data);
          self.loadingCountSignal.update(function decrement(c) {
            return c - 1;
          });
        },
        error: function onAuditError(err: unknown) {
          self.errorSignal.set(formatHttpError(err));
          self.loadingCountSignal.update(function decrement(c) {
            return c - 1;
          });
        },
      });
  }

  private isLoading(): boolean {
    return this.loadingCountSignal() > 0;
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
