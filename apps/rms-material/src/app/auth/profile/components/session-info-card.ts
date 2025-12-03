import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

import { ProfileService } from '../../services/profile.service';

@Component({
  selector: 'rms-session-info-card',
  imports: [MatCardModule, MatIconModule, DatePipe],
  templateUrl: './session-info-card.html',
  styleUrl: './session-info-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SessionInfoCard {
  private profileService = inject(ProfileService);

  hasProfile = computed(
    function hasProfile(this: SessionInfoCard) {
      return this.profileService.profile() !== null;
    }.bind(this)
  );

  loginTime = computed(
    function loginTime(this: SessionInfoCard) {
      return this.profileService.profile()?.sessionInfo.loginTime;
    }.bind(this)
  );

  tokenExpiration = computed(
    function tokenExpiration(this: SessionInfoCard) {
      return this.profileService.profile()?.sessionInfo.tokenExpiration;
    }.bind(this)
  );

  sessionDuration = computed(
    function sessionDuration(this: SessionInfoCard) {
      const duration =
        this.profileService.profile()?.sessionInfo.sessionDuration ?? 0;
      return this.formatSessionDuration(duration);
    }.bind(this)
  );

  private formatSessionDuration(milliseconds: number): string {
    const hours = Math.floor(milliseconds / 3600000);
    const minutes = Math.floor((milliseconds % 3600000) / 60000);
    return `${hours}h ${minutes}m`;
  }
}
