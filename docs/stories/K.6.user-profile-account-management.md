# Story K.6: User Profile and Account Management

## Status

Draft

## Story

**As a** single-user application owner,
**I want** to have a comprehensive user profile management interface with account settings and security controls,
**so that** I can manage my account information, change passwords, and monitor my authentication sessions from within the application.

## Acceptance Criteria

1. Create user profile component displaying basic user information from AWS Cognito user attributes
2. Allow user to change password through Cognito with proper validation and security feedback
3. Implement email verification flow for email address changes with proper user guidance
4. Add user logout functionality with confirmation dialog and proper session cleanup
5. Display current session information including last login time, session duration, and token expiration
6. Handle password reset flow through Cognito with email-based verification
7. Add navigation to user profile from main application with proper breadcrumbs and accessibility
8. Style profile management to match existing PrimeNG application theme with responsive design
9. Ensure the following commands run without errors:

- `pnpm format`
- `pnpm dupcheck`
- `pnpm nx run rms:test --code-coverage`
- `pnpm nx run server:build:production`
- `pnpm nx run server:test --code-coverage`
- `pnpm nx run server:lint`
- `pnpm nx run rms:lint`
- `pnpm nx run rms:build:production`
- `pnpm nx run rms-e2e:lint`

## Tasks / Subtasks

- [ ] **Task 1: Create user profile component structure** (AC: 1, 7, 8)

  - [ ] Generate profile component: `/apps/rms/src/app/auth/profile/profile.ts`
  - [ ] Create responsive profile template: `profile.html`
  - [ ] Add profile styles matching PrimeNG theme: `profile.scss`
  - [ ] Add user profile route to application routing
  - [ ] Create navigation integration with main application menu
  - [ ] Add proper ARIA labels and accessibility features for profile management

- [ ] **Task 2: Display user information and attributes** (AC: 1, 5)

  - [ ] Fetch and display user attributes from AWS Cognito (email, username, name)
  - [ ] Show account creation date and last login timestamp
  - [ ] Display current session information and token expiration times
  - [ ] Add user avatar placeholder or gravatar integration
  - [ ] Create information cards for different profile sections
  - [ ] Add loading states and error handling for profile data

- [ ] **Task 3: Implement password change functionality** (AC: 2)

  - [ ] Create password change form with current and new password fields
  - [ ] Add password strength validation matching Cognito password policy
  - [ ] Implement real-time password validation feedback
  - [ ] Add password change request handling through AWS Cognito
  - [ ] Show success/error messages for password change operations
  - [ ] Add proper form validation and security measures

- [ ] **Task 4: Add email verification and change workflow** (AC: 3)

  - [ ] Create email change form with new email input and verification
  - [ ] Implement email change request through Cognito user attributes
  - [ ] Add email verification code input and confirmation flow
  - [ ] Handle email verification status and pending change display
  - [ ] Add resend verification email functionality
  - [ ] Create user-friendly guidance for email verification process

- [ ] **Task 5: Implement logout functionality with confirmation** (AC: 4)

  - [ ] Add logout button with confirmation dialog
  - [ ] Create logout confirmation component with session information
  - [ ] Implement complete session cleanup on logout confirmation
  - [ ] Add "Logout All Devices" option for enhanced security
  - [ ] Show logout success feedback and redirect to login page
  - [ ] Handle logout errors and network failures gracefully

- [ ] **Task 6: Add password reset functionality** (AC: 6)

  - [ ] Create "Forgot Password" link and workflow
  - [ ] Implement password reset request through Cognito
  - [ ] Add verification code input for password reset confirmation
  - [ ] Create new password form with validation
  - [ ] Handle password reset completion and user feedback
  - [ ] Add security messaging about password reset process

- [ ] **Task 7: Display session and security information** (AC: 5)

  - [ ] Show current session start time and duration
  - [ ] Display access token and refresh token expiration times
  - [ ] Add last login IP address and browser information (if available)
  - [ ] Show recent login history from CloudTrail logs (optional)
  - [ ] Add session security indicators and warnings
  - [ ] Create session management controls (extend/terminate)

- [ ] **Task 8: Add profile navigation and user experience** (AC: 7, 8)
  - [ ] Add user profile link to main navigation menu
  - [ ] Create breadcrumb navigation for profile sections
  - [ ] Add profile settings tabs for different management areas
  - [ ] Implement proper loading states and transitions
  - [ ] Add mobile-responsive design for profile management
  - [ ] Create help text and user guidance for profile features

## Dev Notes

### Previous Story Context

**Dependencies:**

- Story K.1 (AWS Cognito Setup) provides user pool and user management foundation
- Story K.3 (Frontend Login Component) provides AuthService with user state
- Story K.5 (Token Refresh) provides session information and token management

### Data Models and Architecture

