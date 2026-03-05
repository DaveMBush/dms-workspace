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
  private readonly accountMonthsSignal = signal<MonthOption[]>([]);
  private readonly yearsSignal = signal<number[]>([]);
  private readonly loadingSignal = signal(false);
  private readonly errorSignal = signal<string | null>(null);

  // Public readonly signals for consumers
  readonly summary = this.summarySignal.asReadonly();
  readonly graph = this.graphSignal.asReadonly();
  readonly months = this.monthsSignal.asReadonly();
  readonly accountMonths = this.accountMonthsSignal.asReadonly();
  readonly years = this.yearsSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();

  /**
   * Fetch summary data for a given month.
   *
   * @param month - The month string (e.g., '2025-03')
   * @param onComplete - Optional callback invoked after success or error
   * @param accountId - Optional account ID for account-specific summary
   */
  fetchSummary(
    month: string,
    onComplete?: () => void,
    accountId?: string
  ): void {
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

    const params: Record<string, string> = { month };
    if (accountId !== undefined && accountId !== '') {
      params['account_id'] = accountId;
    }
    this.http.get<Summary>('/api/summary', { params }).subscribe({
      next: onSummarySuccess,
      error: onSummaryError,
    });
  }

  /**
   * Fetch graph data for a given year (defaults to current year).
   *
   * @param year - The 4-digit year to fetch graph data for (default: current year)
   * @param accountId - Optional account ID for account-specific graph
   * @param month - Optional month for account-specific graph queries
   */
  fetchGraph(year?: number, accountId?: string, month?: string): void {
    this.errorSignal.set(null);

    function onGraphSuccess(this: SummaryService, data: GraphPoint[]): void {
      this.graphSignal.set(data);
    }

    function onGraphError(this: SummaryService, err: HttpErrorResponse): void {
      this.errorSignal.set(err.message || 'Failed to fetch graph');
    }

    const params: Record<string, string> = {};
    const yearStr = (year ?? new Date().getFullYear()).toString();
    if (accountId !== undefined && accountId !== '') {
      params['year'] = yearStr;
      if (month !== undefined && month !== '') {
        params['month'] = month;
      }
      params['account_id'] = accountId;
    } else {
      params['year'] = yearStr;
      params['time_period'] = 'year';
    }

    this.http.get<GraphPoint[]>('/api/summary/graph', { params }).subscribe({
      next: onGraphSuccess.bind(this),
      error: onGraphError.bind(this),
    });
  }

  /**
   * Fetch available months for the dropdown.
   * Results are cached for global requests; account-specific requests always fetch.
   *
   * @param accountId - Optional account ID for account-specific months
   */
  fetchMonths(accountId?: string, year?: number): void {
    const hasAccountId = accountId !== undefined && accountId !== '';
    if (!hasAccountId && this.monthsCached) {
      return;
    }
    this.errorSignal.set(null);
    this.loadingSignal.set(true);

    const self = this;
    const shouldCache = !hasAccountId;

    function onMonthsSuccess(
      data: Array<{ month: string; label: string }>
    ): void {
      const mapped = data.map(function transformMonth(m: {
        month: string;
        label: string;
      }): MonthOption {
        return { label: m.label, value: m.month };
      });
      if (hasAccountId) {
        self.accountMonthsSignal.set(mapped);
      } else {
        self.monthsSignal.set(mapped);
      }
      if (shouldCache) {
        self.monthsCached = true;
      }
      self.loadingSignal.set(false);
    }

    function onMonthsError(err: HttpErrorResponse): void {
      self.errorSignal.set(err.message || 'Failed to fetch months');
      self.loadingSignal.set(false);
    }

    const params: Record<string, string> = {};
    if (hasAccountId) {
      params['account_id'] = accountId!;
    }
    if (year !== undefined) {
      params['year'] = year.toString();
    }
    this.http
      .get<Array<{ month: string; label: string }>>('/api/summary/months', {
        params,
      })
      .subscribe({
        next: onMonthsSuccess,
        error: onMonthsError,
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
