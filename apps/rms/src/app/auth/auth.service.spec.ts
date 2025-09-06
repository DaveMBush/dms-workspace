/* eslint-disable sonarjs/no-hardcoded-passwords -- Test passwords needed for authentication testing */
/* eslint-disable @typescript-eslint/unbound-method -- Testing requires mocking bound methods */
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import {
  signIn,
  signOut,
  getCurrentUser,
  fetchAuthSession,
} from '@aws-amplify/auth';
import { Amplify } from '@aws-amplify/core';
import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';

import { AuthService } from './auth.service';
import { AuthErrorCode, SignInRequest } from './auth.types';

// Mock AWS Amplify modules
vi.mock('@aws-amplify/auth', () => ({
  signIn: vi.fn(),
  signOut: vi.fn(),
  getCurrentUser: vi.fn(),
  fetchAuthSession: vi.fn(),
}));

vi.mock('@aws-amplify/core', () => ({
  Amplify: {
    configure: vi.fn(),
  },
}));

// Mock Router
const mockRouter = {
  navigate: vi.fn(),
};

// Mock environment
vi.mock('../../environments/environment', () => ({
  environment: {
    cognito: {
      region: 'us-east-1',
      userPoolId: 'us-east-1_test123',
      userPoolWebClientId: 'test-client-id',
      domain: 'test.auth.us-east-1.amazoncognito.com',
      scopes: ['openid', 'email', 'profile'],
      redirectSignIn: 'http://localhost:4200',
      redirectSignOut: 'http://localhost:4200/auth/signout',
    },
  },
}));

