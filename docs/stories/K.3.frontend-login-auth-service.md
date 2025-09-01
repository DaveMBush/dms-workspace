# Story K.3: Frontend Login Component and Authentication Service

## Status

Draft

## Story

**As a** single-user application owner,  
**I want** to have a polished login component and authentication service integrated with AWS Cognito,  
**so that** I can securely log into my RMS application with a professional user experience and proper token management.

## Acceptance Criteria

1. Create login component with email/password form following Angular 20 and PrimeNG design patterns
2. Implement authentication service using AWS Amplify or AWS SDK with proper TypeScript typing
3. Add comprehensive form validation with real-time feedback and accessible error messages
4. Implement secure token storage using Angular best practices and browser security considerations
5. Create logout functionality with complete token cleanup and user session termination
6. Add loading states, user feedback, and proper error handling throughout authentication flow
7. Style login form to match existing PrimeNG theme with responsive design for mobile devices
8. Create comprehensive unit tests for authentication service and login component interactions

## Tasks / Subtasks

- [ ] **Task 1: Install AWS authentication dependencies** (AC: 2)

  - [ ] Install AWS Amplify Auth library or AWS SDK for Cognito authentication
  - [ ] Configure TypeScript types for Cognito authentication responses
  - [ ] Add environment configuration for Cognito integration
  - [ ] Create interfaces for authentication state and user data
  - [ ] Update package.json and ensure compatibility with Angular 20

- [ ] **Task 2: Create authentication service with Cognito integration** (AC: 2, 4, 5)

  - [ ] Create `AuthService` in `/apps/rms/src/app/auth/auth.service.ts` using `inject()` pattern
  - [ ] Implement `signIn()` method with Cognito authentication
  - [ ] Implement `signOut()` method with complete token cleanup
  - [ ] Add `getCurrentUser()` method for user profile retrieval
  - [ ] Create secure token storage using HttpOnly cookies or secure localStorage
  - [ ] Add authentication state management using Angular signals

- [ ] **Task 3: Create login component with PrimeNG styling** (AC: 1, 6, 7)

  - [ ] Generate login component: `apps/rms/src/app/auth/login/login.ts`
  - [ ] Create responsive login form template: `login.html`
  - [ ] Add PrimeNG form components (InputText, Password, Button, Message)
  - [ ] Implement loading states with PrimeNG ProgressSpinner
  - [ ] Add proper ARIA labels and accessibility features
  - [ ] Create mobile-responsive design with proper viewport handling

- [ ] **Task 4: Implement form validation and error handling** (AC: 3, 6)

  - [ ] Add reactive form validation using Angular FormBuilder
  - [ ] Implement email format validation and required field checks
  - [ ] Add real-time validation feedback with PrimeNG Message components
  - [ ] Create user-friendly error messages for authentication failures
  - [ ] Handle network errors and service unavailability gracefully
  - [ ] Add form submission protection against double-clicks

- [ ] **Task 5: Add authentication state management** (AC: 4, 5)

  - [ ] Create authentication state signals for reactive UI updates
  - [ ] Implement `isAuthenticated$` and `currentUser$` computed signals
  - [ ] Add automatic token expiration detection and handling
  - [ ] Create authentication event logging for security monitoring
  - [ ] Implement proper cleanup on component destruction

- [ ] **Task 6: Create logout functionality and user feedback** (AC: 5, 6)

  - [ ] Add logout button and confirmation dialog
  - [ ] Implement complete session cleanup including all stored tokens
  - [ ] Add success/error messages for authentication operations
  - [ ] Create proper navigation flow after login/logout
  - [ ] Add session timeout warnings and automatic logout

- [ ] **Task 7: Style integration with existing theme** (AC: 7)

  - [ ] Match PrimeNG theme colors and typography from existing components
  - [ ] Ensure login form fits seamlessly with application design
  - [ ] Add proper spacing and layout using TailwindCSS utilities
  - [ ] Test responsive behavior on mobile devices and tablets
  - [ ] Add dark mode compatibility if implemented in application

- [ ] **Task 8: Create comprehensive unit tests** (AC: 8)
  - [ ] Test AuthService methods with mocked Cognito responses
  - [ ] Test login component form validation and submission
  - [ ] Test error handling scenarios and user feedback
  - [ ] Test token storage and retrieval functionality
  - [ ] Test logout functionality and cleanup
  - [ ] Test authentication state management and signal updates

## Dev Notes

### Previous Story Context

**Dependencies:**

- Story K.1 (AWS Cognito Setup) provides User Pool and App Client configuration
- Story K.2 (Backend Auth Middleware) provides API endpoint protection

### Data Models and Architecture

**Source: [apps/rms/src/app/global/global-universe/global-universe.component.html]**

- Existing PrimeNG component patterns: p-table, p-button, p-dropdown
- Current styling approach: PrimeNG theme with TailwindCSS utilities
- Component structure: standalone components with external HTML/SCSS files

