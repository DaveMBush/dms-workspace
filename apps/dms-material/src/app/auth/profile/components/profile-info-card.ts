import { DatePipe, NgClass } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { ProfileService } from '../../services/profile.service';

@Component({
  selector: 'rms-profile-info-card',
  imports: [
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
    NgClass,
    DatePipe,
  ],
  templateUrl: './profile-info-card.html',
  styleUrl: './profile-info-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileInfoCard {
  private profileService = inject(ProfileService);

  hasProfile = computed(
    function hasProfile(this: ProfileInfoCard) {
      return this.profileService.profile() !== null;
    }.bind(this)
  );

  isLoading = computed(
    function isLoading(this: ProfileInfoCard) {
      return this.profileService.loading();
    }.bind(this)
  );

  hasError = computed(
    function hasError(this: ProfileInfoCard) {
      return this.profileService.profileError() !== null;
    }.bind(this)
  );

  errorMessage = computed(
    function errorMessage(this: ProfileInfoCard) {
      return this.profileService.profileError();
    }.bind(this)
  );

  username = computed(
    function username(this: ProfileInfoCard) {
      return this.profileService.profile()?.username ?? '';
    }.bind(this)
  );

  email = computed(
    function email(this: ProfileInfoCard) {
      return this.profileService.profile()?.email ?? '';
    }.bind(this)
  );

  emailVerified = computed(
    function emailVerified(this: ProfileInfoCard) {
      return this.profileService.profile()?.emailVerified ?? false;
    }.bind(this)
  );

  accountCreated = computed(
    function accountCreated(this: ProfileInfoCard) {
      return this.profileService.profile()?.createdAt;
    }.bind(this)
  );

  lastModified = computed(
    function lastModified(this: ProfileInfoCard) {
      return this.profileService.profile()?.lastModified;
    }.bind(this)
  );
}