describe('AuthService', () => {
  let service: AuthService;
  let mockSignIn: Mock;
  let mockSignOut: Mock;
  let mockGetCurrentUser: Mock;
  let mockFetchAuthSession: Mock;

  const mockUser = {
    username: 'testuser@example.com',
    userId: 'test-user-id-123',
    signInDetails: {
      loginId: 'testuser@example.com',
    },
  };

  const mockSession = {
    tokens: {
      accessToken: {
        toString: () => 'mock-access-token',
        payload: {
          exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
        },
      },
      idToken: {
        toString: () => 'mock-id-token',
      },
      refreshToken: {
        toString: () => 'mock-refresh-token',
      },
    },
  };

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Setup mock implementations
    mockSignIn = signIn as Mock;
    mockSignOut = signOut as Mock;
    mockGetCurrentUser = getCurrentUser as Mock;
    mockFetchAuthSession = fetchAuthSession as Mock;

    // Configure TestBed
    TestBed.configureTestingModule({
      providers: [AuthService, { provide: Router, useValue: mockRouter }],
    });

    service = TestBed.inject(AuthService);
  });

  describe('Service Initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should configure Amplify on initialization', async () => {
      // Wait for the setTimeout to complete
      await vi.waitFor(() => {
        expect(Amplify.configure).toHaveBeenCalledWith({
          Auth: {
            Cognito: {
              userPoolId: 'us-east-1_test123',
              userPoolClientId: 'test-client-id',
              loginWith: {
                oauth: {
                  domain: 'test.auth.us-east-1.amazoncognito.com',
                  scopes: ['openid', 'email', 'profile'],
                  redirectSignIn: ['http://localhost:4200'],
                  redirectSignOut: ['http://localhost:4200/auth/signout'],
                  responseType: 'code',
                },
              },
            },
          },
        });
      });
    });

    it('should initialize with no authenticated user', () => {
      expect(service.isAuthenticated()).toBe(false);
      expect(service.currentUser()).toBeNull();
    });
  });

  describe('Sign In', () => {
    const validCredentials: SignInRequest = {
      username: 'testuser@example.com',
      password: 'ValidPassword123!',
    };

    it('should successfully sign in with valid credentials', async () => {
      // Arrange
      mockSignIn.mockResolvedValue({ isSignedIn: true });
      mockGetCurrentUser.mockResolvedValue(mockUser);
      mockFetchAuthSession.mockResolvedValue(mockSession);

      // Act
      await service.signIn(validCredentials);

      // Assert
      expect(mockSignIn).toHaveBeenCalledWith({
        username: validCredentials.username,
        password: validCredentials.password,
        options: {
          authFlowType: 'USER_SRP_AUTH',
        },
      });
      expect(service.isAuthenticated()).toBe(true);
      expect(service.currentUser()?.email).toBe('testuser@example.com');
      expect(service.isLoading()).toBe(false);
      expect(service.error()).toBeNull();
    });

    it('should handle sign in failure with invalid credentials', async () => {
      // Arrange
      const authError = {
        name: AuthErrorCode.NOT_AUTHORIZED,
        message: 'Incorrect username or password',
      };
      mockSignIn.mockRejectedValue(authError);

      // Act & Assert
      await expect(service.signIn(validCredentials)).rejects.toThrow();
      expect(service.isAuthenticated()).toBe(false);
      expect(service.error()).toBe(
        'Incorrect email or password. Please try again.'
      );
      expect(service.isLoading()).toBe(false);
    });

    it('should handle user not confirmed error', async () => {
      // Arrange
      const authError = {
        name: AuthErrorCode.USER_NOT_CONFIRMED,
        message: 'User not confirmed',
      };
      mockSignIn.mockRejectedValue(authError);

      // Act & Assert
      await expect(service.signIn(validCredentials)).rejects.toThrow();
      expect(service.error()).toBe(
        'Please check your email and confirm your account before signing in.'
      );
    });

    it('should handle too many requests error', async () => {
      // Arrange
      const authError = {
        name: AuthErrorCode.TOO_MANY_REQUESTS,
        message: 'Too many requests',
      };
      mockSignIn.mockRejectedValue(authError);

      // Act & Assert
      await expect(service.signIn(validCredentials)).rejects.toThrow();
      expect(service.error()).toBe(
        'Too many login attempts. Please wait a few minutes before trying again.'
      );
    });

    it('should set loading state during sign in process', async () => {
      // Arrange
      let loadingDuringSignIn = false;
      mockSignIn.mockImplementation(() => {
        loadingDuringSignIn = service.isLoading();
        return Promise.resolve({ isSignedIn: true });
      });
      mockGetCurrentUser.mockResolvedValue(mockUser);
      mockFetchAuthSession.mockResolvedValue(mockSession);

      // Act
      await service.signIn(validCredentials);

      // Assert
      expect(loadingDuringSignIn).toBe(true);
      expect(service.isLoading()).toBe(false);
    });
  });

  describe('Sign Out', () => {
    beforeEach(async () => {
      // Setup authenticated state
      mockSignIn.mockResolvedValue({ isSignedIn: true });
      mockGetCurrentUser.mockResolvedValue(mockUser);
      mockFetchAuthSession.mockResolvedValue(mockSession);
      await service.signIn({
        username: 'test@example.com',
        password: 'password',
      });
    });

    it('should successfully sign out', async () => {
      // Arrange
      mockSignOut.mockResolvedValue(undefined);

      // Act
      await service.signOut();

      // Assert
      expect(mockSignOut).toHaveBeenCalled();
      expect(service.isAuthenticated()).toBe(false);
      expect(service.currentUser()).toBeNull();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/auth/login']);
    });

    it('should clear local state even if server sign out fails', async () => {
      // Arrange
      mockSignOut.mockRejectedValue(new Error('Network error'));

      // Act
      await service.signOut();

      // Assert
      expect(service.isAuthenticated()).toBe(false);
      expect(service.currentUser()).toBeNull();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/auth/login']);
    });
  });

  describe('Token Management', () => {
    beforeEach(async () => {
      // Setup authenticated state
      mockSignIn.mockResolvedValue({ isSignedIn: true });
      mockGetCurrentUser.mockResolvedValue(mockUser);
      mockFetchAuthSession.mockResolvedValue(mockSession);
      await service.signIn({
        username: 'test@example.com',
        password: 'password',
      });
    });

    it('should get access token', async () => {
      // Arrange
      mockFetchAuthSession.mockResolvedValue(mockSession);

      // Act
      const token = await service.getAccessToken();

      // Assert
      expect(token).toBe('mock-access-token');
    });

    it('should return null when token fetch fails', async () => {
      // Arrange
      mockFetchAuthSession.mockRejectedValue(new Error('Session expired'));

      // Act
      const token = await service.getAccessToken();

      // Assert
      expect(token).toBeNull();
    });

    it('should validate session correctly for non-expired token', async () => {
      // Arrange
      const futureExpiration = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      mockFetchAuthSession.mockResolvedValue({
        tokens: {
          accessToken: {
            payload: { exp: futureExpiration },
          },
        },
      });

      // Act
      const isValid = await service.isSessionValid();

      // Assert
      expect(isValid).toBe(true);
    });

    it('should validate session correctly for expired token', async () => {
      // Arrange
      const pastExpiration = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
      mockFetchAuthSession.mockResolvedValue({
        tokens: {
          accessToken: {
            payload: { exp: pastExpiration },
          },
        },
      });

      // Act
      const isValid = await service.isSessionValid();

      // Assert
      expect(isValid).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should clear error when clearError is called', () => {
      // Arrange - Set an error first
      const authError = {
        name: AuthErrorCode.NOT_AUTHORIZED,
        message: 'Test error',
      };
      mockSignIn.mockRejectedValue(authError);

      // Act
      service.signIn({ username: 'test', password: 'test' }).catch(() => {
        // Expected to fail
      });

      // Clear the error
      service.clearError();

      // Assert
      expect(service.error()).toBeNull();
    });
  });

  describe('Computed Signals', () => {
    it('should update authState computed signal correctly', async () => {
      // Initial state
      let authState = service.authState();
      expect(authState.isAuthenticated).toBe(false);
      expect(authState.user).toBeNull();
      expect(authState.isLoading).toBe(false);
      expect(authState.error).toBeNull();

      // Simulate sign in
      mockSignIn.mockResolvedValue({ isSignedIn: true });
      mockGetCurrentUser.mockResolvedValue(mockUser);
      mockFetchAuthSession.mockResolvedValue(mockSession);

      await service.signIn({
        username: 'test@example.com',
        password: 'password',
      });

      // Check updated state
      authState = service.authState();
      expect(authState.isAuthenticated).toBe(true);
      expect(authState.user).toBeTruthy();
      expect(authState.isLoading).toBe(false);
      expect(authState.error).toBeNull();
    });
  });
});
