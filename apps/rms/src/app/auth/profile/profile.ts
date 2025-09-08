import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { Router } from '@angular/router';

import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { MessageModule } from 'primeng/message';
import { TabViewModule } from 'primeng/tabview';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { ConfirmationService, MessageService } from 'primeng/api';

import { ProfileService } from '../services/profile.service';
import { AuthService } from '../auth.service';
import { UserProfile } from '../types/profile.types';

@Component({
  selector: 'app-profile',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CardModule,
    ButtonModule,
    InputTextModule,
    PasswordModule,
    MessageModule,
    TabViewModule,
    ConfirmDialogModule,
    ToastModule,
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './profile.html',
  styleUrls: ['./profile.scss'],
})
export class Profile implements OnInit {
  private profileService = inject(ProfileService);
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);
  private confirmationService = inject(ConfirmationService);
  private messageService = inject(MessageService);
  private router = inject(Router);

  passwordChangeForm: FormGroup;
  emailChangeForm: FormGroup;
  isSubmitting = signal(false);
  activeTab = signal(0);
  showEmailVerification = signal(false);

  constructor() {
    this.passwordChangeForm = this.fb.group(
      {
        currentPassword: ['', Validators.required],
        newPassword: [
          '',
          [
            Validators.required,
            Validators.minLength(8),
            this.passwordStrengthValidator,
          ],
        ],
        confirmPassword: ['', Validators.required],
      },
      {
        validators: this.passwordMatchValidator,
      }
    );

    this.emailChangeForm = this.fb.group({
      newEmail: ['', [Validators.required, Validators.email]],
      verificationCode: [''],
    });
  }

  public formatSessionDuration(milliseconds: number): string {
    const hours = Math.floor(milliseconds / 3600000);
    const minutes = Math.floor((milliseconds % 3600000) / 60000);
    return `${hours}h ${minutes}m`;
  }

  public getProfileUsername(): string {
    return this.profileService.profile()?.username ?? '';
  }

  public getProfileEmail(): string {
    return this.profileService.profile()?.email ?? '';
  }

  public isEmailVerified(): boolean {
    return this.profileService.profile()?.emailVerified ?? false;
  }

  public getAccountCreated(): Date | undefined {
    return this.profileService.profile()?.createdAt;
  }

  public getLastModified(): Date | undefined {
    return this.profileService.profile()?.lastModified;
  }

  public getLoginTime(): Date | undefined {
    return this.profileService.profile()?.sessionInfo.loginTime;
  }

  public getTokenExpiration(): Date | undefined {
    return this.profileService.profile()?.sessionInfo.tokenExpiration;
  }

  public getSessionDuration(): string {
    const duration =
      this.profileService.profile()?.sessionInfo.sessionDuration ?? 0;
    return this.formatSessionDuration(duration);
  }

  public hasProfile(): boolean {
    return this.profileService.profile() !== null;
  }

  public isCurrentPasswordInvalid(): boolean {
    const control = this.passwordChangeForm.get('currentPassword');
    return (control?.invalid && control?.touched) ?? false;
  }

  public isNewPasswordInvalid(): boolean {
    const control = this.passwordChangeForm.get('newPassword');
    return (control?.invalid && control?.touched) ?? false;
  }

  public hasPasswordMismatch(): boolean {
    const confirmControl = this.passwordChangeForm.get('confirmPassword');
    return (
      (this.passwordChangeForm.errors?.['passwordMismatch'] &&
        confirmControl?.touched) ??
      false
    );
  }

  public isNewEmailInvalid(): boolean {
    const control = this.emailChangeForm.get('newEmail');
    return (control?.invalid && control?.touched) ?? false;
  }

  public isPasswordFormDisabled(): boolean {
    return this.passwordChangeForm.invalid || this.isSubmitting();
  }

  public isEmailFormDisabled(): boolean {
    const emailControl = this.emailChangeForm.get('newEmail');
    return emailControl?.invalid || this.isSubmitting();
  }

  public isVerificationCodeEmpty(): boolean {
    const codeControl = this.emailChangeForm.get('verificationCode');
    return !codeControl?.value;
  }

  async ngOnInit(): Promise<void> {
    await this.profileService.loadUserProfile();
  }

  async onChangePassword(): Promise<void> {
    if (this.passwordChangeForm.valid && !this.isSubmitting()) {
      this.isSubmitting.set(true);

      try {
        const { currentPassword, newPassword } = this.passwordChangeForm.value;
        await this.profileService.changeUserPassword(
          currentPassword,
          newPassword
        );

        this.passwordChangeForm.reset();
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Password changed successfully',
        });
      } catch (error) {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Password change failed. Please try again.',
        });
      } finally {
        this.isSubmitting.set(false);
      }
    }
  }

  async onChangeEmail(): Promise<void> {
    if (this.emailChangeForm.valid && !this.isSubmitting()) {
      this.isSubmitting.set(true);

      try {
        const { newEmail } = this.emailChangeForm.value;
        await this.profileService.updateEmail(newEmail);

        this.showEmailVerification.set(true);
        this.messageService.add({
          severity: 'info',
          summary: 'Verification Required',
          detail: 'Please check your email for the verification code',
        });
      } catch (error) {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Email change failed. Please try again.',
        });
      } finally {
        this.isSubmitting.set(false);
      }
    }
  }

  async onVerifyEmail(): Promise<void> {
    const { verificationCode } = this.emailChangeForm.value;

    if (!verificationCode) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Warning',
        detail: 'Please enter the verification code',
      });
      return;
    }

    try {
      await this.profileService.verifyEmailChange(verificationCode);
      this.emailChangeForm.reset();
      this.showEmailVerification.set(false);
      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Email address updated successfully',
      });
    } catch (error) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Email verification failed. Please check the code.',
      });
    }
  }

  onLogout(): void {
    this.confirmationService.confirm({
      message:
        'Are you sure you want to sign out? You will need to log in again.',
      header: 'Confirm Sign Out',
      icon: 'pi pi-sign-out',
      acceptIcon: 'pi pi-check',
      rejectIcon: 'pi pi-times',
      acceptLabel: 'Yes, Sign Out',
      rejectLabel: 'Cancel',
      accept: async () => {
        try {
          await this.authService.signOut();
          this.router.navigate(['/auth/login']);
        } catch (error) {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Sign out failed. Please try again.',
          });
        }
      },
    });
  }

  onLogoutAllDevices(): void {
    this.confirmationService.confirm({
      message:
        'This will sign you out from all devices and browsers. Continue?',
      header: 'Confirm Sign Out All Devices',
      icon: 'pi pi-power-off',
      acceptIcon: 'pi pi-check',
      rejectIcon: 'pi pi-times',
      acceptLabel: 'Yes, Sign Out All',
      rejectLabel: 'Cancel',
      accept: async () => {
        try {
          await this.authService.signOut();
          this.router.navigate(['/auth/login']);
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Signed out from all devices',
          });
        } catch (error) {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Sign out failed. Please try again.',
          });
        }
      },
    });
  }

  private passwordMatchValidator(
    form: AbstractControl
  ): ValidationErrors | null {
    const newPassword = form.get('newPassword');
    const confirmPassword = form.get('confirmPassword');

    if (newPassword?.value !== confirmPassword?.value) {
      return { passwordMismatch: true };
    }

    return null;
  }

  private passwordStrengthValidator(
    control: AbstractControl
  ): ValidationErrors | null {
    const value = control.value;
    if (!value) return null;

    const hasNumber = /[0-9]/.test(value);
    const hasUpper = /[A-Z]/.test(value);
    const hasLower = /[a-z]/.test(value);
    const hasSpecial = /[#?!@$%^&*-]/.test(value);

    const valid = hasNumber && hasUpper && hasLower && hasSpecial;

    if (!valid) {
      return {
        passwordStrength: {
          message:
            'Password must contain uppercase, lowercase, number and special character',
        },
      };
    }

    return null;
  }
}
