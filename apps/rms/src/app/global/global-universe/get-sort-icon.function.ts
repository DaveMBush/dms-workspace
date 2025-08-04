import { Signal } from "@angular/core";

  /**
   * Returns the appropriate sort icon class for a field
   */
  export function getSortIcon(field: string, sortCriteria: Signal<{
    field: string;
    order: number;
}[]>): string {
    const currentCriteria = sortCriteria();
    const criteria = currentCriteria.find(function findCriteria(c) {
      return c.field === field
    });
    if (!criteria) {
      return 'pi pi-sort';
    }
    return criteria.order === 1 ? 'pi pi-sort-up' : 'pi pi-sort-down';
  }
