import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { catchError, Observable, of } from 'rxjs';

import { SortFilterStateService } from '../../../shared/services/sort-filter-state.service';
import { Screen } from '../../../store/screen/screen.interface';
import { selectScreen } from '../../../store/screen/selectors/select-screen.function';

/**
 * Service for managing screener data refresh operations.
 * Handles communication with the backend to scrape CEF data from screener sources.
 */
@Injectable({
  providedIn: 'root',
})
export class ScreenerService {
  private readonly http = inject(HttpClient);
  private readonly sortFilterStateService = inject(SortFilterStateService);

  // Private writable signals for state management
  private readonly errorSignal$ = signal<string | null>(null);
  private readonly cachedScreens = signal<Screen[]>([]);

  // Public readonly signals for consumers
  readonly error = this.errorSignal$.asReadonly();

  constructor() {
    // Cache non-empty screens to handle SmartNgRX temporary empty states during recalculation
    effect(
      // eslint-disable-next-line @smarttools/no-anonymous-functions -- Required for effect
      () => {
        const screens = selectScreen();

        if (screens.length > 0) {
          const screenReturn = [] as Screen[];
          for (let i = 0; i < screens.length; i++) {
            const screen = screens[i];
            screenReturn.push(screen);
          }

          // Only apply default client-side sort when no user sort is active.
          // When the user sorts by a column (e.g., Symbol or RiskGroup), the server
          // returns data in the correct order — preserve that order.
          const userSort = this.sortFilterStateService.loadSortState('screens');
          if (userSort === null) {
            // Default sort: by symbol
            screenReturn.sort(function screenSort(a, b) {
              return a.symbol.localeCompare(b.symbol);
            });
          }

          this.cachedScreens.set(screenReturn);
        }
      }
    );
  }

  /**
   * Computed signal that provides sorted screens from SmartNgRX store.
   * Uses cached data when SmartNgRX temporarily returns empty (during state recalculation).
   * Screens are sorted by symbol when no user sort is active.
   */
  // eslint-disable-next-line @smarttools/no-anonymous-functions -- Arrow function required for proper 'this' binding in computed signal to access cachedScreens()
  screens = computed(() => {
    // Read selectScreen() to establish dependency and trigger updates
    const current = selectScreen();

    // Use current data if available, otherwise use cache
    if (current.length > 0) {
      return this.cachedScreens();
    }

    // Return cache when SmartNgRX returns empty
    return this.cachedScreens();
  });

  /**
   * Refresh screener data from backend.
   * Calls GET /api/screener to trigger scraping of CEF data from various sources.
   *
   * @returns Observable that completes when the refresh operation finishes
   */
  refresh(): Observable<unknown> {
    this.errorSignal$.set(null);

    function refreshCatchError(
      this: ScreenerService,
      error: unknown
    ): Observable<null> {
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
      .pipe(catchError(refreshCatchError.bind(this)));
  }
}
