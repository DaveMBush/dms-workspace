import { inject, Injectable } from '@angular/core';

import { AuthService } from '../auth.service';
import { UserProfile } from '../types/profile.types';
import { BaseProfileService } from './base-profile.service';

@Injectable({
  providedIn: 'root',
})
export class MockProfileService extends BaseProfileService {
  private authService = inject(AuthService);

  async loadUserProfile(): Promise<void> {
    // eslint-disable-next-line @smarttools/no-anonymous-functions -- Required for async operation wrapper
    return this.executeLoadProfile(async () => {
      // Simulate network delay
      // eslint-disable-next-line no-restricted-syntax -- Promise required for async simulation
      await new Promise(function simulateProfileLoadDelay(resolve) {
        setTimeout(resolve, 800);
      });

      const currentUser = this.authService.currentUser();
      if (currentUser) {
        const mockProfile = this.buildMockUserProfile(currentUser.username);
        this.userProfile.set(mockProfile);
      } else {
        throw new Error('No authenticated user found');
      }
    });
  }

  async changeUserPassword(
    oldPassword: string,
    newPassword: string
  ): Promise<void> {
    // eslint-disable-next-line @smarttools/no-anonymous-functions -- Required for async operation wrapper
    return this.executeWithErrorHandling(async () => {
      // Simulate network delay
      // eslint-disable-next-line no-restricted-syntax -- Promise required for async simulation
      await new Promise(function simulatePasswordChangeDelay(resolve) {
        setTimeout(resolve, 1000);
      });

      // Mock validation - just check if old password is not empty
      if (!oldPassword || oldPassword.length < 8) {
        throw new Error('Current password is required');
      }

      if (newPassword.length < 8) {
        throw new Error('New password must be at least 8 characters');
      }

      // Password changed successfully (mock)
    });
  }

  async updateEmail(newEmail: string): Promise<void> {
    // eslint-disable-next-line @smarttools/no-anonymous-functions -- Required for async operation wrapper
    return this.executeWithErrorHandling(async () => {
      // Simulate network delay
      // eslint-disable-next-line no-restricted-syntax -- Promise required for async simulation
      await new Promise(function simulateEmailUpdateDelay(resolve) {
        setTimeout(resolve, 800);
      });

      if (!this.isValidEmail(newEmail)) {
        throw new Error('Invalid email format');
      }

      // Email update initiated (mock)
    });
  }

  async verifyEmailChange(verificationCode: string): Promise<void> {
    // Simulate network delay
    // eslint-disable-next-line no-restricted-syntax -- Promise required for async simulation
    await new Promise(function simulateEmailVerifyDelay(resolve) {
      setTimeout(resolve, 600);
    });

    if (!verificationCode || verificationCode.length !== 6) {
      throw new Error('Please enter a valid 6-digit verification code');
    }

    // Email verification successful (mock)
    await this.loadUserProfile(); // Refresh profile
  }

  async sendEmailVerificationCode(): Promise<void> {
    // Simulate network delay
    // eslint-disable-next-line no-restricted-syntax -- Promise required for async simulation
    await new Promise(function simulateVerificationCodeDelay(resolve) {
      setTimeout(resolve, 500);
    });
    // Email verification code sent (mock)
  }

  async initiatePasswordReset(username: string): Promise<void> {
    // Simulate network delay
    // eslint-disable-next-line no-restricted-syntax -- Promise required for async simulation
    await new Promise(function simulatePasswordResetDelay(resolve) {
      setTimeout(resolve, 600);
    });

    if (!this.isValidEmail(username)) {
      throw new Error('Please enter a valid email address');
    }

    // Password reset initiated (mock)
  }

  async confirmPasswordReset(
    username: string,
    confirmationCode: string,
    newPassword: string
  ): Promise<void> {
    // Simulate network delay
    // eslint-disable-next-line no-restricted-syntax -- Promise required for async simulation
    await new Promise(function simulatePasswordConfirmDelay(resolve) {
      setTimeout(resolve, 800);
    });

    if (!this.isValidEmail(username)) {
      throw new Error('Invalid email address');
    }

    if (!confirmationCode || confirmationCode.length !== 6) {
      throw new Error('Please enter a valid 6-digit confirmation code');
    }

    if (newPassword.length < 8) {
      throw new Error('Password must be at least 8 characters');
    }

    // Password reset confirmed (mock)
  }

  private buildMockUserProfile(username: string): UserProfile {
    const now = new Date();
    const loginTime = new Date(now.getTime() - 30 * 60 * 1000); // 30 minutes ago
    const tokenExpiration = new Date(now.getTime() + 30 * 60 * 1000); // 30 minutes from now
    const accountCreated = new Date('2024-01-15T10:30:00Z');

    return {
      username,
      email: username,
      emailVerified: true,
      name: username.split('@')[0] || username,
      createdAt: accountCreated,
      lastModified: new Date('2024-12-20T14:22:00Z'),
      sessionInfo: {
        loginTime,
        tokenExpiration,
        sessionDuration: now.getTime() - loginTime.getTime(),
      },
    };
  }
}
