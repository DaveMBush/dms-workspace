import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { catchError, Observable, of, tap } from 'rxjs';

/**
 * Service for managing screener data refresh operations.
 * Handles communication with the backend to scrape CEF data from screener sources.
 *
 * NOTE: Additional methods (screens computed, updateScreener) from DMS app
 * will be added when store integration is complete.
 */
@Injectable({
  providedIn: 'root',
})
export class ScreenerService {
  private readonly http = inject(HttpClient);

  // Private writable signals for state management
  private readonly loadingSignal = signal(false);
  private readonly errorSignal$ = signal<string | null>(null);

  // Public readonly signals for consumers
  readonly loading = this.loadingSignal.asReadonly();
  readonly error = this.errorSignal$.asReadonly();

  // Note: screens computed and updateScreener methods will be added when store is integrated
  // These methods exist in DMS app but require SmartNgRX store initialization
  // Reference: apps/dms/src/app/global/screener/screener.service.ts

  /**
   * Refresh screener data from backend.
   * Calls GET /api/screener to trigger scraping of CEF data from various sources.
   *
   * @returns Observable that completes when the refresh operation finishes
   */
  refresh(): Observable<unknown> {
    this.loadingSignal.set(true);
    this.errorSignal$.set(null);

    function refreshTap(this: ScreenerService): void {
      this.loadingSignal.set(false);
    }

    function refreshCatchError(
      this: ScreenerService,
      error: unknown
    ): Observable<null> {
      this.loadingSignal.set(false);
      let errorMessage = 'Failed to refresh screener data';
      if (error instanceof HttpErrorResponse) {
        const errorBody = error.error as { message?: string };
        if (typeof errorBody.message === 'string') {
          errorMessage = errorBody.message;
        }
      }
      this.errorSignal$.set(errorMessage);
      return of(null);
    }

    return this.http
      .get('/api/screener')
      .pipe(
        tap(refreshTap.bind(this)),
        catchError(refreshCatchError.bind(this))
      );
  }

  // Note: updateScreener method will be implemented when store is integrated
  // Reference: apps/dms/src/app/global/screener/screener.service.ts
  // Signature: updateScreener(id: string, field: keyof Screen, value: boolean): void
}
