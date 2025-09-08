import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { ProfileService } from './profile.service';

// Mock AWS Amplify Auth
vi.mock('@aws-amplify/auth', () => ({
  getCurrentUser: vi.fn(),
  fetchAuthSession: vi.fn(),
  changePassword: vi.fn(),
  updateUserAttributes: vi.fn(),
  verifyUserAttribute: vi.fn(),
  resetPassword: vi.fn(),
  confirmResetPassword: vi.fn(),
}));

describe('ProfileService', () => {
  let service: ProfileService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ProfileService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('loadUserProfile', () => {
    it('should load user profile successfully', async () => {
      const mockUser = {
        username: 'testuser',
        signInDetails: { loginId: 'test@example.com' },
      };
      const mockSession = {
        tokens: {
          idToken: { payload: { iat: 1640995200 } },
          accessToken: { payload: { exp: 1641081600 } },
        },
      };

      const { getCurrentUser, fetchAuthSession } = await import(
        '@aws-amplify/auth'
      );
      vi.mocked(getCurrentUser).mockResolvedValue(mockUser);
      vi.mocked(fetchAuthSession).mockResolvedValue(mockSession);

      await service.loadUserProfile();

      expect(service.profile()).toBeTruthy();
      expect(service.profile()?.username).toBe('testuser');
      expect(service.profile()?.email).toBe('test@example.com');
      expect(service.loading()).toBe(false);
      expect(service.profileError()).toBe(null);
    });

    it('should handle load profile error', async () => {
      const { getCurrentUser } = await import('@aws-amplify/auth');
      vi.mocked(getCurrentUser).mockRejectedValue(new Error('Load failed'));

      try {
        await service.loadUserProfile();
      } catch {
        // Expected error
      }

      expect(service.profile()).toBe(null);
      expect(service.loading()).toBe(false);
      expect(service.profileError()).toBe('Failed to load profile information');
    });
  });

  describe('changeUserPassword', () => {
    it('should change password successfully', async () => {
      const { changePassword, getCurrentUser } = await import(
        '@aws-amplify/auth'
      );
      const mockUser = { username: 'testuser' };

      vi.mocked(getCurrentUser).mockResolvedValue(mockUser);
      vi.mocked(changePassword).mockResolvedValue(undefined);

      await expect(
        service.changeUserPassword('oldpass', 'newpass')
      ).resolves.not.toThrow();

      expect(changePassword).toHaveBeenCalledWith({
        oldPassword: 'oldpass',
        newPassword: 'newpass',
      });
      expect(service.loading()).toBe(false);
      expect(service.profileError()).toBe(null);
    });

    it('should handle password change error', async () => {
      const { changePassword, getCurrentUser } = await import(
        '@aws-amplify/auth'
      );
      const mockUser = { username: 'testuser' };
      const error = {
        name: 'NotAuthorizedException',
        message: 'Incorrect password',
      };

      vi.mocked(getCurrentUser).mockResolvedValue(mockUser);
      vi.mocked(changePassword).mockRejectedValue(error);

      await expect(
        service.changeUserPassword('oldpass', 'newpass')
      ).rejects.toThrow();

      expect(service.loading()).toBe(false);
      expect(service.profileError()).toBe('Current password is incorrect');
    });
  });

  describe('updateEmail', () => {
    it('should update email successfully', async () => {
      const { updateUserAttributes } = await import('@aws-amplify/auth');
      vi.mocked(updateUserAttributes).mockResolvedValue({
        email: { deliveryMedium: 'EMAIL' },
      });

      await expect(
        service.updateEmail('new@example.com')
      ).resolves.not.toThrow();

      expect(updateUserAttributes).toHaveBeenCalledWith({
        userAttributes: { email: 'new@example.com' },
      });
      expect(service.loading()).toBe(false);
      expect(service.profileError()).toBe(null);
    });

    it('should handle update email error', async () => {
      const { updateUserAttributes } = await import('@aws-amplify/auth');
      const error = {
        name: 'InvalidParameterException',
        message: 'Invalid email',
      };

      vi.mocked(updateUserAttributes).mockRejectedValue(error);

      await expect(service.updateEmail('invalid-email')).rejects.toThrow();

      expect(service.loading()).toBe(false);
      expect(service.profileError()).toBe('Invalid input parameters');
    });
  });

  describe('verifyEmailChange', () => {
    it('should verify email change successfully', async () => {
      const { verifyUserAttribute } = await import('@aws-amplify/auth');
      vi.mocked(verifyUserAttribute).mockResolvedValue();

      // Mock loadUserProfile to avoid actual profile loading
      const loadProfileSpy = vi
        .spyOn(service, 'loadUserProfile')
        .mockResolvedValue();

      await expect(service.verifyEmailChange('123456')).resolves.not.toThrow();

      expect(verifyUserAttribute).toHaveBeenCalledWith({
        userAttributeKey: 'email',
        confirmationCode: '123456',
      });
      expect(loadProfileSpy).toHaveBeenCalled();
    });

    it('should handle verify email error', async () => {
      const { verifyUserAttribute } = await import('@aws-amplify/auth');
      const error = { name: 'CodeMismatchException', message: 'Invalid code' };

      vi.mocked(verifyUserAttribute).mockRejectedValue(error);

      await expect(service.verifyEmailChange('wrong-code')).rejects.toThrow();
    });
  });

  describe('initiatePasswordReset', () => {
    it('should initiate password reset successfully', async () => {
      const { resetPassword } = await import('@aws-amplify/auth');
      vi.mocked(resetPassword).mockResolvedValue({ isPasswordReset: false });

      await expect(
        service.initiatePasswordReset('test@example.com')
      ).resolves.not.toThrow();

      expect(resetPassword).toHaveBeenCalledWith({
        username: 'test@example.com',
      });
    });

    it('should handle password reset error', async () => {
      const { resetPassword } = await import('@aws-amplify/auth');
      const error = {
        name: 'UserNotFoundException',
        message: 'User not found',
      };

      vi.mocked(resetPassword).mockRejectedValue(error);

      await expect(
        service.initiatePasswordReset('nonexistent@example.com')
      ).rejects.toThrow();
    });
  });

  describe('confirmPasswordReset', () => {
    it('should confirm password reset successfully', async () => {
      const { confirmResetPassword } = await import('@aws-amplify/auth');
      vi.mocked(confirmResetPassword).mockResolvedValue();

      await expect(
        service.confirmPasswordReset(
          'test@example.com',
          '123456',
          'newpassword'
        )
      ).resolves.not.toThrow();

      expect(confirmResetPassword).toHaveBeenCalledWith({
        username: 'test@example.com',
        confirmationCode: '123456',
        newPassword: 'newpassword',
      });
    });

    it('should handle confirm password reset error', async () => {
      const { confirmResetPassword } = await import('@aws-amplify/auth');
      const error = { name: 'ExpiredCodeException', message: 'Code expired' };

      vi.mocked(confirmResetPassword).mockRejectedValue(error);

      await expect(
        service.confirmPasswordReset(
          'test@example.com',
          'expired',
          'newpassword'
        )
      ).rejects.toThrow();
    });
  });

  describe('getErrorMessage', () => {
    it('should return correct error messages for known error types', () => {
      const service = TestBed.inject(ProfileService);

      // Access private method for testing
      const getErrorMessage = (service as any).getErrorMessage.bind(service);

      expect(getErrorMessage({ name: 'NotAuthorizedException' })).toBe(
        'Current password is incorrect'
      );
      expect(getErrorMessage({ name: 'InvalidPasswordException' })).toBe(
        'New password does not meet requirements'
      );
      expect(getErrorMessage({ name: 'LimitExceededException' })).toBe(
        'Too many attempts. Please try again later'
      );
      expect(
        getErrorMessage({ name: 'UnknownError', message: 'Custom message' })
      ).toBe('Custom message');
      expect(getErrorMessage({})).toBe('Operation failed. Please try again');
    });
  });
});
