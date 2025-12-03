import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';

import { SessionWarningService } from './auth/services/session-warning.service';

/**
 * Temporary test component to manually trigger session warning dialog
 * DELETE THIS FILE after testing
 */
@Component({
  selector: 'rms-test-session-warning',
  imports: [MatButtonModule],
  template: `
    <div style="padding: 2rem;">
      <h2>Session Warning Dialog Test</h2>
      <button mat-raised-button color="warn" (click)="showDialog()">
        Show Session Warning Dialog
      </button>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        max-width: 600px;
        margin: 2rem auto;
      }
    `,
  ],
})
export class TestSessionWarningComponent {
  private sessionWarningService = inject(SessionWarningService);

  showDialog(): void {
    this.sessionWarningService.showWarning();
  }
}
