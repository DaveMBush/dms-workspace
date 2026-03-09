import { Injectable } from '@angular/core';

interface SortConfig {
  field: string;
  order: 'asc' | 'desc';
}

@Injectable({ providedIn: 'root' })
export class SortStateService {
  saveSortState(_: string, __: SortConfig): void {
    // TDD RED: Implementation in Story AW.6
  }

  loadSortState(_: string): SortConfig | null {
    // TDD RED: Implementation in Story AW.6
    return null;
  }

  clearSortState(_: string): void {
    // TDD RED: Implementation in Story AW.6
  }
}
