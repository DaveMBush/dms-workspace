import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class UniverseSettingsService {
  readonly visible = signal(false);

  show() {
    this.visible.set(true);
  }

  hide() {
    this.visible.set(false);
  }
}
