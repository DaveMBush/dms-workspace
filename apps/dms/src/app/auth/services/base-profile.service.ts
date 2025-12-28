import { signal } from '@angular/core';

import { UserProfile } from '../types/profile.types';

export abstract class BaseProfileService {
  protected userProfile = signal<UserProfile | null>(null);
  protected isLoading = signal(false);
  protected error = signal<string | null>(null);

  readonly profile = this.userProfile.asReadonly();
  readonly loading = this.isLoading.asReadonly();
  readonly profileError = this.error.asReadonly();

  abstract loadUserProfile(): Promise<void>;
  abstract changeUserPassword(
    oldPassword: string,
    newPassword: string
  ): Promise<void>;

  abstract updateEmail(newEmail: string): Promise<void>;

  abstract verifyEmailChange(verificationCode: string): Promise<void>;

  abstract sendEmailVerificationCode(): Promise<void>;

  abstract initiatePasswordReset(username: string): Promise<void>;

  abstract confirmPasswordReset(
    username: string,
    confirmationCode: string,
    newPassword: string
  ): Promise<void>;

  protected getErrorMessage(error: unknown): string {
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
      default:
        return err.message ?? 'Operation failed. Please try again';
    }
  }

  protected isValidEmail(email: string): boolean {
    // Simple email validation regex - not vulnerable to ReDoS
    // eslint-disable-next-line sonarjs/slow-regex -- Simple regex pattern is safe
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  protected async executeWithErrorHandling<T>(
    operation: () => Promise<T>
  ): Promise<T> {
    this.isLoading.set(true);
    this.error.set(null);

    try {
      const result = await operation();
      return result;
    } catch (error) {
      this.error.set(this.getErrorMessage(error));
      throw error;
    } finally {
      this.isLoading.set(false);
    }
  }

  protected async executeLoadProfile(
    operation: () => Promise<void>
  ): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);

    try {
      await operation();
    } catch {
      this.error.set('Failed to load profile information');
    } finally {
      this.isLoading.set(false);
    }
  }
}
