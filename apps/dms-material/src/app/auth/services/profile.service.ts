import { Injectable } from '@angular/core';
import {
  confirmResetPassword,
  confirmUserAttribute,
  fetchAuthSession,
  getCurrentUser,
  resetPassword,
  sendUserAttributeVerificationCode,
  updatePassword,
  updateUserAttributes,
} from '@aws-amplify/auth';

import { UserProfile } from '../types/profile.types';
import { BaseProfileService } from './base-profile.service';

@Injectable({
  providedIn: 'root',
})
export class ProfileService extends BaseProfileService {
  async loadUserProfile(): Promise<void> {
    // eslint-disable-next-line @smarttools/no-anonymous-functions -- Required for async operation wrapper
    return this.executeLoadProfile(async () => {
      const [user, session] = await Promise.all([
        getCurrentUser(),
        fetchAuthSession(),
      ]);

      const profile = this.buildUserProfile(user, session);
      this.userProfile.set(profile);
    });
  }

  async changeUserPassword(
    oldPassword: string,
    newPassword: string
  ): Promise<void> {
    // eslint-disable-next-line @smarttools/no-anonymous-functions -- Required for async operation wrapper
    return this.executeWithErrorHandling(async () => {
      await updatePassword({
        oldPassword,
        newPassword,
      });
      // Password changed successfully
    });
  }

  async updateEmail(newEmail: string): Promise<void> {
    // eslint-disable-next-line @smarttools/no-anonymous-functions -- Required for async operation wrapper
    return this.executeWithErrorHandling(async () => {
      await updateUserAttributes({
        userAttributes: {
          email: newEmail,
        },
      });
      // Email update initiated, verification required
    });
  }

  async verifyEmailChange(verificationCode: string): Promise<void> {
    await confirmUserAttribute({
      userAttributeKey: 'email',
      confirmationCode: verificationCode,
    });
    // Email verification successful
    await this.loadUserProfile(); // Refresh profile
  }

  async sendEmailVerificationCode(): Promise<void> {
    await sendUserAttributeVerificationCode({
      userAttributeKey: 'email',
    });
  }

  async initiatePasswordReset(username: string): Promise<void> {
    await resetPassword({
      username,
    });
    // Password reset initiated
  }

  async confirmPasswordReset(
    username: string,
    confirmationCode: string,
    newPassword: string
  ): Promise<void> {
    await confirmResetPassword({
      username,
      confirmationCode,
      newPassword,
    });
    // Password reset confirmed
  }

  private buildUserProfile(user: unknown, session: unknown): UserProfile {
    const userObj = user as {
      username: string;
      signInDetails?: { loginId?: string };
    };
    const sessionObj = session as {
      tokens?: {
        idToken?: { payload: { iat?: number } };
        accessToken?: { payload: { exp?: number } };
      };
    };

    const iat = sessionObj.tokens?.idToken?.payload.iat ?? 0;
    const exp = sessionObj.tokens?.accessToken?.payload.exp ?? 0;

    return {
      username: userObj.username,
      email: userObj.signInDetails?.loginId ?? '',
      emailVerified: true,
      name: userObj.username,
      createdAt: new Date(),
      lastModified: new Date(),
      sessionInfo: {
        loginTime: new Date(iat * 1000),
        tokenExpiration: new Date(exp * 1000),
        sessionDuration: Date.now() - iat * 1000,
      },
    };
  }
}
