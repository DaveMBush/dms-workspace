# Story AB.3: Migrate Profile Components

## Story

**As a** logged-in user
**I want** to view and edit my profile with Material-styled components
**So that** I can manage my account settings

## Context

**Current System:**

- Location: `apps/rms/src/app/auth/profile/`
- Components:
  - `profile.ts` - Main profile container
  - `components/password-change-card.ts` - Password change form
  - `components/email-change-card.ts` - Email change form
- PrimeNG components: `p-card`, `p-password`, `pInputText`, `p-button`, `p-message`

**Migration Target:**

- `mat-card` for card containers
- `mat-form-field` for inputs
- `mat-button` for actions
- `mat-error` for validation messages

## Acceptance Criteria

### Functional Requirements

- [ ] Profile page displays user information
- [ ] Password change card allows changing password
- [ ] Email change card allows changing email
- [ ] Form validation for all inputs
- [ ] Success/error feedback for operations
- [ ] Loading states during async operations

### Technical Requirements

- [ ] `mat-card` used for all card containers
- [ ] Reactive forms for form handling
- [ ] Profile service integration unchanged
- [ ] All current business logic preserved

### Visual Requirements

- [ ] Cards laid out in responsive grid
- [ ] Consistent spacing between cards
- [ ] Match current profile page layout

## Technical Approach

### Step 1: Create Profile Container

Create `apps/rms-material/src/app/auth/profile/profile.ts`:

```typescript
import { Component, inject, OnInit, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';

import { ProfileService } from '../services/profile.service';
import { PasswordChangeCard } from './components/password-change-card';
import { EmailChangeCard } from './components/email-change-card';

@Component({
  selector: 'rms-profile',
  imports: [MatCardModule, PasswordChangeCard, EmailChangeCard],
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
})
export class Profile implements OnInit {
  private profileService = inject(ProfileService);

  userEmail = signal<string>('');
  userName = signal<string>('');

  ngOnInit(): void {
    this.loadUserProfile();
  }

  private async loadUserProfile(): Promise<void> {
    try {
      const profile = await this.profileService.getCurrentUser();
      this.userEmail.set(profile.email);
      this.userName.set(profile.name || profile.email);
    } catch (error) {
      console.error('Failed to load profile:', error);
    }
  }

  onEmailChanged(newEmail: string): void {
    this.userEmail.set(newEmail);
  }
}
```

### Step 2: Create Profile Template

Create `apps/rms-material/src/app/auth/profile/profile.html`:

```html
<div class="profile-container">
  <h1 class="profile-title">Profile Settings</h1>

  <div class="profile-info">
    <mat-card>
      <mat-card-header>
        <mat-card-title>Account Information</mat-card-title>
      </mat-card-header>
      <mat-card-content>
        <p><strong>Name:</strong> {{ userName() }}</p>
        <p><strong>Email:</strong> {{ userEmail() }}</p>
      </mat-card-content>
    </mat-card>
  </div>

  <div class="profile-cards">
    <rms-password-change-card />
    <rms-email-change-card
      [currentEmail]="userEmail()"
      (emailChanged)="onEmailChanged($event)"
    />
  </div>
</div>
```

### Step 3: Create Password Change Card

Create `apps/rms-material/src/app/auth/profile/components/password-change-card.ts`:

```typescript
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { ProfileService } from '../../services/profile.service';
import { NotificationService } from '../../../shared/services/notification.service';

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

    const { currentPassword, newPassword, confirmPassword } = this.passwordForm.value;

    if (newPassword !== confirmPassword) {
      this.notification.error('New passwords do not match');
      return;
    }

    this.isLoading.set(true);

    try {
      await this.profileService.changePassword(currentPassword!, newPassword!);
      this.notification.success('Password changed successfully');
      this.passwordForm.reset();
    } catch (error) {
      this.notification.error(
        error instanceof Error ? error.message : 'Failed to change password'
      );
    } finally {
      this.isLoading.set(false);
    }
  }
}
```

### Step 4: Create Password Change Template

Create `apps/rms-material/src/app/auth/profile/components/password-change-card.html`:

```html
<mat-card>
  <mat-card-header>
    <mat-card-title>Change Password</mat-card-title>
  </mat-card-header>

  <mat-card-content>
    <form [formGroup]="passwordForm" (ngSubmit)="onSubmit()">
      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Current Password</mat-label>
        <input
          matInput
          [type]="hideCurrentPassword() ? 'password' : 'text'"
          formControlName="currentPassword"
          autocomplete="current-password"
        />
        <button
          mat-icon-button
          matSuffix
          type="button"
          (click)="hideCurrentPassword.set(!hideCurrentPassword())"
        >
          <mat-icon>{{ hideCurrentPassword() ? 'visibility_off' : 'visibility' }}</mat-icon>
        </button>
        @if (passwordForm.get('currentPassword')?.hasError('required')) {
          <mat-error>Current password is required</mat-error>
        }
      </mat-form-field>

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>New Password</mat-label>
        <input
          matInput
          [type]="hideNewPassword() ? 'password' : 'text'"
          formControlName="newPassword"
          autocomplete="new-password"
        />
        <button
          mat-icon-button
          matSuffix
          type="button"
          (click)="hideNewPassword.set(!hideNewPassword())"
        >
          <mat-icon>{{ hideNewPassword() ? 'visibility_off' : 'visibility' }}</mat-icon>
        </button>
        @if (passwordForm.get('newPassword')?.hasError('required')) {
          <mat-error>New password is required</mat-error>
        }
        @if (passwordForm.get('newPassword')?.hasError('minlength')) {
          <mat-error>Password must be at least 8 characters</mat-error>
        }
      </mat-form-field>

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Confirm New Password</mat-label>
        <input
          matInput
          [type]="hideConfirmPassword() ? 'password' : 'text'"
          formControlName="confirmPassword"
          autocomplete="new-password"
        />
        <button
          mat-icon-button
          matSuffix
          type="button"
          (click)="hideConfirmPassword.set(!hideConfirmPassword())"
        >
          <mat-icon>{{ hideConfirmPassword() ? 'visibility_off' : 'visibility' }}</mat-icon>
        </button>
        @if (passwordForm.get('confirmPassword')?.hasError('required')) {
          <mat-error>Please confirm your new password</mat-error>
        }
      </mat-form-field>

      <button
        mat-raised-button
        color="primary"
        type="submit"
        [disabled]="isLoading()"
      >
        @if (isLoading()) {
          <mat-spinner diameter="20"></mat-spinner>
        } @else {
          Change Password
        }
      </button>
    </form>
  </mat-card-content>
</mat-card>
```

### Step 5: Create Email Change Card

Create `apps/rms-material/src/app/auth/profile/components/email-change-card.ts`:

```typescript
import { Component, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { ProfileService } from '../../services/profile.service';
import { NotificationService } from '../../../shared/services/notification.service';

@Component({
  selector: 'rms-email-change-card',
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
})
export class EmailChangeCard {
  private fb = inject(FormBuilder);
  private profileService = inject(ProfileService);
  private notification = inject(NotificationService);

  currentEmail = input<string>('');
  emailChanged = output<string>();

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
      await this.profileService.changeEmail(newEmail!);
      this.notification.success('Email changed successfully');
      this.emailChanged.emit(newEmail!);
      this.emailForm.reset();
    } catch (error) {
      this.notification.error(
        error instanceof Error ? error.message : 'Failed to change email'
      );
    } finally {
      this.isLoading.set(false);
    }
  }
}
```

## Files Created

| File | Purpose |
|------|---------|
| `auth/profile/profile.ts` | Profile container |
| `auth/profile/profile.html` | Profile template |
| `auth/profile/profile.scss` | Profile styles |
| `auth/profile/components/password-change-card.ts` | Password change component |
| `auth/profile/components/password-change-card.html` | Password change template |
| `auth/profile/components/password-change-card.scss` | Password change styles |
| `auth/profile/components/email-change-card.ts` | Email change component |
| `auth/profile/components/email-change-card.html` | Email change template |
| `auth/profile/components/email-change-card.scss` | Email change styles |

## Definition of Done

- [ ] Profile page displays user information
- [ ] Password change form validates inputs
- [ ] Password change submits to profile service
- [ ] Email change form validates inputs
- [ ] Email change submits to profile service
- [ ] Success notifications display
- [ ] Error notifications display
- [ ] Loading states show during submission
- [ ] Route `/profile` accessible from shell
- [ ] All validation commands pass
