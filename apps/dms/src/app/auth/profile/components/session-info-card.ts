import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { CardModule } from 'primeng/card';

import { ProfileService } from '../../services/profile.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'rms-session-info-card',
  imports: [CommonModule, CardModule],
  templateUrl: './session-info-card.html',
})
export class SessionInfoCard {
  private profileService = inject(ProfileService);

  // eslint-disable-next-line @smarttools/no-anonymous-functions -- Uses this binding
  hasProfile$ = computed(() => this.profileService.profile() !== null);
  loginTime$ = computed(
    // eslint-disable-next-line @smarttools/no-anonymous-functions -- Computed signal requires this binding
    () => this.profileService.profile()?.sessionInfo.loginTime
  );

  tokenExpiration$ = computed(
    // eslint-disable-next-line @smarttools/no-anonymous-functions -- Computed signal requires this binding
    () => this.profileService.profile()?.sessionInfo.tokenExpiration
  );

  // eslint-disable-next-line @smarttools/no-anonymous-functions -- Uses this binding
  sessionDuration$ = computed(() => {
    const duration =
      this.profileService.profile()?.sessionInfo.sessionDuration ?? 0;
    return this.formatSessionDuration(duration);
  });

  private formatSessionDuration(milliseconds: number): string {
    const hours = Math.floor(milliseconds / 3600000);
    const minutes = Math.floor((milliseconds % 3600000) / 60000);
    return `${hours}h ${minutes}m`;
  }
}
