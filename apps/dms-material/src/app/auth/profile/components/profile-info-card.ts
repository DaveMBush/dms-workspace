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
  selector: 'dms-profile-info-card',
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
export class ProfileInfoCardComponent {
  private profileService = inject(ProfileService);

  hasProfile = computed(
    function hasProfile(this: ProfileInfoCardComponent) {
      return this.profileService.profile() !== null;
    }.bind(this)
  );

  isLoading = computed(
    function isLoading(this: ProfileInfoCardComponent) {
      return this.profileService.loading();
    }.bind(this)
  );

  hasError = computed(
    function hasError(this: ProfileInfoCardComponent) {
      return this.profileService.profileError() !== null;
    }.bind(this)
  );

  errorMessage = computed(
    function errorMessage(this: ProfileInfoCardComponent) {
      return this.profileService.profileError();
    }.bind(this)
  );

  username = computed(
    function username(this: ProfileInfoCardComponent) {
      return this.profileService.profile()?.username ?? '';
    }.bind(this)
  );

  email = computed(
    function email(this: ProfileInfoCardComponent) {
      return this.profileService.profile()?.email ?? '';
    }.bind(this)
  );

  emailVerified = computed(
    function emailVerified(this: ProfileInfoCardComponent) {
      return this.profileService.profile()?.emailVerified ?? false;
    }.bind(this)
  );

  accountCreated = computed(
    function accountCreated(this: ProfileInfoCardComponent) {
      return this.profileService.profile()?.createdAt;
    }.bind(this)
  );

  lastModified = computed(
    function lastModified(this: ProfileInfoCardComponent) {
      return this.profileService.profile()?.lastModified;
    }.bind(this)
  );
}
