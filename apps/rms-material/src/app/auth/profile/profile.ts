import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  OnInit,
} from '@angular/core';

import { ProfileService } from '../services/profile.service';
import { AccountActionsCard } from './components/account-actions-card';
import { EmailChangeCard } from './components/email-change-card';
import { PasswordChangeCard } from './components/password-change-card';
import { ProfileInfoCard } from './components/profile-info-card';
import { SessionInfoCard } from './components/session-info-card';

@Component({
  selector: 'rms-profile',
  imports: [
    PasswordChangeCard,
    EmailChangeCard,
    ProfileInfoCard,
    SessionInfoCard,
    AccountActionsCard,
  ],
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Profile implements OnInit {
  private profileService = inject(ProfileService);

  profile = this.profileService.profile;
  userEmail = computed(
    function getUserEmail(this: Profile) {
      return this.profile()?.email ?? '';
    }.bind(this)
  );

  userName = computed(
    function getUserName(this: Profile) {
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
