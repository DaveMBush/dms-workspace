import { Injectable } from '@angular/core';

interface SortConfig {
  field: string;
  order: 'asc' | 'desc';
}

@Injectable({ providedIn: 'root' })
export class SortStateService {
  private readonly storageKey = 'dms-sort-state';

  saveSortState(table: string, config: SortConfig): void {
    const state = this.loadAllState();
    state[table] = config;
    localStorage.setItem(this.storageKey, JSON.stringify(state));
  }

  loadSortState(table: string): SortConfig | null {
    const state = this.loadAllState();
    return state[table] ?? null;
  }

  clearSortState(table: string): void {
    const state = this.loadAllState();
    const rest = Object.fromEntries(
      Object.entries(state).filter(function keepOtherTables([key]) {
        return key !== table;
      })
    );
    if (Object.keys(rest).length === 0) {
      localStorage.removeItem(this.storageKey);
    } else {
      localStorage.setItem(this.storageKey, JSON.stringify(rest));
    }
  }

  private loadAllState(): Record<string, SortConfig> {
    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored !== null
        ? (JSON.parse(stored) as Record<string, SortConfig>)
        : {};
    } catch {
      return {};
    }
  }
}
