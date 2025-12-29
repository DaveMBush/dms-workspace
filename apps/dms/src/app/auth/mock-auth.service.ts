import { Injectable } from '@angular/core';

import { AuthSession, AuthUser } from './auth.types';
import { BaseAuthService } from './base-auth-service.abstract';

/**
 * Mock authentication service for local development
 * Simulates AWS Cognito behavior without requiring cloud infrastructure
 */
@Injectable({
  providedIn: 'root',
})
export class MockAuthService extends BaseAuthService {
  // Mock credentials for development
  private readonly mockCredentials = {
    username: 'dev@dms.local',
    // Using a hardcoded password for development mock service only
    // eslint-disable-next-line sonarjs/no-hardcoded-passwords -- Required for mock auth development service
    password: 'DevPassword123!',
  };

  constructor() {
    super();
    // Check for existing session in localStorage
    this.initializeAuth();
  }

  /**
   * Mock sign up
   */
  async signUp(email: string, password: string, _: string): Promise<void> {
    // Simulate sign up for mock service
    this.isLoadingSignal.set(true);
    this.errorSignal.set(null);

    try {
      // Simulate network delay
      // eslint-disable-next-line no-restricted-syntax -- Promise required for async simulation
      await new Promise(function simulateSignUpDelay(resolve) {
        setTimeout(resolve, 1000);
      });

      // For mock service, automatically sign in after sign up
      await this.signIn(email, password);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Sign up failed';
      this.errorSignal.set(errorMessage);
      throw error;
    } finally {
      this.isLoadingSignal.set(false);
    }
  }

  /**
   * Mock sign in with remember me functionality
   */
  async signInWithRememberMe(email: string, password: string): Promise<void> {
    // Store remember me preference
    localStorage.setItem('dms_remember_me', 'true');

    // Perform sign in with remember me flag
    await this.performSignInWithRememberMe(email, password);
  }

  /**
   * Mock sign out
   */
  async signOut(): Promise<void> {
    this.isLoadingSignal.set(true);

    try {
      // Simulate network delay
      // eslint-disable-next-line no-restricted-syntax -- Promise required for async simulation
      await new Promise(function simulateSignOutDelay(resolve) {
        setTimeout(resolve, 500);
      });

      await this.performSignOutCleanup();
    } catch {
      // Force local cleanup
      await this.performSignOutCleanup();
    } finally {
      this.isLoadingSignal.set(false);
    }
  }

  /**
   * Get mock access token
   */
  async getAccessToken(): Promise<string | null> {
    try {
      return await Promise.resolve(
        localStorage.getItem('dms_mock_access_token')
      );
    } catch {
      return null;
    }
  }

  /**
   * Mock token refresh
   */
  async refreshTokens(): Promise<void> {
    try {
      const currentUser = this.currentUserSignal();
      if (currentUser) {
        const isRememberMe = localStorage.getItem('dms_remember_me') === 'true';
        const expiration = this.calculateTokenExpiration(isRememberMe);

        const mockSession: AuthSession = {
          accessToken: this.generateMockJWT(currentUser, isRememberMe),
          idToken: this.generateMockJWT(currentUser, isRememberMe),
          refreshToken: 'mock-refresh-token-refreshed',
          expiration,
        };
        this.storeTokens(mockSession);
      }
    } catch {
      await this.signOut();
    }
  }

  /**
   * Mock session validation
   */
  async isSessionValid(): Promise<boolean> {
    try {
      const expiration = localStorage.getItem('dms_mock_token_expiration');
      if (expiration === null) {
        return false;
      }
      return await Promise.resolve(
        parseInt(expiration, 10) > Date.now() / 1000
      );
    } catch {
      return false;
    }
  }

  /**
   * Perform mock authentication
   */
  protected async performAuthentication(
    username: string,
    password: string
  ): Promise<void> {
    await this.performAuthenticationWithOptions(username, password, false);
  }

  /**
   * Clear stored mock tokens
   */
  protected clearTokens(): void {
    try {
      localStorage.removeItem('dms_mock_access_token');
      localStorage.removeItem('dms_mock_id_token');
      localStorage.removeItem('dms_mock_refresh_token');
      localStorage.removeItem('dms_mock_token_expiration');
      localStorage.removeItem('dms_mock_user');
    } catch {
      // Failed to clear tokens
    }
  }

