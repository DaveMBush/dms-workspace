import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
} from '@angular/core';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';

import { ProfileService } from '../services/profile.service';
import { ProfileActionsService } from '../services/profile-actions.service';
import { AccountActionsCard } from './components/account-actions-card';
import { EmailChangeCard } from './components/email-change-card';
import { PasswordChangeCard } from './components/password-change-card';
import { ProfileInfoCard } from './components/profile-info-card';
import { SessionInfoCard } from './components/session-info-card';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'rms-profile',
  imports: [
    ConfirmDialogModule,
    ToastModule,
    ProfileInfoCard,
    SessionInfoCard,
    PasswordChangeCard,
    EmailChangeCard,
    AccountActionsCard,
  ],
  providers: [ConfirmationService, MessageService, ProfileActionsService],
  templateUrl: './profile.html',
  styleUrls: ['./profile.scss'],
})
export class Profile implements OnInit {
  private profileService = inject(ProfileService);

  ngOnInit(): void {
    void this.profileService.loadUserProfile();
  }
}
