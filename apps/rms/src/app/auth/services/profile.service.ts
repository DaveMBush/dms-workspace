import { Injectable, signal } from '@angular/core';
import {
  changePassword,
  confirmResetPassword,
  fetchAuthSession,
  getCurrentUser,
  resetPassword,
  updateUserAttributes,
  verifyUserAttribute,
} from '@aws-amplify/auth';

import { UserProfile } from '../types/profile.types';

@Injectable({
  providedIn: 'root',
})
export class ProfileService {
  private userProfile = signal<UserProfile | null>(null);
  private isLoading = signal(false);
  private error = signal<string | null>(null);

  public readonly profile = this.userProfile.asReadonly();
  public readonly loading = this.isLoading.asReadonly();
  public readonly profileError = this.error.asReadonly();

  public async loadUserProfile(): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);

    try {
      const [user, session] = await Promise.all([
        getCurrentUser(),
        fetchAuthSession(),
      ]);

      const profile = this.buildUserProfile(user, session);
      this.userProfile.set(profile);
    } catch (error) {
      this.error.set('Failed to load profile information');
    } finally {
      this.isLoading.set(false);
    }
  }

  private buildUserProfile(user: any, session: any): UserProfile {
    const iat = session.tokens?.idToken?.payload.iat ?? 0;
    const exp = session.tokens?.accessToken?.payload.exp ?? 0;
    
    return {
      username: user.username,
      email: user.signInDetails?.loginId ?? '',
      emailVerified: true,
      name: user.username,
      createdAt: new Date(),
      lastModified: new Date(),
      sessionInfo: {
        loginTime: new Date(iat * 1000),
        tokenExpiration: new Date(exp * 1000),
        sessionDuration: Date.now() - iat * 1000,
      },
    };
  }

  public async changeUserPassword(
    oldPassword: string,
    newPassword: string
  ): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);

    try {
      await getCurrentUser();
      await changePassword({
        oldPassword,
        newPassword,
      });
      // Password changed successfully
    } catch (error) {
      this.error.set(this.getErrorMessage(error));
      throw error;
    } finally {
      this.isLoading.set(false);
    }
  }

  public async updateEmail(newEmail: string): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);

    try {
      await updateUserAttributes({
        userAttributes: {
          email: newEmail,
        },
      });
      // Email update initiated, verification required
    } catch (error) {
      this.error.set(this.getErrorMessage(error));
      throw error;
    } finally {
      this.isLoading.set(false);
    }
  }

  public async verifyEmailChange(verificationCode: string): Promise<void> {
    try {
      await verifyUserAttribute({
        userAttributeKey: 'email',
        confirmationCode: verificationCode,
      });
      // Email verification successful
      await this.loadUserProfile(); // Refresh profile
    } catch (error) {
      throw error;
    }
  }

  public async initiatePasswordReset(username: string): Promise<void> {
    try {
      await resetPassword({
        username,
      });
      // Password reset initiated
    } catch (error) {
      throw error;
    }
  }

  public async confirmPasswordReset(
    username: string,
    confirmationCode: string,
    newPassword: string
  ): Promise<void> {
    try {
      await confirmResetPassword({
        username,
        confirmationCode,
        newPassword,
      });
      // Password reset confirmed
    } catch (error) {
      throw error;
    }
  }

  private getErrorMessage(error: unknown): string {
    const err = error as { name?: string; message?: string };
    switch (err.name ?? 'UnknownError') {
      case 'NotAuthorizedException':
        return 'Current password is incorrect';
      case 'InvalidPasswordException':
        return 'New password does not meet requirements';
      case 'LimitExceededException':
        return 'Too many attempts. Please try again later';
      case 'UserNotConfirmedException':
        return 'User account is not confirmed';
      case 'InvalidParameterException':
        return 'Invalid input parameters';
      case undefined:
      default:
        return err.message ?? 'Operation failed. Please try again';
    }
  }
}
