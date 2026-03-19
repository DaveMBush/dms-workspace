import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  OnInit,
} from '@angular/core';

import { ProfileService } from '../services/profile.service';
import { AccountActionsCardComponent } from './components/account-actions-card';
import { EmailChangeCardComponent } from './components/email-change-card';
import { PasswordChangeCardComponent } from './components/password-change-card';
import { ProfileInfoCardComponent } from './components/profile-info-card';
import { SessionInfoCardComponent } from './components/session-info-card';

@Component({
  selector: 'dms-profile',
  imports: [
    PasswordChangeCardComponent,
    EmailChangeCardComponent,
    ProfileInfoCardComponent,
    SessionInfoCardComponent,
    AccountActionsCardComponent,
  ],
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileComponent implements OnInit {
  private profileService = inject(ProfileService);

  profile = this.profileService.profile;
  userEmail = computed(
    function getUserEmail(this: ProfileComponent) {
      return this.profile()?.email ?? '';
    }.bind(this)
  );

  userName = computed(
    function getUserName(this: ProfileComponent) {
      return this.profile()?.name ?? this.profile()?.email ?? '';
    }.bind(this)
  );

  constructor() {
    const context = this;
    effect(function trackProfileChanges() {
      const currentProfile = context.profile();
      if (currentProfile) {
        // Profile loaded successfully
      }
    });
  }

  ngOnInit(): void {
    void this.profileService.loadUserProfile();
  }

  onEmailChanged(): void {
    void this.profileService.loadUserProfile();
  }
}
