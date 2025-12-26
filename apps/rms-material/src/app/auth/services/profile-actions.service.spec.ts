import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { vi } from 'vitest';
import { of } from 'rxjs';
import { ProfileActionsService } from './profile-actions.service';
import { AuthService } from '../auth.service';
import { ProfileService } from './profile.service';
import { ConfirmDialogService } from '../../shared/services/confirm-dialog.service';
import { NotificationService } from '../../shared/services/notification.service';

describe('ProfileActionsService', () => {
  let service: ProfileActionsService;
  let authService: jest.Mocked<AuthService>;
  let profileService: jest.Mocked<ProfileService>;
  let router: jest.Mocked<Router>;
  let confirmDialogService: jest.Mocked<ConfirmDialogService>;
  let notificationService: jest.Mocked<NotificationService>;

  beforeEach(() => {
    const authServiceMock = {
      signOut: vi.fn().mockResolvedValue(undefined),
    };

    const profileServiceMock = {
      changeUserPassword: vi.fn().mockResolvedValue(undefined),
      updateEmail: vi.fn().mockResolvedValue(undefined),
      verifyEmailChange: vi.fn().mockResolvedValue(undefined),
    };

    const routerMock = {
      navigate: vi.fn().mockResolvedValue(true),
    };

    const confirmDialogServiceMock = {
      confirm: vi.fn().mockReturnValue(of(true)),
    };

    const notificationServiceMock = {
      success: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        ProfileActionsService,
        { provide: AuthService, useValue: authServiceMock },
        { provide: ProfileService, useValue: profileServiceMock },
        { provide: Router, useValue: routerMock },
        { provide: ConfirmDialogService, useValue: confirmDialogServiceMock },
        { provide: NotificationService, useValue: notificationServiceMock },
      ],
    });

    service = TestBed.inject(ProfileActionsService);
    authService = TestBed.inject(AuthService) as jest.Mocked<AuthService>;
    profileService = TestBed.inject(
      ProfileService
    ) as jest.Mocked<ProfileService>;
    router = TestBed.inject(Router) as jest.Mocked<Router>;
    confirmDialogService = TestBed.inject(
      ConfirmDialogService
    ) as jest.Mocked<ConfirmDialogService>;
    notificationService = TestBed.inject(
      NotificationService
    ) as jest.Mocked<NotificationService>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      const result = await service.changePassword('oldpass', 'newpass');

      expect(profileService.changeUserPassword).toHaveBeenCalledWith(
        'oldpass',
        'newpass'
      );
      expect(notificationService.success).toHaveBeenCalledWith(
        'Password changed successfully'
      );
      expect(result).toBe(true);
    });

    it('should handle password change error', async () => {
      profileService.changeUserPassword.mockRejectedValue(
        new Error('Change failed')
      );

      const result = await service.changePassword('oldpass', 'newpass');

      expect(notificationService.error).toHaveBeenCalledWith(
        'Password change failed. Please try again.'
      );
      expect(result).toBe(false);
    });
  });

  describe('updateEmail', () => {
    it('should update email successfully', async () => {
      const result = await service.updateEmail('new@example.com');

      expect(profileService.updateEmail).toHaveBeenCalledWith(
        'new@example.com'
      );
      expect(notificationService.info).toHaveBeenCalledWith(
        'Please check your email for the verification code'
      );
      expect(result).toBe(true);
    });

    it('should handle email update error', async () => {
      profileService.updateEmail.mockRejectedValue(new Error('Update failed'));

      const result = await service.updateEmail('new@example.com');

      expect(notificationService.error).toHaveBeenCalledWith(
        'Email change failed. Please try again.'
      );
      expect(result).toBe(false);
    });
  });

  describe('verifyEmailChange', () => {
    it('should verify email change successfully', async () => {
      const result = await service.verifyEmailChange('123456');

      expect(profileService.verifyEmailChange).toHaveBeenCalledWith('123456');
      expect(notificationService.success).toHaveBeenCalledWith(
        'Email address updated successfully'
      );
      expect(result).toBe(true);
    });

    it('should handle empty verification code', async () => {
      const result = await service.verifyEmailChange('');

      expect(profileService.verifyEmailChange).not.toHaveBeenCalled();
      expect(notificationService.warn).toHaveBeenCalledWith(
        'Please enter the verification code'
      );
      expect(result).toBe(false);
    });

    it('should handle verification error', async () => {
      profileService.verifyEmailChange.mockRejectedValue(
        new Error('Verification failed')
      );

      const result = await service.verifyEmailChange('123456');

      expect(notificationService.error).toHaveBeenCalledWith(
        'Email verification failed. Please check the code.'
      );
      expect(result).toBe(false);
    });
  });

  describe('confirmSignOut', () => {
    it('should show sign out confirmation', () => {
      service.confirmSignOut();

      expect(confirmDialogService.confirm).toHaveBeenCalledWith({
        title: 'Confirm Sign Out',
        message:
          'Are you sure you want to sign out? You will need to log in again.',
        confirmText: 'Yes, Sign Out',
        cancelText: 'Cancel',
      });
    });
  });

  describe('confirmSignOutAllDevices', () => {
    it('should show sign out all devices confirmation', () => {
      service.confirmSignOutAllDevices();

      expect(confirmDialogService.confirm).toHaveBeenCalledWith({
        title: 'Confirm Sign Out All Devices',
        message:
          'This will sign you out from all devices and browsers. Continue?',
        confirmText: 'Yes, Sign Out All',
        cancelText: 'Cancel',
      });
    });
  });
});
