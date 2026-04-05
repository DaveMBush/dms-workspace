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
        // Check length property directly — do NOT iterate the proxy here;
        // iterating all indices would dispatch loadByIndexes for ALL unloaded
        // rows, causing a bulk network request.
        if (
          universes !== null &&
          universes !== undefined &&
          universes.length > 0
        ) {
          // Store the proxy reference directly — no iteration, no bulk fetch
          this.cachedUniverses.set(universes);
        }
      }
    );
  }

  /**
   * Computed signal that provides universes from SmartNgRX store.
   * Returns the ArrayProxy directly so CDK virtual scroll and enrichment
   * functions access only the indices they need (lazy loading).
   * Uses cached proxy when SmartNgRX temporarily returns empty.
   */
  // eslint-disable-next-line @smarttools/no-anonymous-functions -- Arrow function required for proper 'this' binding in computed signal
  universes = computed(() => {
    // Read selectUniverses() to establish reactive dependency
    const current = selectUniverses();

    if (current !== null && current !== undefined && current.length > 0) {
      // Return the proxy directly — never iterate all items; CDK virtual
      // scroll will access only visible indices via the ArrayProxy,
      // letting SmartNgRX load only the required pages.
      return current;
    }

    // Return cached proxy when SmartNgRX returns empty (during state recalculation)
    return this.cachedUniverses();
  });
}
