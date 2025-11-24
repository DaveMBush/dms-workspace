import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';

import { AuthService } from '../auth.service';
import { ProfileService } from './profile.service';

@Injectable()
export class ProfileActionsService {
  private authService = inject(AuthService);
  private profileService = inject(ProfileService);
  private router = inject(Router);
  private confirmationService = inject(ConfirmationService);
  private messageService = inject(MessageService);

  async changePassword(
    currentPassword: string,
    newPassword: string
  ): Promise<boolean> {
    try {
      await this.profileService.changeUserPassword(
        currentPassword,
        newPassword
      );
      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Password changed successfully',
      });
      return true;
    } catch {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Password change failed. Please try again.',
      });
      return false;
    }
  }

  async updateEmail(newEmail: string): Promise<boolean> {
    try {
      await this.profileService.updateEmail(newEmail);
      this.messageService.add({
        severity: 'info',
        summary: 'Verification Required',
        detail: 'Please check your email for the verification code',
      });
      return true;
    } catch {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Email change failed. Please try again.',
      });
      return false;
    }
  }

  async verifyEmailChange(verificationCode: string): Promise<boolean> {
    if (!verificationCode) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Warning',
        detail: 'Please enter the verification code',
      });
      return false;
    }

    try {
      await this.profileService.verifyEmailChange(verificationCode);
      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Email address updated successfully',
      });
      return true;
    } catch {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Email verification failed. Please check the code.',
      });
      return false;
    }
  }

  confirmSignOut(): void {
    this.confirmationService.confirm({
      message:
        'Are you sure you want to sign out? You will need to log in again.',
      header: 'Confirm Sign Out',
      icon: 'pi pi-sign-out',
      acceptIcon: 'pi pi-check',
      rejectIcon: 'pi pi-times',
      acceptLabel: 'Yes, Sign Out',
      rejectLabel: 'Cancel',
      // eslint-disable-next-line @smarttools/no-anonymous-functions -- PrimeNG callback requires arrow function
      accept: () => {
        void this.handleSignOut();
      },
    });
  }

  confirmSignOutAllDevices(): void {
    this.confirmationService.confirm({
      message:
        'This will sign you out from all devices and browsers. Continue?',
      header: 'Confirm Sign Out All Devices',
      icon: 'pi pi-power-off',
      acceptIcon: 'pi pi-check',
      rejectIcon: 'pi pi-times',
      acceptLabel: 'Yes, Sign Out All',
      rejectLabel: 'Cancel',
      // eslint-disable-next-line @smarttools/no-anonymous-functions -- PrimeNG callback requires arrow function
      accept: () => {
        void this.handleSignOutAllDevices();
      },
    });
  }

  private async handleSignOut(): Promise<void> {
    try {
      await this.authService.signOut();
      void this.router.navigate(['/auth/login']);
    } catch {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Sign out failed. Please try again.',
      });
    }
  }

  private async handleSignOutAllDevices(): Promise<void> {
    try {
      await this.authService.signOut();
      void this.router.navigate(['/auth/login']);
      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Signed out from all devices',
      });
    } catch {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Sign out failed. Please try again.',
      });
    }
  }
}
