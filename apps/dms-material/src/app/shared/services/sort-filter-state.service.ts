import { Injectable } from '@angular/core';

import { FilterConfig } from './filter-config.interface';
import { SortConfig } from './sort-config.interface';
import { TableState } from './table-state.interface';

@Injectable({ providedIn: 'root' })
export class SortFilterStateService {
  private readonly storageKey = 'dms-sort-filter-state';

  saveSortState(table: string, config: SortConfig): void {
    const state = this.loadAllState();
    if (state[table] === undefined) {
      state[table] = {};
    }
    state[table].sort = config;
    localStorage.setItem(this.storageKey, JSON.stringify(state));
  }

  loadSortState(table: string): SortConfig | null {
    const state = this.loadAllState();
    return state[table]?.sort ?? null;
  }

  clearSortState(table: string): void {
    const state = this.loadAllState();
    if (state[table] !== undefined) {
      state[table] = { filters: state[table].filters };
      if (state[table].filters === undefined) {
        this.saveState(this.removeTableEntry(state, table));
        return;
      }
    }
    this.saveState(state);
  }

  saveFilterState(table: string, filters: FilterConfig): void {
    const state = this.loadAllState();
    if (state[table] === undefined) {
      state[table] = {};
    }
    state[table].filters = filters;
    localStorage.setItem(this.storageKey, JSON.stringify(state));
  }

  loadFilterState(table: string): FilterConfig | null {
    const state = this.loadAllState();
    return state[table]?.filters ?? null;
  }

  clearFilterState(table: string): void {
    const state = this.loadAllState();
    if (state[table] !== undefined) {
      state[table] = { sort: state[table].sort };
      if (state[table].sort === undefined) {
        this.saveState(this.removeTableEntry(state, table));
        return;
      }
    }
    this.saveState(state);
  }

  loadAllSortFilterState(): Record<string, TableState> {
    return this.loadAllState();
  }

  private removeTableEntry(
    state: Record<string, TableState>,
    table: string
  ): Record<string, TableState> {
    const result: Record<string, TableState> = {};
    for (const key of Object.keys(state)) {
      if (key !== table) {
        result[key] = state[key];
      }
    }
    return result;
  }

  private saveState(state: Record<string, TableState>): void {
    if (Object.keys(state).length === 0) {
      localStorage.removeItem(this.storageKey);
    } else {
      localStorage.setItem(this.storageKey, JSON.stringify(state));
    }
  }

  private loadAllState(): Record<string, TableState> {
    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored !== null
        ? (JSON.parse(stored) as Record<string, TableState>)
        : {};
    } catch {
      return {};
    }
  }
}
