import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';

import { ProfileActionsService } from '../../services/profile-actions.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'dms-account-actions-card',
  imports: [ButtonModule, CardModule],
  templateUrl: './account-actions-card.html',
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
