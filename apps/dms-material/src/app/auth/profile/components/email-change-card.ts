import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  output,
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
  selector: 'dms-email-change-card',
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './email-change-card.html',
  styleUrl: './email-change-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmailChangeCard {
  private fb = inject(FormBuilder);
  private profileService = inject(ProfileService);
  private notification = inject(NotificationService);

  currentEmail = input<string>('');
  readonly emailChanged = output<string>();

  isLoading = signal(false);

  emailForm = this.fb.group({
    newEmail: ['', [Validators.required, Validators.email]],
  });

  async onSubmit(): Promise<void> {
    if (this.emailForm.invalid) {
      this.emailForm.markAllAsTouched();
      return;
    }

    const { newEmail } = this.emailForm.value;

    this.isLoading.set(true);

    try {
      await this.profileService.updateEmail(newEmail!);
      this.notification.success('Email changed successfully');
      this.emailChanged.emit(newEmail!);
      this.emailForm.reset();
    } catch {
      this.notification.error('Failed to change email');
    } finally {
      this.isLoading.set(false);
    }
  }
}
