import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { vi } from 'vitest';
import { ProfileActionsService } from './profile-actions.service';
import { AuthService } from '../auth.service';
import { ProfileService } from './profile.service';

describe('ProfileActionsService', () => {
  let service: ProfileActionsService;
  let authService: jest.Mocked<AuthService>;
  let profileService: jest.Mocked<ProfileService>;
  let router: jest.Mocked<Router>;
  let confirmationService: jest.Mocked<ConfirmationService>;
  let messageService: jest.Mocked<MessageService>;

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

    const confirmationServiceMock = {
      confirm: vi.fn(),
    };

    const messageServiceMock = {
      add: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        ProfileActionsService,
        { provide: AuthService, useValue: authServiceMock },
        { provide: ProfileService, useValue: profileServiceMock },
        { provide: Router, useValue: routerMock },
        { provide: ConfirmationService, useValue: confirmationServiceMock },
        { provide: MessageService, useValue: messageServiceMock },
      ],
    });

    service = TestBed.inject(ProfileActionsService);
    authService = TestBed.inject(AuthService) as jest.Mocked<AuthService>;
    profileService = TestBed.inject(
      ProfileService
    ) as jest.Mocked<ProfileService>;
    router = TestBed.inject(Router) as jest.Mocked<Router>;
    confirmationService = TestBed.inject(
      ConfirmationService
    ) as jest.Mocked<ConfirmationService>;
    messageService = TestBed.inject(
      MessageService
    ) as jest.Mocked<MessageService>;
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
      expect(messageService.add).toHaveBeenCalledWith({
        severity: 'success',
        summary: 'Success',
        detail: 'Password changed successfully',
      });
      expect(result).toBe(true);
    });

    it('should handle password change error', async () => {
      profileService.changeUserPassword.mockRejectedValue(
        new Error('Change failed')
      );

      const result = await service.changePassword('oldpass', 'newpass');

      expect(messageService.add).toHaveBeenCalledWith({
        severity: 'error',
        summary: 'Error',
        detail: 'Password change failed. Please try again.',
      });
      expect(result).toBe(false);
    });
  });

  describe('updateEmail', () => {
    it('should update email successfully', async () => {
      const result = await service.updateEmail('new@example.com');

      expect(profileService.updateEmail).toHaveBeenCalledWith(
        'new@example.com'
      );
      expect(messageService.add).toHaveBeenCalledWith({
        severity: 'info',
        summary: 'Verification Required',
        detail: 'Please check your email for the verification code',
      });
      expect(result).toBe(true);
    });

    it('should handle email update error', async () => {
      profileService.updateEmail.mockRejectedValue(new Error('Update failed'));

      const result = await service.updateEmail('new@example.com');

      expect(messageService.add).toHaveBeenCalledWith({
        severity: 'error',
        summary: 'Error',
        detail: 'Email change failed. Please try again.',
      });
      expect(result).toBe(false);
    });
  });

  describe('verifyEmailChange', () => {
    it('should verify email change successfully', async () => {
      const result = await service.verifyEmailChange('123456');

      expect(profileService.verifyEmailChange).toHaveBeenCalledWith('123456');
      expect(messageService.add).toHaveBeenCalledWith({
        severity: 'success',
        summary: 'Success',
        detail: 'Email address updated successfully',
      });
      expect(result).toBe(true);
    });

    it('should handle empty verification code', async () => {
      const result = await service.verifyEmailChange('');

      expect(profileService.verifyEmailChange).not.toHaveBeenCalled();
      expect(messageService.add).toHaveBeenCalledWith({
        severity: 'warn',
        summary: 'Warning',
        detail: 'Please enter the verification code',
      });
      expect(result).toBe(false);
    });

    it('should handle verification error', async () => {
      profileService.verifyEmailChange.mockRejectedValue(
        new Error('Verification failed')
      );

      const result = await service.verifyEmailChange('123456');

      expect(messageService.add).toHaveBeenCalledWith({
        severity: 'error',
        summary: 'Error',
        detail: 'Email verification failed. Please check the code.',
      });
      expect(result).toBe(false);
    });
  });

  describe('confirmSignOut', () => {
    it('should show sign out confirmation', () => {
      service.confirmSignOut();

      expect(confirmationService.confirm).toHaveBeenCalledWith({
        message:
          'Are you sure you want to sign out? You will need to log in again.',
        header: 'Confirm Sign Out',
        icon: 'pi pi-sign-out',
        acceptIcon: 'pi pi-check',
        rejectIcon: 'pi pi-times',
        acceptLabel: 'Yes, Sign Out',
        rejectLabel: 'Cancel',
        accept: expect.any(Function),
      });
    });
  });

  describe('confirmSignOutAllDevices', () => {
    it('should show sign out all devices confirmation', () => {
      service.confirmSignOutAllDevices();

      expect(confirmationService.confirm).toHaveBeenCalledWith({
        message:
          'This will sign you out from all devices and browsers. Continue?',
        header: 'Confirm Sign Out All Devices',
        icon: 'pi pi-power-off',
        acceptIcon: 'pi pi-check',
        rejectIcon: 'pi pi-times',
        acceptLabel: 'Yes, Sign Out All',
        rejectLabel: 'Cancel',
        accept: expect.any(Function),
      });
    });
  });
});
