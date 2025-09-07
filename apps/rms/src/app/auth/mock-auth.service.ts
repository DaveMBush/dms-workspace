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
    username: 'dev@rms.local',
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
        localStorage.getItem('rms_mock_access_token')
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
        const mockSession: AuthSession = {
          accessToken: this.generateMockJWT(currentUser),
          idToken: this.generateMockJWT(currentUser),
          refreshToken: 'mock-refresh-token-refreshed',
          expiration: Math.floor(Date.now() / 1000) + 3600,
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
      const expiration = localStorage.getItem('rms_mock_token_expiration');
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

    // Store mock session
    const mockSession: AuthSession = {
      accessToken: this.generateMockJWT(mockUser),
      idToken: this.generateMockJWT(mockUser),
      refreshToken: 'mock-refresh-token',
      expiration: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
    };

    this.storeTokens(mockSession);

    // User signed in successfully
  }

  /**
   * Clear stored mock tokens
   */
  protected clearTokens(): void {
    try {
      localStorage.removeItem('rms_mock_access_token');
      localStorage.removeItem('rms_mock_id_token');
      localStorage.removeItem('rms_mock_refresh_token');
      localStorage.removeItem('rms_mock_token_expiration');
      localStorage.removeItem('rms_mock_user');
    } catch {
      // Failed to clear tokens
    }
  }

  /**
   * Initialize mock auth and check for existing session
   */
  private initializeAuth(): void {
    try {
      const storedUser = localStorage.getItem('rms_mock_user');
      const storedToken = localStorage.getItem('rms_mock_access_token');

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
      localStorage.setItem('rms_mock_access_token', session.accessToken);
      localStorage.setItem('rms_mock_id_token', session.idToken);
      localStorage.setItem('rms_mock_refresh_token', session.refreshToken);

      if (session.expiration !== undefined) {
        localStorage.setItem(
          'rms_mock_token_expiration',
          session.expiration.toString()
        );
      }

      const currentUser = this.currentUserSignal();
      if (currentUser) {
        localStorage.setItem('rms_mock_user', JSON.stringify(currentUser));
      }
    } catch {
      // Failed to store tokens
    }
  }

  /**
   * Generate a mock JWT token
   */
  private generateMockJWT(user: AuthUser): string {
    // Create a simple mock JWT-like token (not cryptographically secure)
    // Using btoa for base64 encoding in browser environment only
    // eslint-disable-next-line sonarjs/deprecation, @typescript-eslint/no-deprecated -- btoa acceptable for mock JWT in browser
    const header = btoa(JSON.stringify({ alg: 'MOCK', typ: 'JWT' }));
    // eslint-disable-next-line sonarjs/deprecation, @typescript-eslint/no-deprecated -- btoa acceptable for mock JWT in browser
    const payload = btoa(
      JSON.stringify({
        sub: user.attributes.sub,
        email: user.email,
        username: user.username,
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        iss: 'mock-auth-service',
      })
    );
    // eslint-disable-next-line sonarjs/deprecation, @typescript-eslint/no-deprecated -- btoa acceptable for mock JWT in browser
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
