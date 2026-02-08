import { computed, effect, Injectable, signal } from '@angular/core';

import { selectUniverses } from '../../../store/universe/selectors/select-universes.function';
import { Universe } from '../../../store/universe/universe.interface';

/**
 * Service for managing universe data operations.
 * Provides cached universe data from SmartNgRX store to handle temporary empty states.
 */
@Injectable({
  providedIn: 'root',
})
export class UniverseService {
  // Private writable signal for cached data
  private readonly cachedUniverses = signal<Universe[]>([]);

  constructor() {
    // Cache non-empty universes to handle SmartNgRX temporary empty states during recalculation
    effect(
      // eslint-disable-next-line @smarttools/no-anonymous-functions -- Required for effect
      () => {
        const universes = selectUniverses();

        // SmartNgRX returns a Proxy that behaves like an array
        // Check length property directly (don't use Array.isArray() on Proxies)
        if (universes && universes.length > 0) {
          // Convert to actual array and cache
          const universesArray = [] as Universe[];
          for (let i = 0; i < universes.length; i++) {
            universesArray.push(universes[i]);
          }
          this.cachedUniverses.set(universesArray);
        }
      }
    );
  }

  /**
   * Computed signal that provides universes from SmartNgRX store.
   * Uses cached data when SmartNgRX temporarily returns empty (during state recalculation).
   */
  // eslint-disable-next-line @smarttools/no-anonymous-functions -- Arrow function required for proper 'this' binding in computed signal
  universes = computed(() => {
    // Read selectUniverses() to establish dependency and trigger updates
    const current = selectUniverses();
    const cached = this.cachedUniverses();

    // SmartNgRX returns a Proxy - check .length property directly
    if (current && current.length > 0) {
      return cached;
    }

    // Return cache when SmartNgRX returns empty
    return cached;
  });
}