**Source: [CLAUDE.md - Angular Development Standards]**

- Use `inject()` instead of constructor injection
- Use signals for all inputs, outputs, and template-accessed variables
- Never use inline HTML or SCSS - always use external files
- Use `component-name.*` instead of `component-name.component.*`

**Authentication Flow:**

```
Login Component ---> AuthService ---> AWS Cognito ---> Token Storage ---> API Requests
      ↓                 ↓                    ↓              ↓              ↓
   Form Validation   AWS SDK         JWT Access Token   Secure Storage   Authorization Header
```

### File Locations

**Primary Files to Create:**

1. `/apps/rms/src/app/auth/auth.service.ts` - Main authentication service
2. `/apps/rms/src/app/auth/login/login.ts` - Login component
3. `/apps/rms/src/app/auth/login/login.html` - Login template
4. `/apps/rms/src/app/auth/login/login.scss` - Login styles
5. `/apps/rms/src/app/auth/auth.types.ts` - Authentication type definitions
6. `/apps/rms/src/app/auth/guards/auth.guard.ts` - Route guard (preparation for K.4)

**Primary Files to Modify:**

1. `/apps/rms/src/app/app.routes.ts` - Add login route
2. `/apps/rms/src/environments/environment.ts` - Add Cognito configuration
3. `/apps/rms/package.json` - Add AWS Amplify dependencies

**Test Files to Create:**

1. `/apps/rms/src/app/auth/auth.service.spec.ts` - Service unit tests
2. `/apps/rms/src/app/auth/login/login.spec.ts` - Component unit tests

### Technical Implementation Details

**Authentication Service Structure:**

```typescript
// apps/rms/src/app/auth/auth.service.ts
import { Injectable, signal, computed } from '@angular/core';
import { Auth } from '@aws-amplify/auth';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private currentUserSignal = signal<CognitoUser | null>(null);
  private isLoadingSignal = signal(false);
  private errorSignal = signal<string | null>(null);

  public readonly currentUser = this.currentUserSignal.asReadonly();
  public readonly isLoading = this.isLoadingSignal.asReadonly();
  public readonly error = this.errorSignal.asReadonly();

  public readonly isAuthenticated = computed(() => this.currentUserSignal() !== null);

  constructor() {
    this.initializeAuth();
  }

  private async initializeAuth(): Promise<void> {
    try {
      Auth.configure(environment.cognito);
      const user = await Auth.currentAuthenticatedUser();
      this.currentUserSignal.set(user);
    } catch (error) {
      // User not authenticated, this is expected
      this.currentUserSignal.set(null);
    }
  }

  async signIn(username: string, password: string): Promise<void> {
    this.isLoadingSignal.set(true);
    this.errorSignal.set(null);

    try {
      const user = await Auth.signIn(username, password);
      this.currentUserSignal.set(user);

      // Store tokens securely
      const session = await Auth.currentSession();
      this.storeTokens(session);
    } catch (error) {
      this.errorSignal.set(this.getErrorMessage(error));
      throw error;
    } finally {
      this.isLoadingSignal.set(false);
    }
  }

  async signOut(): Promise<void> {
    try {
      await Auth.signOut();
      this.currentUserSignal.set(null);
      this.clearTokens();
    } catch (error) {
      console.error('Sign out error:', error);
      // Force local cleanup even if server signout fails
      this.currentUserSignal.set(null);
      this.clearTokens();
    }
  }

  private storeTokens(session: CognitoUserSession): void {
    const accessToken = session.getAccessToken().getJwtToken();
    const idToken = session.getIdToken().getJwtToken();
    const refreshToken = session.getRefreshToken().getToken();

    // Store securely - prefer HttpOnly cookies in production
    sessionStorage.setItem('accessToken', accessToken);
    sessionStorage.setItem('idToken', idToken);
    sessionStorage.setItem('refreshToken', refreshToken);
  }

  private clearTokens(): void {
    sessionStorage.removeItem('accessToken');
    sessionStorage.removeItem('idToken');
    sessionStorage.removeItem('refreshToken');
  }

  getAccessToken(): string | null {
    return sessionStorage.getItem('accessToken');
  }

  private getErrorMessage(error: any): string {
    switch (error.code) {
      case 'UserNotConfirmedException':
        return 'Please check your email and confirm your account';
      case 'NotAuthorizedException':
        return 'Incorrect username or password';
      case 'UserNotFoundException':
        return 'User account not found';
      case 'TooManyRequestsException':
        return 'Too many login attempts. Please try again later';
      default:
        return 'Authentication failed. Please try again';
    }
  }
}
```

**Login Component Implementation:**

