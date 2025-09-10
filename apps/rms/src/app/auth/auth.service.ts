import { inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  fetchAuthSession,
  getCurrentUser,
  signIn,
  signOut,
} from '@aws-amplify/auth';
import { filter } from 'rxjs/operators';

import { AuthError, AuthErrorCode, AuthSession, AuthUser } from './auth.types';
import { BaseAuthService } from './base-auth-service.abstract';
import {
  SessionEvent,
  SessionEventType,
  SessionManagerService,
  SessionStatus,
} from './services/session-manager.service';
import { TokenRefreshService } from './services/token-refresh.service';
import { UserProfile } from './services/user-state.service';

@Injectable({
  providedIn: 'root',
})
export class AuthService extends BaseAuthService {
  private sessionManager = inject(SessionManagerService);
  private tokenRefresh = inject(TokenRefreshService);

  // Session-related signals
  private rememberMePreference = signal(false);

  constructor() {
    super();

    // Set up session event listeners
    this.setupSessionEventListeners();

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
   * Sign in with remember me functionality
   */
  async signInWithRememberMe(email: string, password: string): Promise<void> {
    this.rememberMePreference.set(true);
    await this.signIn(email, password);
  }

  /**
   * Sign out current user
   */
  async signOut(): Promise<void> {
    this.isLoadingSignal.set(true);

    try {
      // Expire session in session manager
      this.sessionManager.expireSession(true);

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
      const success = await this.tokenRefresh.refreshToken();
      if (!success) {
        throw new Error('Token refresh failed');
      }

      // Update session with new token expiration
      const tokenExpiration = this.tokenRefresh.getTokenExpiration();
      if (tokenExpiration) {
        this.sessionManager.getSessionStats();
      }
    } catch {
      // Token refresh failed, sign out user
      await this.signOut();
    }
  }

  /**
   * Check if current session is valid and not expired
   */
  async isSessionValid(): Promise<boolean> {
    try {
      // Check session manager status first
      if (!this.sessionManager.isActive()) {
        return false;
      }

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
   * Extend current session
   */
  async extendSession(): Promise<boolean> {
    return this.sessionManager.extendSession();
  }

  /**
   * Get session manager instance for component access
   */
  getSessionManager(): SessionManagerService {
    return this.sessionManager;
  }

  /**
   * Check if remember me is enabled for current session
   */
  isRememberMeSession(): boolean {
    return this.sessionManager.isRememberMeSession();
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

        // Create user profile for session manager
        const userProfile: UserProfile = {
          username: authUser.username,
          email: authUser.email,
          permissions: [], // Add permissions logic as needed
          attributes: authUser.attributes ?? {},
        };

        // Start session management
        this.sessionManager.startSession(
          userProfile,
          this.rememberMePreference()
        );

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
   * Initialize Auth and check for existing session
   */
  private async initializeAuth(): Promise<void> {
    try {
      // Check for existing authenticated user
      const user = await getCurrentUser();
      if (user !== null) {
        const authUser = this.mapAmplifyUserToAuthUser(user);
        this.currentUserSignal.set(authUser);

        // Create user profile for session manager
        const userProfile: UserProfile = {
          username: authUser.username,
          email: authUser.email,
          permissions: [], // Add permissions logic as needed
          attributes: authUser.attributes ?? {},
        };

        this.restoreUserSession(userProfile);

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
   * Restore user session if it exists
   */
  private restoreUserSession(userProfile: UserProfile): void {
    const userState = this.sessionManager.getSessionStats();
    if (userState.status === SessionStatus.Expired) {
      const rememberMe = localStorage.getItem('rms_remember_me') === 'true';
      this.sessionManager.startSession(userProfile, rememberMe);
    }
  }

  /**
   * Set up session event listeners
   */
  private setupSessionEventListeners(): void {
    this.sessionManager.sessionEvents
      .pipe(
        takeUntilDestroyed(),
        filter(function filterSessionEvents(event: SessionEvent) {
          return (
            event.type === SessionEventType.SessionExpired ||
            event.type === SessionEventType.TokenRefreshFailed
          );
        })
      )
      .subscribe(
        function handleSessionEvent(this: AuthService, event: SessionEvent) {
          if (event.type === SessionEventType.SessionExpired) {
            void this.performSignOutCleanup();
          } else if (event.type === SessionEventType.TokenRefreshFailed) {
            void this.signOut();
          }
        }.bind(this)
      );
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
