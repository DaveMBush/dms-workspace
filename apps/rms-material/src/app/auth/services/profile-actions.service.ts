import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';

import { ConfirmDialogService } from '../../shared/services/confirm-dialog.service';
import { NotificationService } from '../../shared/services/notification.service';
import { AuthService } from '../auth.service';
import { ProfileService } from './profile.service';

@Injectable({
  providedIn: 'root',
})
export class ProfileActionsService {
  private authService = inject(AuthService);
  private profileService = inject(ProfileService);
  private router = inject(Router);
  private confirmDialog = inject(ConfirmDialogService);
  private notification = inject(NotificationService);

  async changePassword(
    currentPassword: string,
    newPassword: string
  ): Promise<boolean> {
    try {
      await this.profileService.changeUserPassword(
        currentPassword,
        newPassword
      );
      this.notification.success('Password changed successfully');
      return true;
    } catch {
      this.notification.error('Password change failed. Please try again.');
      return false;
    }
  }

  async updateEmail(newEmail: string): Promise<boolean> {
    try {
      await this.profileService.updateEmail(newEmail);
      this.notification.info(
        'Please check your email for the verification code'
      );
      return true;
    } catch {
      this.notification.error('Email change failed. Please try again.');
      return false;
    }
  }

  async verifyEmailChange(verificationCode: string): Promise<boolean> {
    if (!verificationCode) {
      this.notification.warn('Please enter the verification code');
      return false;
    }

    try {
      await this.profileService.verifyEmailChange(verificationCode);
      this.notification.success('Email address updated successfully');
      return true;
    } catch {
      this.notification.error(
        'Email verification failed. Please check the code.'
      );
      return false;
    }
  }

  confirmSignOut(): void {
    const context = this;
    this.confirmDialog
      .confirm({
        title: 'Confirm Sign Out',
        message:
          'Are you sure you want to sign out? You will need to log in again.',
        confirmText: 'Yes, Sign Out',
        cancelText: 'Cancel',
      })
      .subscribe(function handleConfirmation(confirmed: boolean) {
        if (confirmed) {
          void context.handleSignOut();
        }
      });
  }

  confirmSignOutAllDevices(): void {
    const context = this;
    this.confirmDialog
      .confirm({
        title: 'Confirm Sign Out All Devices',
        message:
          'This will sign you out from all devices and browsers. Continue?',
        confirmText: 'Yes, Sign Out All',
        cancelText: 'Cancel',
      })
      .subscribe(function handleConfirmation(confirmed: boolean) {
        if (confirmed) {
          void context.handleSignOutAllDevices();
        }
      });
  }

  private async handleSignOut(): Promise<void> {
    try {
      await this.authService.signOut();
      void this.router.navigate(['/auth/login']);
    } catch {
      this.notification.error('Sign out failed. Please try again.');
    }
  }

  private async handleSignOutAllDevices(): Promise<void> {
    try {
      await this.authService.signOut();
      void this.router.navigate(['/auth/login']);
      this.notification.success('Signed out from all devices');
    } catch {
      this.notification.error('Sign out failed. Please try again.');
    }
  }
}
