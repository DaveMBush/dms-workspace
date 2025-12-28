import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { NotificationService } from '../../../shared/services/notification.service';
import { ProfileService } from '../../services/profile.service';

@Component({
  selector: 'rms-password-change-card',
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './password-change-card.html',
  styleUrl: './password-change-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PasswordChangeCard {
  private fb = inject(FormBuilder);
  private profileService = inject(ProfileService);
  private notification = inject(NotificationService);

  hideCurrentPassword = signal(true);
  hideNewPassword = signal(true);
  hideConfirmPassword = signal(true);
  isLoading = signal(false);

  passwordForm = this.fb.group({
    currentPassword: ['', [Validators.required]],
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required]],
  });

  async onSubmit(): Promise<void> {
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    const { currentPassword, newPassword, confirmPassword } =
      this.passwordForm.value;

    if (newPassword !== confirmPassword) {
      this.notification.error('New passwords do not match');
      return;
    }

    this.isLoading.set(true);

    try {
      await this.profileService.changeUserPassword(
        currentPassword!,
        newPassword!
      );
      this.notification.success('Password changed successfully');
      this.passwordForm.reset();
    } catch {
      this.notification.error('Failed to change password');
    } finally {
      this.isLoading.set(false);
    }
  }
}
