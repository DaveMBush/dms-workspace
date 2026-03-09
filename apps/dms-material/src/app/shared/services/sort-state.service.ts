import { Injectable } from '@angular/core';

interface SortConfig {
  field: string;
  order: 'asc' | 'desc';
}

@Injectable({ providedIn: 'root' })
export class SortStateService {
  private readonly STORAGE_KEY = 'dms-sort-state';

  saveSortState(table: string, config: SortConfig): void {
    const state = this.loadAllState();
    state[table] = config;
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(state));
  }

  loadSortState(table: string): SortConfig | null {
    const state = this.loadAllState();
    return state[table] ?? null;
  }

  clearSortState(table: string): void {
    const state = this.loadAllState();
    delete state[table];
    if (Object.keys(state).length === 0) {
      localStorage.removeItem(this.STORAGE_KEY);
    } else {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(state));
    }
  }

  private loadAllState(): Record<string, SortConfig> {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? (JSON.parse(stored) as Record<string, SortConfig>) : {};
    } catch {
      return {};
    }
  }
}