  /**
   * Perform mock authentication with remember me
   */
  private async performSignInWithRememberMe(
    username: string,
    password: string
  ): Promise<void> {
    await this.performAuthenticationWithOptions(username, password, true);
  }

  /**
   * Perform mock authentication with options
   */
  private async performAuthenticationWithOptions(
    username: string,
    password: string,
    rememberMe: boolean
  ): Promise<void> {
    // Simulate network delay
    // eslint-disable-next-line no-restricted-syntax -- Promise required for async simulation
    await new Promise(function simulateDelay(resolve) {
      setTimeout(resolve, 1000);
    });

    // Accept either mock credentials or any valid email format
    const isValidCredentials =
      (username === this.mockCredentials.username &&
        password === this.mockCredentials.password) ||
      (this.isValidEmail(username) && password.length >= 8);

    if (!isValidCredentials) {
      throw new Error(
        'Invalid email format or password too short (min 8 characters)'
      );
    }

    // Create mock user
    const mockUser: AuthUser = {
      username,
      email: username,
      attributes: {
        email: username,
        email_verified: true,
        sub: 'mock-user-id-12345',
      },
    };

    this.currentUserSignal.set(mockUser);

    // Store mock session with appropriate expiration
    const expiration = this.calculateTokenExpiration(rememberMe);
    const mockSession: AuthSession = {
      accessToken: this.generateMockJWT(mockUser, rememberMe),
      idToken: this.generateMockJWT(mockUser, rememberMe),
      refreshToken: 'mock-refresh-token',
      expiration,
    };

    this.storeTokens(mockSession);

    // User signed in successfully
  }

  /**
   * Calculate token expiration time
   */
  private calculateTokenExpiration(rememberMe: boolean): number {
    const now = Math.floor(Date.now() / 1000);
    if (rememberMe) {
      // 90 days in seconds
      return now + 90 * 24 * 60 * 60;
    }
    // 1 hour in seconds
    return now + 3600;
  }

  /**
   * Initialize mock auth and check for existing session
   */
  private initializeAuth(): void {
    try {
      const storedUser = localStorage.getItem('dms_mock_user');
      const storedToken = localStorage.getItem('dms_mock_access_token');

      if (storedUser !== null && storedToken !== null) {
        const user = JSON.parse(storedUser) as AuthUser;
        this.currentUserSignal.set(user);
      }
    } catch {
      this.currentUserSignal.set(null);
    }
  }

  /**
   * Store mock authentication tokens
   */
  private storeTokens(session: AuthSession): void {
    try {
      localStorage.setItem('dms_mock_access_token', session.accessToken);
      localStorage.setItem('dms_mock_id_token', session.idToken);
      localStorage.setItem('dms_mock_refresh_token', session.refreshToken);

      if (session.expiration !== undefined) {
        localStorage.setItem(
          'dms_mock_token_expiration',
          session.expiration.toString()
        );
      }

      const currentUser = this.currentUserSignal();
      if (currentUser) {
        localStorage.setItem('dms_mock_user', JSON.stringify(currentUser));
      }
    } catch {
      // Failed to store tokens
    }
  }

  /**
   * Generate a mock JWT token
   */
  private generateMockJWT(user: AuthUser, rememberMe: boolean = false): string {
    const expiration = this.calculateTokenExpiration(rememberMe);

    // Create a simple mock JWT-like token (not cryptographically secure)
    // Using btoa for base64 encoding in browser environment only
    const header = btoa(JSON.stringify({ alg: 'MOCK', typ: 'JWT' }));
    const payload = btoa(
      JSON.stringify({
        sub: user.attributes.sub,
        email: user.email,
        username: user.username,
        exp: expiration,
        iat: Math.floor(Date.now() / 1000),
        iss: 'mock-auth-service',
        remember_me: rememberMe,
      })
    );
    const signature = btoa('mock-signature');

    return `${header}.${payload}.${signature}`;
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    // Simple email validation regex - not vulnerable to ReDoS
    // eslint-disable-next-line sonarjs/slow-regex -- Simple regex pattern is safe
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}
