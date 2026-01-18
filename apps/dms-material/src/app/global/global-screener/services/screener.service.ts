import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { catchError, Observable, of, tap } from 'rxjs';

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

  // Private writable signals for state management
  private readonly loadingSignal = signal(false);
  private readonly errorSignal$ = signal<string | null>(null);
  private readonly cachedScreens = signal<Screen[]>([]);

  // Public readonly signals for consumers
  readonly loading = this.loadingSignal.asReadonly();
  readonly error = this.errorSignal$.asReadonly();

  constructor() {
    // Cache non-empty screens to handle SmartNgRX temporary empty states during recalculation
    effect(
      // eslint-disable-next-line @smarttools/no-anonymous-functions -- Required for effect
      () => {
        const screens = selectScreen();

        if (screens.length > 0) {
          // Sort and cache when we have data
          const screenReturn = [] as Screen[];
          for (let i = 0; i < screens.length; i++) {
            const screen = screens[i];
            screenReturn.push(screen);
          }
          // Sort by completion status (complete ones to bottom), then by symbol
          screenReturn.sort(function screenSort(a, b) {
            const aScore =
              (a.graph_higher_before_2008 &&
              a.has_volitility &&
              a.objectives_understood
                ? 'z'
                : 'a') + a.symbol;
            const bScore =
              (b.graph_higher_before_2008 &&
              b.has_volitility &&
              b.objectives_understood
                ? 'z'
                : 'a') + b.symbol;

            return aScore.localeCompare(bScore);
          });

          this.cachedScreens.set(screenReturn);
        }
      }
    );
  }

  /**
   * Computed signal that provides sorted screens from SmartNgRX store.
   * Uses cached data when SmartNgRX temporarily returns empty (during state recalculation).
   * Screens are sorted by completion status (complete ones to bottom), then by symbol.
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

  /**
   * Update a screen field in the store.
   *
   * @param id - The screen id to update
   * @param field - The field to update
   * @param value - The new value
   */
  updateScreener(id: string, field: keyof Screen, value: boolean): void {
    const screens = selectScreen();
    for (let i = 0; i < screens.length; i++) {
      const screen = screens[i] as unknown as Record<
        keyof Screen,
        boolean | string
      >;
      if (screen.id === id) {
        screen[field] = value;
        break;
      }
    }
  }
}