**Source: [apps/rms/src/app/auth/auth.service.ts from Story K.3]**

- Existing authentication service with current user state management
- AWS Cognito integration for user attribute management
- Token storage and session management capabilities

**Source: [CLAUDE.md - Angular Development Standards]**

- Use standalone components with external HTML/SCSS files
- Use `inject()` pattern for service dependencies
- Use signals for reactive state management
- Follow PrimeNG theming and TailwindCSS utility patterns

**User Profile Architecture:**

```
Profile Component -> AuthService -> AWS Cognito -> User Attributes
       ↓                ↓              ↓              ↓
   Display UI      User Management   User Pool   Profile Data
```

### File Locations

**Primary Files to Create:**

1. `/apps/rms/src/app/auth/profile/profile.ts` - Main profile component
2. `/apps/rms/src/app/auth/profile/profile.html` - Profile template
3. `/apps/rms/src/app/auth/profile/profile.scss` - Profile styles
4. `/apps/rms/src/app/auth/services/profile.service.ts` - Profile data management
5. `/apps/rms/src/app/auth/components/logout-confirmation/logout-confirmation.ts` - Logout dialog
6. `/apps/rms/src/app/auth/components/password-change/password-change.ts` - Password change form

**Primary Files to Modify:**

1. `/apps/rms/src/app/app.routes.ts` - Add profile route
2. `/apps/rms/src/app/auth/auth.service.ts` - Add profile management methods
3. Main navigation component - Add profile link

**Test Files to Create:**

1. `/apps/rms/src/app/auth/profile/profile.spec.ts` - Profile component tests
2. `/apps/rms/src/app/auth/services/profile.service.spec.ts` - Profile service tests

### Technical Implementation Details

**Profile Service:**

```typescript
// apps/rms/src/app/auth/services/profile.service.ts
import { Injectable, signal } from '@angular/core';
import { Auth } from '@aws-amplify/auth';

export interface UserProfile {
  username: string;
  email: string;
  emailVerified: boolean;
  name?: string;
  createdAt: Date;
  lastModified: Date;
  sessionInfo: {
    loginTime: Date;
    tokenExpiration: Date;
    sessionDuration: number;
  };
}

@Injectable({
  providedIn: 'root',
})
export class ProfileService {
  private userProfile = signal<UserProfile | null>(null);
  private isLoading = signal(false);
  private error = signal<string | null>(null);

  public readonly profile = this.userProfile.asReadonly();
  public readonly loading = this.isLoading.asReadonly();
  public readonly profileError = this.error.asReadonly();

  async loadUserProfile(): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);

    try {
      const user = await Auth.currentAuthenticatedUser();
      const session = await Auth.currentSession();

      const profile: UserProfile = {
        username: user.username,
        email: user.attributes.email,
        emailVerified: user.attributes.email_verified === 'true',
        name: user.attributes.name,
        createdAt: new Date(user.attributes.created_at),
        lastModified: new Date(user.attributes.updated_at),
        sessionInfo: {
          loginTime: new Date(session.getIdToken().payload.iat * 1000),
          tokenExpiration: new Date(session.getAccessToken().getExpiration() * 1000),
          sessionDuration: Date.now() - session.getIdToken().payload.iat * 1000,
        },
      };

      this.userProfile.set(profile);
    } catch (error) {
      console.error('Failed to load user profile:', error);
      this.error.set('Failed to load profile information');
    } finally {
      this.isLoading.set(false);
    }
  }

  async changePassword(oldPassword: string, newPassword: string): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);

    try {
      const user = await Auth.currentAuthenticatedUser();
      await Auth.changePassword(user, oldPassword, newPassword);
      console.log('Password changed successfully');
    } catch (error) {
      console.error('Password change failed:', error);
      this.error.set(this.getErrorMessage(error));
      throw error;
    } finally {
      this.isLoading.set(false);
    }
  }

  async updateEmail(newEmail: string): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);

    try {
      const user = await Auth.currentAuthenticatedUser();
      await Auth.updateUserAttributes(user, {
        email: newEmail,
      });
      console.log('Email update initiated, verification required');
    } catch (error) {
      console.error('Email update failed:', error);
      this.error.set(this.getErrorMessage(error));
      throw error;
    } finally {
      this.isLoading.set(false);
    }
  }

  async verifyEmailChange(verificationCode: string): Promise<void> {
    try {
      await Auth.verifyCurrentUserAttributeSubmit('email', verificationCode);
      console.log('Email verification successful');
      await this.loadUserProfile(); // Refresh profile
    } catch (error) {
      console.error('Email verification failed:', error);
      throw error;
    }
  }

  async initiatePasswordReset(username: string): Promise<void> {
    try {
      await Auth.forgotPassword(username);
      console.log('Password reset initiated');
    } catch (error) {
      console.error('Password reset initiation failed:', error);
      throw error;
    }
  }

  private getErrorMessage(error: any): string {
    switch (error.code) {
      case 'NotAuthorizedException':
        return 'Current password is incorrect';
      case 'InvalidPasswordException':
        return 'New password does not meet requirements';
      case 'LimitExceededException':
        return 'Too many attempts. Please try again later';
      default:
        return 'Operation failed. Please try again';
    }
  }
}
```

