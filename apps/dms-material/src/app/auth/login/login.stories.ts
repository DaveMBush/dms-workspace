import { computed, signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import {
  applicationConfig,
  type Meta,
  type StoryObj,
} from '@storybook/angular';

import { AuthService } from '../auth.service';
import { LoginComponent } from './login';

const mockCurrentUser = signal<object | null>(null);
const mockIsLoading = signal(false);
const mockError = signal<string | null>(null);

const mockAuthService = {
  currentUser: mockCurrentUser,
  isLoading: mockIsLoading,
  error: mockError,
  isAuthenticated: computed(function computeIsAuthenticated() {
    return mockCurrentUser() !== null;
  }),
  authState: computed(function computeAuthState() {
    return {
      user: mockCurrentUser(),
      isLoading: mockIsLoading(),
      error: mockError(),
      isAuthenticated: mockCurrentUser() !== null,
    };
  }),
  signIn: async function mockSignIn(): Promise<void> {
    /* noop */
  },
  signInWithRememberMe:
    async function mockSignInWithRememberMe(): Promise<void> {
      /* noop */
    },
  signOut: async function mockSignOut(): Promise<void> {
    /* noop */
  },
  signUp: async function mockSignUp(): Promise<void> {
    /* noop */
  },
  getAccessToken: async function mockGetAccessToken(): Promise<string | null> {
    return 'mock-token';
  },
  refreshTokens: async function mockRefreshTokens(): Promise<void> {
    /* noop */
  },
  isSessionValid: async function mockIsSessionValid(): Promise<boolean> {
    return true;
  },
  clearError: function mockClearError(): void {
    /* noop */
  },
};

const meta: Meta<LoginComponent> = {
  title: 'Pages/Login',
  component: LoginComponent,
  decorators: [
    applicationConfig({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: mockAuthService },
      ],
    }),
  ],
};

export default meta;

type Story = StoryObj<LoginComponent>;

export const LightMode: Story = {
  decorators: [
    function removeDarkTheme(story) {
      const result = story();
      document.body.classList.remove('dark-theme');
      return result;
    },
  ],
};

export const DarkMode: Story = {
  decorators: [
    function applyDarkTheme(story) {
      const result = story();
      document.body.classList.add('dark-theme');
      return result;
    },
  ],
};
