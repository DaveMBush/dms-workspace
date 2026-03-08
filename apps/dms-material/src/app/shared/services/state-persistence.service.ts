import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class StatePersistenceService {
  saveState(_: string, __: unknown): void {
    // Will be implemented in Story AV.2
  }

  loadState<T>(_: string, defaultValue: T): T {
    // Will be implemented in Story AV.2
    return defaultValue;
  }

  clearState(_?: string): void {
    // Will be implemented in Story AV.2
  }
}
