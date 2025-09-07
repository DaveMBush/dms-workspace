import { Injectable } from '@angular/core';
import {
  fetchAuthSession,
  getCurrentUser,
  signIn,
  signOut,
} from '@aws-amplify/auth';
import { Amplify } from '@aws-amplify/core';

import { environment } from '../../environments/environment';
import { AuthError, AuthErrorCode, AuthSession, AuthUser } from './auth.types';
import { BaseAuthService } from './base-auth-service.abstract';

@Injectable({
  providedIn: 'root',
})
export class AuthService extends BaseAuthService {
  constructor() {
    super();
    // Initialize auth in the next tick to avoid async constructor
    // eslint-disable-next-line @smarttools/no-anonymous-functions -- Arrow function required for proper this binding
    setTimeout(() => {
      // eslint-disable-next-line @smarttools/no-anonymous-functions -- Arrow function required for proper this binding
      this.initializeAuth().catch(() => {
        // Ignore initialization errors - they will be handled by the service
      });
    }, 0);
  }

  /**
   * Sign up new user with email, password and name
   */
  async signUp(_: string, __: string, ___: string): Promise<void> {
    return Promise.reject(new Error('Sign up not implemented yet'));
  }

  /**
   * Sign out current user
   */
  async signOut(): Promise<void> {
    this.isLoadingSignal.set(true);

    try {
      await signOut();
      await this.performSignOutCleanup();
    } catch {
      // Sign out error, but continue with cleanup
      await this.performSignOutCleanup();
    } finally {
      this.isLoadingSignal.set(false);
    }
  }

  /**
   * Get current access token
   */
  async getAccessToken(): Promise<string | null> {
    try {
      const session = await fetchAuthSession();
      return session.tokens?.accessToken?.toString() ?? null;
    } catch {
      // Failed to get access token
      return null;
    }
  }

  /**
   * Refresh authentication tokens
   */
  async refreshTokens(): Promise<void> {
    try {
      const session = await fetchAuthSession();
      this.handleSessionTokens(session);
    } catch {
      // Token refresh failed
      await this.signOut();
    }
  }

  /**
   * Check if current session is valid and not expired
   */
  async isSessionValid(): Promise<boolean> {
    try {
      const session = await fetchAuthSession();
      return (
        session.tokens?.accessToken?.payload.exp !== undefined &&
        session.tokens.accessToken.payload.exp > Date.now() / 1000
      );
    } catch {
      return false;
    }
  }

  /**
   * Perform AWS Cognito authentication
   */
  protected async performAuthentication(
    username: string,
    password: string
  ): Promise<void> {
    try {
      // Perform sign in
      const signInOutput = await signIn({
        username,
        password,
        options: {
          authFlowType: 'USER_SRP_AUTH',
        },
      });

      // Handle different sign-in states
      if (signInOutput.isSignedIn) {
        // Get the current user and session
        const [user, session] = await Promise.all([
          getCurrentUser(),
          fetchAuthSession(),
        ]);

        const authUser = this.mapAmplifyUserToAuthUser(user);
        this.currentUserSignal.set(authUser);

        // Store session tokens
        this.handleSessionTokens(session);

        // User signed in successfully
      } else {
        // Handle incomplete sign-in (e.g., requires confirmation)
        throw new Error(
          'Sign-in incomplete. Please check your email for confirmation.'
        );
      }
    } catch (error) {
      // Transform AWS Cognito errors to user-friendly messages
      const errorMessage = this.getErrorMessage(error as AuthError);
      throw new Error(errorMessage);
    }
  }

  /**
   * Clear stored authentication tokens
   */
  protected clearTokens(): void {
    try {
      sessionStorage.removeItem('rms_access_token');
      sessionStorage.removeItem('rms_id_token');
      sessionStorage.removeItem('rms_refresh_token');
      sessionStorage.removeItem('rms_token_expiration');
      // Tokens cleared successfully
    } catch {
      // Failed to clear tokens
    }
  }

