import { WritableSignal } from '@angular/core';

import { GlobalUniverseStorageService } from './global-universe-storage.service';

/**
 * Creates sorting handlers for the Global Universe component
 */
export function createSortingHandlers(
  sortCriteria: WritableSignal<Array<{ field: string; order: number }>>,
  storageService: GlobalUniverseStorageService
): {
  onSort(field: string): void;
  getSortOrder(field: string): number | null;
} {
  return {
    /**
     * Handles column sorting with multi-column support
     * Cycles through: ascending → descending → no sort (removed)
     */
    onSort: function onSort(field: string): void {
      const currentCriteria = sortCriteria();
      const existingIndex = currentCriteria.findIndex(function findCriteria(
        criteria
      ) {
        return criteria.field === field;
      });

      if (existingIndex >= 0) {
        // Field exists in sort criteria - cycle through states
        const updatedCriteria = [...currentCriteria];
        const currentOrder = updatedCriteria[existingIndex].order;

        if (currentOrder === 1) {
          // Currently ascending, change to descending
          updatedCriteria[existingIndex].order = -1;
          sortCriteria.set(updatedCriteria);
          storageService.saveSortCriteria(updatedCriteria);
        } else {
          // Currently descending, remove from sort criteria
          updatedCriteria.splice(existingIndex, 1);
          sortCriteria.set(updatedCriteria);
          storageService.saveSortCriteria(updatedCriteria);
        }
      } else {
        // Field not in sort criteria, add as ascending
        const newCriteria = [...currentCriteria, { field, order: 1 }];
        sortCriteria.set(newCriteria);
        storageService.saveSortCriteria(newCriteria);
      }
      // The computed signal will automatically re-evaluate and apply sorting
    },

    /**
     * Gets the sort order (1, 2, 3, etc.) for a field in multi-column sort
     */
    getSortOrder: function getSortOrder(field: string): number | null {
      const currentCriteria = sortCriteria();
      const index = currentCriteria.findIndex(function findCriteria(criteria) {
        return criteria.field === field;
      });

      return index >= 0 ? index + 1 : null;
    },
  };
}
