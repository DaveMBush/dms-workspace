import { Signal } from '@angular/core';

import { AuthUser, SignInRequest } from './auth.types';

/**
 * Base authentication interface for both real and mock auth services
 */
export interface BaseAuthInterface {
  // Public readonly signals
  readonly currentUser: Signal<AuthUser | null>;
  readonly isLoading: Signal<boolean>;
  readonly error: Signal<string | null>;
  readonly isAuthenticated: Signal<boolean>;
  readonly authState: Signal<{
    user: AuthUser | null;
    isLoading: boolean;
    error: string | null;
    isAuthenticated: boolean;
  }>;

  // Authentication methods
  signIn(email: string, password: string): Promise<void>;
  signIn(credentials: SignInRequest): Promise<void>;
  signUp(email: string, password: string, name: string): Promise<void>;
  signOut(): Promise<void>;
  getAccessToken(): Promise<string | null>;
  refreshTokens(): Promise<void>;
  isSessionValid(): Promise<boolean>;
  clearError(): void;
}