  /**
   * Initialize Amplify Auth configuration and check for existing session
   */
  private async initializeAuth(): Promise<void> {
    try {
      // Configure Amplify with Cognito settings
      Amplify.configure({
        Auth: {
          Cognito: {
            userPoolId: environment.cognito.userPoolId,
            userPoolClientId: environment.cognito.userPoolWebClientId,
            loginWith: {
              oauth: {
                domain: environment.cognito.domain,
                scopes: environment.cognito.scopes,
                redirectSignIn: [environment.cognito.redirectSignIn],
                redirectSignOut: [environment.cognito.redirectSignOut],
                responseType: 'code',
              },
            },
          },
        },
      });

      // Check for existing authenticated user
      const user = await getCurrentUser();
      if (user !== null) {
        this.currentUserSignal.set(this.mapAmplifyUserToAuthUser(user));
        await this.refreshTokens();
      }
    } catch {
      // User not authenticated or configuration error
      this.currentUserSignal.set(null);
    }
  }

  /**
   * Handle session tokens from fetchAuthSession response
   */
  private handleSessionTokens(session: unknown): void {
    const sessionData = session as {
      tokens?: {
        accessToken?: { toString(): string; payload: { exp: number } };
        idToken?: { toString(): string };
        refreshToken?: { toString(): string };
      };
    };
    if (sessionData.tokens) {
      this.storeTokens({
        accessToken: sessionData.tokens.accessToken?.toString() ?? '',
        idToken: sessionData.tokens.idToken?.toString() ?? '',
        refreshToken: sessionData.tokens.refreshToken?.toString() ?? '',
        expiration: sessionData.tokens.accessToken?.payload.exp,
      });
    }
  }

  /**
   * Store authentication tokens securely
   */
  private storeTokens(session: AuthSession): void {
    try {
      // Use sessionStorage for development, consider HttpOnly cookies for production
      sessionStorage.setItem('rms_access_token', session.accessToken);
      sessionStorage.setItem('rms_id_token', session.idToken);
      sessionStorage.setItem('rms_refresh_token', session.refreshToken);

      if (session.expiration !== undefined) {
        sessionStorage.setItem(
          'rms_token_expiration',
          session.expiration.toString()
        );
      }

      // Tokens stored successfully
    } catch {
      // Failed to store tokens
    }
  }

  /**
   * Map Amplify user object to our AuthUser interface
   */
  private mapAmplifyUserToAuthUser(amplifyUser: unknown): AuthUser {
    const user = amplifyUser as {
      username?: string;
      userId?: string;
      signInDetails?: { loginId?: string };
    };
    return {
      username: user.username ?? '',
      email: user.signInDetails?.loginId ?? user.username ?? '',
      attributes: {
        email: user.signInDetails?.loginId ?? user.username ?? '',
        email_verified: true, // Assume verified if user can sign in
        sub: user.userId ?? '',
      },
    };
  }

  /**
   * Convert error objects to user-friendly messages
   */
  private getErrorMessage(error: AuthError): string {
    const errorCode = error.name ?? error.code;

    switch (errorCode) {
      case AuthErrorCode.USER_NOT_CONFIRMED:
        return 'Please check your email and confirm your account before signing in.';
      case AuthErrorCode.NOT_AUTHORIZED:
        return 'Incorrect email or password. Please try again.';
      case AuthErrorCode.USER_NOT_FOUND:
        return 'No account found with this email address.';
      case AuthErrorCode.TOO_MANY_REQUESTS:
        return 'Too many login attempts. Please wait a few minutes before trying again.';
      case AuthErrorCode.INVALID_PASSWORD:
        return 'Password does not meet the required criteria.';
      case AuthErrorCode.PASSWORD_RESET_REQUIRED:
        return 'Password reset is required. Please check your email.';
      case AuthErrorCode.NETWORK_ERROR:
        return 'Network connection error. Please check your internet connection.';
      default:
        return error.message ?? 'Authentication failed. Please try again.';
    }
  }
}
