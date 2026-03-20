import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import {
  applicationConfig,
  type Meta,
  type StoryObj,
} from '@storybook/angular';
import { of } from 'rxjs';

import { ConfirmDialogService } from '../../shared/services/confirm-dialog.service';
import { NotificationService } from '../../shared/services/notification.service';
import { AuthService } from '../auth.service';
import { ProfileService } from '../services/profile.service';
import { ProfileActionsService } from '../services/profile-actions.service';
import { UserProfile } from '../types/profile.types';
import { ProfileComponent } from './profile';

const mockProfile: UserProfile = {
  username: 'dev@dms.local',
  email: 'dev@dms.local',
  emailVerified: true,
  name: 'Dev User',
  createdAt: new Date('2024-01-15T10:30:00Z'),
  lastModified: new Date('2025-03-20T14:22:00Z'),
  sessionInfo: {
    loginTime: new Date(Date.now() - 30 * 60 * 1000),
    tokenExpiration: new Date(Date.now() + 30 * 60 * 1000),
    sessionDuration: 30 * 60 * 1000,
  },
};

const mockProfileService = {
  profile: signal<UserProfile | null>(mockProfile),
  loading: signal(false),
  profileError: signal<string | null>(null),
  loadUserProfile: async function mockLoadUserProfile(): Promise<void> {
    /* noop */
  },
  changeUserPassword: async function mockChangePassword(): Promise<void> {
    /* noop */
  },
  updateEmail: async function mockUpdateEmail(): Promise<void> {
    /* noop */
  },
  verifyEmailChange: async function mockVerifyEmailChange(): Promise<void> {
    /* noop */
  },
  sendEmailVerificationCode: async function mockSendCode(): Promise<void> {
    /* noop */
  },
  initiatePasswordReset: async function mockInitReset(): Promise<void> {
    /* noop */
  },
  confirmPasswordReset: async function mockConfirmReset(): Promise<void> {
    /* noop */
  },
};

const mockAuthService = {
  currentUser: signal({ username: 'dev@dms.local', attributes: {} }),
  isLoading: signal(false),
  error: signal(null),
  isAuthenticated: signal(true),
  signIn: async function mockSignIn(): Promise<void> {
    /* noop */
  },
  signInWithRememberMe: async function mockSignInRemember(): Promise<void> {
    /* noop */
  },
  signOut: async function mockSignOut(): Promise<void> {
    /* noop */
  },
  signUp: async function mockSignUp(): Promise<void> {
    /* noop */
  },
  getAccessToken: async function mockGetToken(): Promise<string | null> {
    return 'mock-token';
  },
  refreshTokens: async function mockRefresh(): Promise<void> {
    /* noop */
  },
  isSessionValid: async function mockIsValid(): Promise<boolean> {
    return true;
  },
  clearError: function mockClearError(): void {
    /* noop */
  },
};

const mockProfileActionsService = {
  changePassword: async function mockChangePassword(): Promise<boolean> {
    return true;
  },
  updateEmail: async function mockUpdateEmail(): Promise<boolean> {
    return true;
  },
  verifyEmailChange: async function mockVerifyEmail(): Promise<boolean> {
    return true;
  },
  confirmSignOut: function mockSignOut(): void {
    /* noop */
  },
  confirmSignOutAllDevices: function mockSignOutAll(): void {
    /* noop */
  },
};

const mockConfirmDialogService = {
  confirm: function mockConfirm() {
    return of(true);
  },
};

const mockNotificationService = {
  success: function mockSuccess(): void {
    /* noop */
  },
  error: function mockError(): void {
    /* noop */
  },
  info: function mockInfo(): void {
    /* noop */
  },
  warn: function mockWarn(): void {
    /* noop */
  },
  show: function mockShow(): void {
    /* noop */
  },
};

const meta: Meta<ProfileComponent> = {
  title: 'Pages/Profile',
  component: ProfileComponent,
  decorators: [
    applicationConfig({
      providers: [
        provideRouter([]),
        { provide: ProfileService, useValue: mockProfileService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: ProfileActionsService, useValue: mockProfileActionsService },
        { provide: ConfirmDialogService, useValue: mockConfirmDialogService },
        { provide: NotificationService, useValue: mockNotificationService },
      ],
    }),
  ],
};

export default meta;

type Story = StoryObj<ProfileComponent>;

export const LightMode: Story = {};

export const DarkMode: Story = {
  decorators: [
    function applyDarkTheme(story) {
      const result = story();
      document.body.classList.add('dark-theme');
      return result;
    },
  ],
};
