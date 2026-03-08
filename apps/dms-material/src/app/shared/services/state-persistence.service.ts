import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class StatePersistenceService {
  private readonly storageKey = 'dms-ui-state';

  saveState(key: string, value: unknown): void {
    try {
      const state = this.loadAllState();
      state[key] = value;
      localStorage.setItem(this.storageKey, JSON.stringify(state));
    } catch {
      // localStorage may be full or unavailable
    }
  }

  loadState<T>(key: string, defaultValue: T): T {
    try {
      const state = this.loadAllState();
      return state[key] !== undefined ? (state[key] as T) : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  clearState(key?: string): void {
    try {
      if (key !== undefined) {
        this.removeKey(key);
      } else {
        localStorage.removeItem(this.storageKey);
      }
    } catch {
      // localStorage may be unavailable
    }
  }

  private removeKey(key: string): void {
    const state = this.loadAllState();
    const rest: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(state)) {
      if (k !== key) {
        rest[k] = v;
      }
    }
    localStorage.setItem(this.storageKey, JSON.stringify(rest));
  }

  private loadAllState(): Record<string, unknown> {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored === null) {
        return {};
      }
      const parsed: unknown = JSON.parse(stored);
      return parsed !== null &&
        typeof parsed === 'object' &&
        !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : {};
    } catch {
      return {};
    }
  }
}