**Profile Component:**

```typescript
// apps/rms/src/app/auth/profile/profile.ts
import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';

import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { MessageModule } from 'primeng/message';
import { TabViewModule } from 'primeng/tabview';
import { ConfirmDialogModule } from 'primeng/confirmdialog';

import { ProfileService } from '../services/profile.service';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-profile',
  imports: [CommonModule, ReactiveFormsModule, CardModule, ButtonModule, InputTextModule, PasswordModule, MessageModule, TabViewModule, ConfirmDialogModule],
  templateUrl: './profile.html',
  styleUrls: ['./profile.scss'],
})
export class Profile implements OnInit {
  private profileService = inject(ProfileService);
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);

  passwordChangeForm: FormGroup;
  emailChangeForm: FormGroup;
  isSubmitting = signal(false);
  activeTab = signal(0);

  constructor() {
    this.passwordChangeForm = this.fb.group(
      {
        currentPassword: ['', Validators.required],
        newPassword: ['', [Validators.required, Validators.minLength(8)]],
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

  async ngOnInit(): Promise<void> {
    await this.profileService.loadUserProfile();
  }

  async onChangePassword(): Promise<void> {
    if (this.passwordChangeForm.valid && !this.isSubmitting()) {
      this.isSubmitting.set(true);

      try {
        const { currentPassword, newPassword } = this.passwordChangeForm.value;
        await this.profileService.changePassword(currentPassword, newPassword);

        this.passwordChangeForm.reset();
        // Show success message
      } catch (error) {
        console.error('Password change failed:', error);
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

        // Show verification step
      } catch (error) {
        console.error('Email change failed:', error);
      } finally {
        this.isSubmitting.set(false);
      }
    }
  }

  async onVerifyEmail(): Promise<void> {
    const { verificationCode } = this.emailChangeForm.value;

    try {
      await this.profileService.verifyEmailChange(verificationCode);
      this.emailChangeForm.reset();
      // Show success message
    } catch (error) {
      console.error('Email verification failed:', error);
    }
  }

  onLogout(): void {
    // Show logout confirmation dialog
    console.log('Logout requested');
  }

  private passwordMatchValidator(form: FormGroup) {
    const newPassword = form.get('newPassword');
    const confirmPassword = form.get('confirmPassword');

    if (newPassword?.value !== confirmPassword?.value) {
      return { passwordMismatch: true };
    }

    return null;
  }

  formatSessionDuration(milliseconds: number): string {
    const hours = Math.floor(milliseconds / 3600000);
    const minutes = Math.floor((milliseconds % 3600000) / 60000);
    return `${hours}h ${minutes}m`;
  }
}
```

**Profile Template:**

