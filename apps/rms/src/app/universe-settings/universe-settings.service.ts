import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class UniverseSettingsService {
  readonly visible = signal(false);

  show(): void {
    this.visible.set(true);
  }

  hide(): void {
    this.visible.set(false);
  }
}
