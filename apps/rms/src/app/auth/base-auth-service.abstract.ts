import { computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import type { AuthUser, SignInRequest } from './auth.types';
import type { BaseAuthInterface } from './base-auth.interface';

/**
 * Abstract base class for authentication services
 * Provides common signal-based state management and navigation logic
 */
export abstract class BaseAuthService implements BaseAuthInterface {
  protected router = inject(Router);

  // Private signals for internal state management
  protected currentUserSignal = signal<AuthUser | null>(null);
  protected isLoadingSignal = signal(false);
  protected errorSignal = signal<string | null>(null);

  // Public readonly signals
  readonly currentUser = this.currentUserSignal.asReadonly();
  readonly isLoading = this.isLoadingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();

  // Computed signals
  // eslint-disable-next-line @smarttools/no-anonymous-functions -- Arrow function required for proper this binding in computed signal
  readonly isAuthenticated = computed(() => this.currentUserSignal() !== null);

  // eslint-disable-next-line @smarttools/no-anonymous-functions -- Arrow function required for proper this binding in computed signal
  readonly authState = computed(() => ({
    user: this.currentUserSignal(),
    isLoading: this.isLoadingSignal(),
    error: this.errorSignal(),
    isAuthenticated: this.isAuthenticated(),
  }));

  // Concrete signIn method implementation
  async signIn(email: string, password: string): Promise<void>;
  async signIn(credentials: SignInRequest): Promise<void>;
  async signIn(
    emailOrCredentials: SignInRequest | string,
    password?: string
  ): Promise<void> {
    this.isLoadingSignal.set(true);
    this.errorSignal.set(null);

    try {
      // Handle both function signatures
      const { username, password: pwd } = this.extractCredentials(
        emailOrCredentials,
        password
      );

      // Delegate to service-specific authentication logic
      await this.performAuthentication(username, pwd);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Authentication failed';
      this.errorSignal.set(errorMessage);
      throw error;
    } finally {
      this.isLoadingSignal.set(false);
    }
  }

  // Abstract methods that must be implemented by subclasses
  protected abstract performAuthentication(
    username: string,
    password: string
  ): Promise<void>;
  
  abstract signUp(email: string, password: string, name: string): Promise<void>;
  abstract signOut(): Promise<void>;
  abstract getAccessToken(): Promise<string | null>;
  abstract refreshTokens(): Promise<void>;
  abstract isSessionValid(): Promise<boolean>;

  // Common helper methods that match the computed signal

  /**
   * Clear authentication error
   */
  clearError(): void {
    this.errorSignal.set(null);
  }

  /**
   * Protected helper method for sign out cleanup
   */
  protected async performSignOutCleanup(): Promise<void> {
    this.currentUserSignal.set(null);
    this.errorSignal.set(null);
    this.clearTokens();
    await this.router.navigate(['/auth/login']);
  }

  /**
   * Extract credentials from different signIn method signatures
   */
  private extractCredentials(
    emailOrCredentials: SignInRequest | string,
    password?: string
  ): { username: string; password: string } {
    return typeof emailOrCredentials === 'string'
      ? { username: emailOrCredentials, password: password! }
      : emailOrCredentials;
  }

  /**
   * Protected helper method for clearing tokens (to be implemented by subclasses)
   */
  protected abstract clearTokens(): void;
}
