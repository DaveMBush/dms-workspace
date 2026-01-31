import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

import { SymbolOption } from '../components/symbol-autocomplete/symbol-option.interface';

interface CacheEntry {
  data: SymbolOption[];
  timestamp: number;
}

@Injectable({
  providedIn: 'root',
})
export class SymbolSearchService {
  private http = inject(HttpClient);
  private readonly maxResults = 10;
  private readonly cacheDurationMs = 5 * 60 * 1000; // 5 minutes

  private cache = new Map<string, CacheEntry>();

  searchSymbols(query: string): Observable<SymbolOption[]> {
    if (!query || query.trim().length === 0) {
      return of([]);
    }

    const trimmedQuery = query.trim();

    // Check cache
    const cached = this.getFromCache(trimmedQuery);
    if (cached) {
      return of(cached);
    }

    const params = new HttpParams().set('query', trimmedQuery);

    return this.http.get<SymbolOption[]>('/api/symbol/search', { params });
  }

  private filterAndLimitResults(results: SymbolOption[]): SymbolOption[] {
    if (!Array.isArray(results)) {
      return [];
    }

    return results
      .filter(function filterValidSymbol(result: SymbolOption): boolean {
        return Boolean(result.symbol && result.symbol.length > 0);
      })
      .slice(0, this.maxResults);
  }

  private getFromCache(query: string): SymbolOption[] | null {
    const entry = this.cache.get(query);
    if (!entry) {
      return null;
    }

    const now = Date.now();
    if (now - entry.timestamp > this.cacheDurationMs) {
      this.cache.delete(query);
      return null;
    }

    return entry.data;
  }

  private setCache(query: string, data: SymbolOption[]): void {
    this.cache.set(query, {
      data,
      timestamp: Date.now(),
    });
  }
}
