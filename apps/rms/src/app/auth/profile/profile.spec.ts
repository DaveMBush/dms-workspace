import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { Router } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { vi } from 'vitest';

import { ConfirmationService, MessageService } from 'primeng/api';
import { Component } from '@angular/core';

import { Profile } from './profile';
import { ProfileService } from '../services/profile.service';
import { UserProfile } from '../types/profile.types';
import { AuthService } from '../auth.service';

describe('Profile', () => {
  let component: Profile;
  let fixture: ComponentFixture<Profile>;
  let profileService: ProfileService;
  let authService: AuthService;
  let router: Router;
  let confirmationService: ConfirmationService;
  let messageService: MessageService;

  const mockUserProfile: UserProfile = {
    username: 'testuser',
    email: 'test@example.com',
    emailVerified: true,
    name: 'Test User',
    createdAt: new Date('2023-01-01'),
    lastModified: new Date('2023-01-15'),
    sessionInfo: {
      loginTime: new Date('2023-01-15T10:00:00Z'),
      tokenExpiration: new Date('2023-01-15T11:00:00Z'),
      sessionDuration: 3600000, // 1 hour
    },
  };

  beforeEach(async () => {
    const profileServiceMock = {
      profile: vi.fn().mockReturnValue(mockUserProfile),
      loading: vi.fn().mockReturnValue(false),
      profileError: vi.fn().mockReturnValue(null),
      loadUserProfile: vi.fn().mockResolvedValue(undefined),
      changeUserPassword: vi.fn().mockResolvedValue(undefined),
      updateEmail: vi.fn().mockResolvedValue(undefined),
      verifyEmailChange: vi.fn().mockResolvedValue(undefined),
    };

    const authServiceMock = {
      signOut: vi.fn().mockResolvedValue(undefined),
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

    // Create a stub component for testing
    @Component({
      template: '<div></div>',
      selector: 'app-profile',
    })
    class TestProfile {}

    await TestBed.configureTestingModule({
      imports: [
        TestProfile,
        ReactiveFormsModule,
        NoopAnimationsModule,
      ],
      providers: [
        { provide: ProfileService, useValue: profileServiceMock },
        { provide: AuthService, useValue: authServiceMock },
        { provide: Router, useValue: routerMock },
        { provide: ConfirmationService, useValue: confirmationServiceMock },
        { provide: MessageService, useValue: messageServiceMock },
      ],
    }).compileComponents();

    // Manually create component instance for testing logic
    const fb = TestBed.inject(FormBuilder);
    component = new Profile();
    (component as any).profileService = profileService;
    (component as any).authService = authService;
    (component as any).fb = fb;
    (component as any).confirmationService = confirmationService;
    (component as any).messageService = messageService;
    (component as any).router = router;
    profileService = TestBed.inject(ProfileService);
    authService = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
    confirmationService = TestBed.inject(ConfirmationService);
    messageService = TestBed.inject(MessageService);

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load user profile on init', async () => {
    await component.ngOnInit();
    expect(profileService.loadUserProfile).toHaveBeenCalled();
  });

  it('should format session duration correctly', () => {
    expect(component.formatSessionDuration(3661000)).toBe('1h 1m'); // 1 hour 1 minute
    expect(component.formatSessionDuration(1800000)).toBe('0h 30m'); // 30 minutes
    expect(component.formatSessionDuration(7200000)).toBe('2h 0m'); // 2 hours
  });

  describe('Password Change Form', () => {
    beforeEach(() => {
      component.passwordChangeForm.patchValue({
        currentPassword: 'oldpassword',
        newPassword: 'NewPassword123!',
        confirmPassword: 'NewPassword123!',
      });
    });

    it('should validate password form correctly', () => {
      expect(component.passwordChangeForm.valid).toBe(true);

      component.passwordChangeForm.patchValue({
        confirmPassword: 'DifferentPassword123!',
      });
      expect(component.passwordChangeForm.hasError('passwordMismatch')).toBe(
        true
      );

      component.passwordChangeForm.patchValue({
        newPassword: 'weak',
        confirmPassword: 'weak',
      });
      expect(
        component.passwordChangeForm
          .get('newPassword')
          ?.hasError('passwordStrength')
      ).toBe(true);
    });

    it('should change password successfully', async () => {
      await component.onChangePassword();

      expect(profileService.changeUserPassword).toHaveBeenCalledWith(
        'oldpassword',
        'NewPassword123!'
      );
      expect(messageService.add).toHaveBeenCalledWith({
        severity: 'success',
        summary: 'Success',
        detail: 'Password changed successfully',
      });
      expect(component.passwordChangeForm.pristine).toBe(true);
    });

    it('should handle password change error', async () => {
      vi.mocked(profileService.changeUserPassword).mockRejectedValue(
        new Error('Change failed')
      );

      await component.onChangePassword();

      expect(messageService.add).toHaveBeenCalledWith({
        severity: 'error',
        summary: 'Error',
        detail: 'Password change failed. Please try again.',
      });
    });

    it('should not submit if form is invalid', async () => {
      component.passwordChangeForm.patchValue({
        currentPassword: '',
      });

      await component.onChangePassword();

      expect(profileService.changeUserPassword).not.toHaveBeenCalled();
    });
  });

  describe('Email Change Form', () => {
    beforeEach(() => {
      component.emailChangeForm.patchValue({
        newEmail: 'newemail@example.com',
      });
    });

    it('should validate email form correctly', () => {
      expect(component.emailChangeForm.valid).toBe(true);

      component.emailChangeForm.patchValue({
        newEmail: 'invalid-email',
      });
      expect(component.emailChangeForm.get('newEmail')?.hasError('email')).toBe(
        true
      );
    });

    it('should update email successfully', async () => {
      await component.onChangeEmail();

      expect(profileService.updateEmail).toHaveBeenCalledWith(
        'newemail@example.com'
      );
      expect(component.showEmailVerification()).toBe(true);
      expect(messageService.add).toHaveBeenCalledWith({
        severity: 'info',
        summary: 'Verification Required',
        detail: 'Please check your email for the verification code',
      });
    });

    it('should handle email update error', async () => {
      vi.mocked(profileService.updateEmail).mockRejectedValue(
        new Error('Update failed')
      );

      await component.onChangeEmail();

      expect(messageService.add).toHaveBeenCalledWith({
        severity: 'error',
        summary: 'Error',
        detail: 'Email change failed. Please try again.',
      });
    });

    it('should verify email change successfully', async () => {
      component.emailChangeForm.patchValue({
        verificationCode: '123456',
      });

      await component.onVerifyEmail();

      expect(profileService.verifyEmailChange).toHaveBeenCalledWith('123456');
      expect(component.showEmailVerification()).toBe(false);
      expect(messageService.add).toHaveBeenCalledWith({
        severity: 'success',
        summary: 'Success',
        detail: 'Email address updated successfully',
      });
      expect(component.emailChangeForm.pristine).toBe(true);
    });

    it('should handle email verification error', async () => {
      component.emailChangeForm.patchValue({
        verificationCode: 'invalid',
      });
      vi.mocked(profileService.verifyEmailChange).mockRejectedValue(
        new Error('Verification failed')
      );

      await component.onVerifyEmail();

      expect(messageService.add).toHaveBeenCalledWith({
        severity: 'error',
        summary: 'Error',
        detail: 'Email verification failed. Please check the code.',
      });
    });

    it('should require verification code', async () => {
      component.emailChangeForm.patchValue({
        verificationCode: '',
      });

      await component.onVerifyEmail();

      expect(profileService.verifyEmailChange).not.toHaveBeenCalled();
      expect(messageService.add).toHaveBeenCalledWith({
        severity: 'warn',
        summary: 'Warning',
        detail: 'Please enter the verification code',
      });
    });
  });

  describe('Logout Functions', () => {
    it('should show logout confirmation dialog', () => {
      component.onLogout();

      expect(confirmationService.confirm).toHaveBeenCalledWith(
        expect.objectContaining({
          message:
            'Are you sure you want to sign out? You will need to log in again.',
          header: 'Confirm Sign Out',
        })
      );
    });

    it('should handle logout accept', async () => {
      const confirmCall = vi.mocked(confirmationService.confirm).mock.calls[0];
      component.onLogout();

      // Simulate accepting the confirmation
      const confirmOptions = confirmCall[0];
      await confirmOptions.accept();

      expect(authService.signOut).toHaveBeenCalled();
      expect(router.navigate).toHaveBeenCalledWith(['/auth/login']);
    });

    it('should show logout all devices confirmation dialog', () => {
      component.onLogoutAllDevices();

      expect(confirmationService.confirm).toHaveBeenCalledWith(
        expect.objectContaining({
          message:
            'This will sign you out from all devices and browsers. Continue?',
          header: 'Confirm Sign Out All Devices',
        })
      );
    });

    it('should handle logout error', async () => {
      vi.mocked(authService.signOut).mockRejectedValue(
        new Error('Logout failed')
      );

      component.onLogout();
      const confirmOptions = vi.mocked(confirmationService.confirm).mock
        .calls[0][0];
      await confirmOptions.accept();

      expect(messageService.add).toHaveBeenCalledWith({
        severity: 'error',
        summary: 'Error',
        detail: 'Sign out failed. Please try again.',
      });
    });
  });

  describe('Form Validators', () => {
    it('should validate password strength', () => {
      const validator = (component as any).passwordStrengthValidator;

      expect(validator({ value: 'Password123!' })).toBe(null); // Valid
      expect(validator({ value: 'password' })).toEqual({
        passwordStrength: {
          message:
            'Password must contain uppercase, lowercase, number and special character',
        },
      }); // Invalid
      expect(validator({ value: null })).toBe(null); // Null value
      expect(validator({ value: '' })).toBe(null); // Empty value
    });

    it('should validate password match', () => {
      const mockForm = {
        get: vi.fn((controlName: string) => {
          if (controlName === 'newPassword') {
            return { value: 'Password123!' };
          }
          if (controlName === 'confirmPassword') {
            return { value: 'Password123!' };
          }
          return null;
        }),
      };

      const validator = (component as any).passwordMatchValidator;
      expect(validator(mockForm)).toBe(null);

      mockForm.get = vi.fn((controlName: string) => {
        if (controlName === 'newPassword') {
          return { value: 'Password123!' };
        }
        if (controlName === 'confirmPassword') {
          return { value: 'DifferentPassword!' };
        }
        return null;
      });

      expect(validator(mockForm)).toEqual({ passwordMismatch: true });
    });
  });
});
