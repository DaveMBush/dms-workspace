import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class UniverseSettingsService {
  readonly visible$ = signal<boolean>(false);

  show(): void {
    this.visible$.set(true);
  }

  hide(): void {
    this.visible$.set(false);
  }
}