```typescript
// apps/rms/src/app/auth/login/login.ts
import { Component, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { MessageModule } from 'primeng/message';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

import { AuthService } from '../auth.service';

@Component({
  selector: 'app-login',
  imports: [CommonModule, ReactiveFormsModule, ButtonModule, InputTextModule, PasswordModule, MessageModule, ProgressSpinnerModule],
  templateUrl: './login.html',
  styleUrls: ['./login.scss'],
})
export class Login {
  private authService = inject(AuthService);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  loginForm: FormGroup;
  isSubmitting = signal(false);

  constructor() {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
    });
  }

  async onSubmit(): Promise<void> {
    if (this.loginForm.valid && !this.isSubmitting()) {
      this.isSubmitting.set(true);

      try {
        const { email, password } = this.loginForm.value;
        await this.authService.signIn(email, password);
        await this.router.navigate(['/']);
      } catch (error) {
        // Error handling is managed by AuthService signals
        console.error('Login failed:', error);
      } finally {
        this.isSubmitting.set(false);
      }
    }
  }

  get emailControl() {
    return this.loginForm.get('email');
  }
  get passwordControl() {
    return this.loginForm.get('password');
  }

  get isFormInvalid(): boolean {
    return this.loginForm.invalid || this.isSubmitting();
  }
}
```

**Login Template:**

```html
<!-- apps/rms/src/app/auth/login/login.html -->
<div class="login-container min-h-screen flex align-items-center justify-content-center p-4">
  <div class="login-card surface-card p-6 border-round shadow-2 w-full max-w-md">
    <div class="text-center mb-5">
      <h1 class="text-3xl font-bold text-900 mb-2">RMS Login</h1>
      <span class="text-600 font-medium">Sign in to your account</span>
    </div>

    <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="flex flex-column gap-3">
      <!-- Email Field -->
      <div class="field">
        <label for="email" class="block text-900 font-medium mb-2">Email</label>
        <input pInputText id="email" type="email" formControlName="email" placeholder="Enter your email" class="w-full" [class.ng-invalid]="emailControl?.invalid && emailControl?.touched" autocomplete="email" />
        <p-message *ngIf="emailControl?.invalid && emailControl?.touched" severity="error" text="Please enter a valid email address" class="mt-1"> </p-message>
      </div>

      <!-- Password Field -->
      <div class="field">
        <label for="password" class="block text-900 font-medium mb-2">Password</label>
        <p-password inputId="password" formControlName="password" placeholder="Enter your password" [toggleMask]="true" [feedback]="false" styleClass="w-full" [class.ng-invalid]="passwordControl?.invalid && passwordControl?.touched" autocomplete="current-password"> </p-password>
        <p-message *ngIf="passwordControl?.invalid && passwordControl?.touched" severity="error" text="Password must be at least 8 characters" class="mt-1"> </p-message>
      </div>

      <!-- Error Message -->
      <p-message *ngIf="authService.error()" severity="error" [text]="authService.error()!" class="w-full"> </p-message>

      <!-- Submit Button -->
      <p-button type="submit" label="Sign In" styleClass="w-full mt-3" [disabled]="isFormInvalid" [loading]="authService.isLoading() || isSubmitting()"> </p-button>
    </form>

    <!-- Loading Overlay -->
    <div *ngIf="authService.isLoading()" class="loading-overlay">
      <p-progressSpinner strokeWidth="4"></p-progressSpinner>
    </div>
  </div>
</div>
```

**Environment Configuration:**

```typescript
// apps/rms/src/environments/environment.ts
export const environment = {
  production: false,
  cognito: {
    region: 'us-east-1',
    userPoolId: 'us-east-1_xxxxxxxxx',
    userPoolWebClientId: 'xxxxxxxxxxxxxxxxxxxxxxxxxx',
    mandatorySignIn: true,
    authenticationFlowType: 'USER_SRP_AUTH',
  },
};
```

**Security Considerations:**

- Use sessionStorage instead of localStorage for token storage
- Implement proper CSRF protection
- Add secure HTTP-only cookie option for production
- Validate all inputs and sanitize error messages
- Implement proper session timeout handling

### Testing Standards

**Source: [docs/architecture/ci-and-testing.md]**

**Testing Framework:** Vitest with TestBed for Angular components
**Test Location:** Component and service test files using `.spec.ts` extension
**Coverage Requirements:** Lines: 85%, Branches: 75%, Functions: 85%

**Testing Strategy:**

- **Unit Tests:** Test service methods and component interactions
- **Integration Tests:** Test complete authentication flow with mocked Cognito
- **UI Tests:** Test form validation and user feedback
- **Accessibility Tests:** Test ARIA labels and keyboard navigation

**Mock Setup:**

```typescript
// Mock AWS Amplify Auth for testing
const mockAuth = {
  configure: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
  currentAuthenticatedUser: vi.fn(),
  currentSession: vi.fn(),
};

vi.mock('@aws-amplify/auth', () => ({
  Auth: mockAuth,
}));
```

**Key Test Scenarios:**

- Successful login with valid credentials
- Login failure with invalid credentials
- Form validation with empty and invalid inputs
- Loading states during authentication
- Error message display and clearing
- Logout functionality and token cleanup
- Authentication state signal updates
- Component cleanup and memory leaks

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
