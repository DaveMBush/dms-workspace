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
  selector: 'dms-profile-info-card',
  imports: [CommonModule, CardModule],
  templateUrl: './profile-info-card.html',
})
export class ProfileInfoCard {
  private profileService = inject(ProfileService);

  // eslint-disable-next-line @smarttools/no-anonymous-functions -- Uses this binding
  hasProfile$ = computed(() => this.profileService.profile() !== null);

  // eslint-disable-next-line @smarttools/no-anonymous-functions -- Uses this binding
  isLoading$ = computed(() => this.profileService.loading());

  // eslint-disable-next-line @smarttools/no-anonymous-functions -- Uses this binding
  hasError$ = computed(() => this.profileService.profileError() !== null);

  // eslint-disable-next-line @smarttools/no-anonymous-functions -- Uses this binding
  errorMessage$ = computed(() => this.profileService.profileError());

  profileUsername$ = computed(
    // eslint-disable-next-line @smarttools/no-anonymous-functions -- Computed signal requires this binding
    () => this.profileService.profile()?.username ?? ''
  );

  // eslint-disable-next-line @smarttools/no-anonymous-functions -- Computed signal requires this binding
  profileEmail$ = computed(() => this.profileService.profile()?.email ?? '');

  emailVerified$ = computed(
    // eslint-disable-next-line @smarttools/no-anonymous-functions -- Computed signal requires this binding
    () => this.profileService.profile()?.emailVerified ?? false
  );

  // eslint-disable-next-line @smarttools/no-anonymous-functions -- Uses this binding
  accountCreated$ = computed(() => this.profileService.profile()?.createdAt);
  // eslint-disable-next-line @smarttools/no-anonymous-functions -- Uses this binding
  lastModified$ = computed(() => this.profileService.profile()?.lastModified);
}
