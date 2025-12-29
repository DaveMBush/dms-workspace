import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

import { ProfileActionsService } from '../../services/profile-actions.service';

@Component({
  selector: 'dms-account-actions-card',
  imports: [MatCardModule, MatButtonModule, MatIconModule],
  templateUrl: './account-actions-card.html',
  styleUrl: './account-actions-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountActionsCard {
  private profileActionsService = inject(ProfileActionsService);

  onLogout(): void {
    this.profileActionsService.confirmSignOut();
  }

  onLogoutAllDevices(): void {
    this.profileActionsService.confirmSignOutAllDevices();
  }
}
