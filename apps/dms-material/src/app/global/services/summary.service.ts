import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';

import { GraphPoint } from './graph-point.interface';
import { MonthOption } from './month-option.interface';
import { Summary } from './summary.interface';

function createDefaultSummary(): Summary {
  return {
    deposits: 0,
    dividends: 0,
    capitalGains: 0,
    equities: 0,
    income: 0,
    tax_free_income: 0,
  };
}

/**
 * Service for fetching and managing summary data.
 * Communicates with /api/summary, /api/summary/graph, /api/summary/months,
 * and /api/summary/years endpoints.
 */
@Injectable({
  providedIn: 'root',
})
export class SummaryService {
  private readonly http = inject(HttpClient);
  private summaryRequestSeq = 0;
  private monthsCached = false;
  private yearsCached = false;

  // Private writable signals for state management
  private readonly summarySignal = signal<Summary>(createDefaultSummary());
  private readonly graphSignal = signal<GraphPoint[]>([]);
  private readonly monthsSignal = signal<MonthOption[]>([]);
  private readonly yearsSignal = signal<number[]>([]);
  private readonly loadingSignal = signal(false);
  private readonly errorSignal = signal<string | null>(null);

  // Public readonly signals for consumers
  readonly summary = this.summarySignal.asReadonly();
  readonly graph = this.graphSignal.asReadonly();
  readonly months = this.monthsSignal.asReadonly();
  readonly years = this.yearsSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();

  /**
   * Fetch summary data for a given month.
   *
   * @param month - The month string (e.g., '2025-03')
   * @param onComplete - Optional callback invoked after success or error
   */
  fetchSummary(month: string, onComplete?: () => void): void {
    const requestSeq = ++this.summaryRequestSeq;
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    const self = this;

    function onSummarySuccess(data: Summary): void {
      if (requestSeq !== self.summaryRequestSeq) {
        return;
      }
      self.summarySignal.set(data);
      self.loadingSignal.set(false);
      if (onComplete) {
        onComplete();
      }
    }

    function onSummaryError(err: HttpErrorResponse): void {
      if (requestSeq !== self.summaryRequestSeq) {
        return;
      }
      self.errorSignal.set(err.message || 'Failed to fetch summary');
      self.loadingSignal.set(false);
      if (onComplete) {
        onComplete();
      }
    }

    this.http.get<Summary>('/api/summary', { params: { month } }).subscribe({
      next: onSummarySuccess,
      error: onSummaryError,
    });
  }

  /**
   * Fetch graph data for a given year (defaults to current year).
   *
   * @param year - The 4-digit year to fetch graph data for (default: current year)
   */
  fetchGraph(year?: number): void {
    this.errorSignal.set(null);
    const yearStr = (year ?? new Date().getFullYear()).toString();
    function onGraphSuccess(this: SummaryService, data: GraphPoint[]): void {
      this.graphSignal.set(data);
    }

    function onGraphError(this: SummaryService, err: HttpErrorResponse): void {
      this.errorSignal.set(err.message || 'Failed to fetch graph');
    }

    this.http
      .get<GraphPoint[]>('/api/summary/graph', {
        params: { year: yearStr, time_period: 'year' },
      })
      .subscribe({
        next: onGraphSuccess.bind(this),
        error: onGraphError.bind(this),
      });
  }

  /**
   * Fetch available months for the dropdown.
   * Results are cached; call invalidateMonthsCache() to refresh.
   */
  fetchMonths(): void {
    if (this.monthsCached) {
      return;
    }
    this.errorSignal.set(null);
    this.loadingSignal.set(true);

    function onMonthsSuccess(
      this: SummaryService,
      data: Array<{ month: string; label: string }>
    ): void {
      this.monthsSignal.set(
        data.map(function transformMonth(m: {
          month: string;
          label: string;
        }): MonthOption {
          return { label: m.label, value: m.month };
        })
      );
      this.monthsCached = true;
      this.loadingSignal.set(false);
    }

    function onMonthsError(this: SummaryService, err: HttpErrorResponse): void {
      this.errorSignal.set(err.message || 'Failed to fetch months');
      this.loadingSignal.set(false);
    }

    this.http
      .get<Array<{ month: string; label: string }>>('/api/summary/months')
      .subscribe({
        next: onMonthsSuccess.bind(this),
        error: onMonthsError.bind(this),
      });
  }

  /**
   * Invalidate the months cache so the next fetchMonths() call
   * fetches fresh data from the server.
   */
  invalidateMonthsCache(): void {
    this.monthsCached = false;
  }

  /**
   * Fetch available years from the server (years that have trade or deposit data).
   * Results are cached; call invalidateYearsCache() to refresh.
   */
  fetchYears(): void {
    if (this.yearsCached) {
      return;
    }
    this.errorSignal.set(null);

    function onYearsSuccess(this: SummaryService, data: number[]): void {
      this.yearsSignal.set(data);
      this.yearsCached = true;
    }

    function onYearsError(this: SummaryService, err: HttpErrorResponse): void {
      this.errorSignal.set(err.message || 'Failed to fetch years');
    }

    this.http.get<number[]>('/api/summary/years').subscribe({
      next: onYearsSuccess.bind(this),
      error: onYearsError.bind(this),
    });
  }

  /**
   * Invalidate the years cache so the next fetchYears() call
   * fetches fresh data from the server.
   */
  invalidateYearsCache(): void {
    this.yearsCached = false;
  }
}
