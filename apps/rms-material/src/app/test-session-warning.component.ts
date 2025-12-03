import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';

import { SessionWarningService } from './auth/services/session-warning.service';

/**
 * Temporary test component to manually trigger session warning dialog
 * DELETE THIS FILE after testing
 */
@Component({
  selector: 'rms-test-session-warning',
  imports: [MatButtonModule],
  templateUrl: './test-session-warning.html',
  styleUrl: './test-session-warning.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TestSessionWarningComponent {
  private sessionWarningService = inject(SessionWarningService);

  showDialog(): void {
    this.sessionWarningService.showWarning();
  }
}