```html
<!-- apps/rms/src/app/auth/profile/profile.html -->
<div class="profile-container p-4">
  <div class="grid">
    <div class="col-12">
      <h1 class="text-3xl font-bold text-900 mb-4">User Profile</h1>

      <p-tabView [(activeIndex)]="activeTab">
        <!-- Profile Information Tab -->
        <p-tabPanel header="Profile" leftIcon="pi pi-user">
          <div class="grid">
            <div class="col-12 md:col-6">
              <p-card header="User Information">
                <div *ngIf="profileService.profile(); else profileLoading">
                  <div class="field">
                    <label class="block text-900 font-medium mb-2">Username</label>
                    <span class="text-900">{{ profileService.profile()?.username }}</span>
                  </div>

                  <div class="field">
                    <label class="block text-900 font-medium mb-2">Email Address</label>
                    <div class="flex align-items-center gap-2">
                      <span class="text-900">{{ profileService.profile()?.email }}</span>
                      <i class="pi" [class.pi-check-circle]="profileService.profile()?.emailVerified" [class.pi-exclamation-triangle]="!profileService.profile()?.emailVerified" [class.text-green-500]="profileService.profile()?.emailVerified" [class.text-orange-500]="!profileService.profile()?.emailVerified"> </i>
                    </div>
                  </div>

                  <div class="field">
                    <label class="block text-900 font-medium mb-2">Account Created</label>
                    <span class="text-900">{{ profileService.profile()?.createdAt | date:'medium' }}</span>
                  </div>
                </div>

                <ng-template #profileLoading>
                  <div class="text-center p-4">
                    <i class="pi pi-spin pi-spinner text-2xl"></i>
                  </div>
                </ng-template>
              </p-card>
            </div>

            <div class="col-12 md:col-6">
              <p-card header="Session Information">
                <div *ngIf="profileService.profile()">
                  <div class="field">
                    <label class="block text-900 font-medium mb-2">Login Time</label>
                    <span class="text-900">{{ profileService.profile()?.sessionInfo.loginTime | date:'medium' }}</span>
                  </div>

                  <div class="field">
                    <label class="block text-900 font-medium mb-2">Session Duration</label>
                    <span class="text-900">{{ formatSessionDuration(profileService.profile()?.sessionInfo.sessionDuration || 0) }}</span>
                  </div>

                  <div class="field">
                    <label class="block text-900 font-medium mb-2">Token Expires</label>
                    <span class="text-900">{{ profileService.profile()?.sessionInfo.tokenExpiration | date:'medium' }}</span>
                  </div>
                </div>
              </p-card>
            </div>
          </div>
        </p-tabPanel>

        <!-- Security Tab -->
        <p-tabPanel header="Security" leftIcon="pi pi-shield">
          <div class="grid">
            <div class="col-12 md:col-6">
              <p-card header="Change Password">
                <form [formGroup]="passwordChangeForm" (ngSubmit)="onChangePassword()">
                  <div class="field">
                    <label for="currentPassword" class="block text-900 font-medium mb-2">Current Password</label>
                    <p-password inputId="currentPassword" formControlName="currentPassword" [feedback]="false" [toggleMask]="true" styleClass="w-full"> </p-password>
                  </div>

                  <div class="field">
                    <label for="newPassword" class="block text-900 font-medium mb-2">New Password</label>
                    <p-password inputId="newPassword" formControlName="newPassword" [feedback]="true" [toggleMask]="true" styleClass="w-full"> </p-password>
                  </div>

                  <div class="field">
                    <label for="confirmPassword" class="block text-900 font-medium mb-2">Confirm New Password</label>
                    <p-password inputId="confirmPassword" formControlName="confirmPassword" [feedback]="false" [toggleMask]="true" styleClass="w-full"> </p-password>
                  </div>

                  <p-message *ngIf="passwordChangeForm.errors?.['passwordMismatch']" severity="error" text="Passwords do not match"> </p-message>

                  <p-button type="submit" label="Change Password" styleClass="w-full mt-3" [disabled]="passwordChangeForm.invalid || isSubmitting()" [loading]="isSubmitting()"> </p-button>
                </form>
              </p-card>
            </div>

            <div class="col-12 md:col-6">
              <p-card header="Account Actions">
                <div class="flex flex-column gap-3">
                  <p-button label="Logout" icon="pi pi-sign-out" styleClass="p-button-outlined" (onClick)="onLogout()"> </p-button>

                  <p-button label="Logout All Devices" icon="pi pi-power-off" styleClass="p-button-outlined p-button-danger" (onClick)="onLogout()"> </p-button>
                </div>
              </p-card>
            </div>
          </div>
        </p-tabPanel>
      </p-tabView>
    </div>
  </div>
</div>
```

**Route Integration:**

```typescript
// Update to apps/rms/src/app/app.routes.ts
export const routes: Routes = [
  // ... existing routes
  {
    path: '',
    canActivate: [AuthGuard],
    children: [
      // ... existing protected routes
      {
        path: 'profile',
        loadComponent: () => import('./auth/profile/profile').then((m) => m.Profile),
      },
    ],
  },
];
```

### Testing Standards

**Source: [docs/architecture/ci-and-testing.md]**

**Testing Framework:** Vitest with Angular TestBed and AWS Amplify mocking
**Test Location:** Test files collocated with component and service files
**Coverage Requirements:** Lines: 85%, Branches: 75%, Functions: 85%

**Testing Strategy:**

- **Unit Tests:** Test profile component interactions and form validation
- **Service Tests:** Test profile service methods with mocked AWS Cognito
- **Integration Tests:** Test complete profile management workflow
- **UI Tests:** Test profile display and user interactions

**Key Test Scenarios:**

- Profile data loading and display
- Password change form validation and submission
- Email change and verification workflow
- Logout functionality and confirmation
- Session information display
- Error handling and user feedback
- Mobile responsiveness and accessibility

## Change Log

| Date       | Version | Description            | Author           |
| ---------- | ------- | ---------------------- | ---------------- |
| 2024-08-30 | 1.0     | Initial story creation | Scrum Master Bob |

## Dev Agent Record

_This section will be populated by the development agent during implementation_

### Agent Model Used

_To be filled by dev agent_

### Debug Log References

_To be filled by dev agent_

### Completion Notes List

_To be filled by dev agent_

### File List

_To be filled by dev agent_

## QA Results

_Results from QA Agent review will be populated here after implementation_
