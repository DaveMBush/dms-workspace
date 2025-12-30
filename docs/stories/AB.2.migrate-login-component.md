# Story AB.2: Migrate Login Component

## Story

**As a** user of the dms-material application
**I want** to log in using a Material-styled login form
**So that** I can access the protected application features

## Context

**Current System:**

- Location: `apps/dms/src/app/auth/login/login.ts`
- PrimeNG components used:
  - `pInputText` - Email input
  - `p-password` - Password input with visibility toggle
  - `p-button` - Submit button
  - `p-message` - Error messages

**Migration Target:**

- `mat-form-field` + `matInput` - Form inputs
- Custom password visibility toggle with `mat-icon`
- `mat-button` - Submit button
- `mat-error` - Validation errors

## Acceptance Criteria

### Functional Requirements

- [ ] Email input with validation
- [ ] Password input with visibility toggle
- [ ] Form validation before submission
- [ ] Error messages display for invalid credentials
- [ ] Loading state during authentication
- [ ] Redirect to home on successful login
- [ ] Remember me functionality (if exists in current)

### Technical Requirements

- [ ] Reactive forms used for form handling
- [ ] `mat-form-field` with `appearance="outline"`
- [ ] Password visibility toggle using `mat-icon-button`
- [ ] `mat-error` for validation messages
- [ ] `mat-spinner` or button loading state
- [ ] Same auth service calls as current implementation

### Visual Requirements

- [ ] Centered card layout
- [ ] Consistent with current login page styling
- [ ] Responsive for mobile screens
- [ ] Proper form field spacing

### Validation Requirements

- [ ] Email format validation
- [ ] Required field validation
- [ ] Login succeeds with valid credentials
- [ ] Login fails gracefully with invalid credentials
- [ ] All validation commands pass

## Test-Driven Development Approach

**Write tests BEFORE implementation code.**

### Step 1: Create Unit Tests First

Create `apps/dms-material/src/app/auth/login/login.spec.ts`:

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Login } from './login';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';

describe('Login', () => {
  let component: Login;
  let fixture: ComponentFixture<Login>;
  let mockAuthService: { login: ReturnType<typeof vi.fn> };
  let mockRouter: { navigate: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    mockAuthService = { login: vi.fn() };
    mockRouter = { navigate: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [Login, NoopAnimationsModule],
      providers: [{ provide: Router, useValue: mockRouter }],
    }).compileComponents();

    fixture = TestBed.createComponent(Login);
    component = fixture.componentInstance;
  });

  describe('form rendering', () => {
    it('should render email input', () => {
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('input[formControlName="email"]')).toBeTruthy();
    });

    it('should render password input', () => {
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('input[formControlName="password"]')).toBeTruthy();
    });

    it('should render submit button', () => {
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('button[type="submit"]')).toBeTruthy();
    });
  });

  describe('validation', () => {
    it('should show error for invalid email', () => {
      component.loginForm.patchValue({ email: 'invalid' });
      component.loginForm.get('email')?.markAsTouched();
      expect(component.loginForm.get('email')?.hasError('email')).toBe(true);
    });

    it('should show error for empty email', () => {
      component.loginForm.get('email')?.markAsTouched();
      expect(component.loginForm.get('email')?.hasError('required')).toBe(true);
    });

    it('should show error for short password', () => {
      component.loginForm.patchValue({ password: '123' });
      component.loginForm.get('password')?.markAsTouched();
      expect(component.loginForm.get('password')?.hasError('minlength')).toBe(true);
    });
  });

  describe('password visibility', () => {
    it('should toggle password visibility', () => {
      expect(component.hidePassword()).toBe(true);
      component.togglePasswordVisibility();
      expect(component.hidePassword()).toBe(false);
    });
  });

  describe('form submission', () => {
    it('should not submit if form is invalid', async () => {
      await component.onSubmit();
      expect(mockAuthService.login).not.toHaveBeenCalled();
    });

    it('should set loading state during submission', async () => {
      mockAuthService.login.mockResolvedValue({});
      component.loginForm.patchValue({ email: 'test@test.com', password: 'password123' });

      const submitPromise = component.onSubmit();
      expect(component.isLoading()).toBe(true);
      await submitPromise;
    });

    it('should navigate on successful login', async () => {
      mockAuthService.login.mockResolvedValue({});
      component.loginForm.patchValue({ email: 'test@test.com', password: 'password123' });
      await component.onSubmit();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/']);
    });

    it('should show error on failed login', async () => {
      mockAuthService.login.mockRejectedValue(new Error('Invalid credentials'));
      component.loginForm.patchValue({ email: 'test@test.com', password: 'password123' });
      await component.onSubmit();
      expect(component.errorMessage()).toBeTruthy();
    });
  });
});
```

**TDD Cycle:**

1. Run `pnpm nx run dms-material:test` - tests should fail (RED)
2. Implement minimal code to pass tests (GREEN)
3. Refactor while keeping tests passing (REFACTOR)

## Technical Approach

### Step 1: Create Login Component

Create `apps/dms-material/src/app/auth/login/login.ts`:

```typescript
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { AuthService } from '../auth.service';

@Component({
  selector: 'dms-login',
  imports: [ReactiveFormsModule, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  hidePassword = signal(true);
  isLoading = signal(false);
  errorMessage = signal<string | null>(null);

  loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  togglePasswordVisibility(): void {
    this.hidePassword.update((hide) => !hide);
  }

  async onSubmit(): Promise<void> {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const { email, password } = this.loginForm.value;

    try {
      await this.authService.login(email!, password!);
      this.router.navigate(['/']);
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'Login failed. Please try again.');
    } finally {
      this.isLoading.set(false);
    }
  }
}
```

### Step 2: Create Login Template

Create `apps/dms-material/src/app/auth/login/login.html`:

```html
<div class="login-container">
  <mat-card class="login-card">
    <mat-card-header>
      <mat-card-title>Welcome to DMS</mat-card-title>
      <mat-card-subtitle>Sign in to continue</mat-card-subtitle>
    </mat-card-header>

    <mat-card-content>
      <form [formGroup]="loginForm" (ngSubmit)="onSubmit()">
        @if (errorMessage()) {
        <div class="error-banner">
          <mat-icon>error</mat-icon>
          <span>{{ errorMessage() }}</span>
        </div>
        }

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Email</mat-label>
          <input matInput type="email" formControlName="email" placeholder="Enter your email" autocomplete="email" />
          <mat-icon matPrefix>email</mat-icon>
          @if (loginForm.get('email')?.hasError('required')) {
          <mat-error>Email is required</mat-error>
          } @if (loginForm.get('email')?.hasError('email')) {
          <mat-error>Please enter a valid email</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Password</mat-label>
          <input matInput [type]="hidePassword() ? 'password' : 'text'" formControlName="password" placeholder="Enter your password" autocomplete="current-password" />
          <mat-icon matPrefix>lock</mat-icon>
          <button mat-icon-button matSuffix type="button" (click)="togglePasswordVisibility()" [attr.aria-label]="hidePassword() ? 'Show password' : 'Hide password'">
            <mat-icon>{{ hidePassword() ? 'visibility_off' : 'visibility' }}</mat-icon>
          </button>
          @if (loginForm.get('password')?.hasError('required')) {
          <mat-error>Password is required</mat-error>
          } @if (loginForm.get('password')?.hasError('minlength')) {
          <mat-error>Password must be at least 8 characters</mat-error>
          }
        </mat-form-field>

        <button mat-raised-button color="primary" type="submit" class="full-width submit-button" [disabled]="isLoading()">
          @if (isLoading()) {
          <mat-spinner diameter="20"></mat-spinner>
          } @else { Sign In }
        </button>
      </form>
    </mat-card-content>
  </mat-card>
</div>
```

### Step 3: Create Login Styles

Create `apps/dms-material/src/app/auth/login/login.scss`:

```scss
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-color: var(--dms-background);
  padding: 1rem;
}

.login-card {
  width: 100%;
  max-width: 400px;

  mat-card-header {
    justify-content: center;
    margin-bottom: 1.5rem;

    mat-card-title {
      text-align: center;
    }

    mat-card-subtitle {
      text-align: center;
    }
  }
}

.full-width {
  width: 100%;
}

.error-banner {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  margin-bottom: 1rem;
  background-color: rgba(239, 68, 68, 0.1);
  border: 1px solid var(--dms-error);
  border-radius: 4px;
  color: var(--dms-error);

  mat-icon {
    font-size: 20px;
    width: 20px;
    height: 20px;
  }
}

.submit-button {
  margin-top: 1rem;
  height: 48px;

  mat-spinner {
    margin: 0 auto;
  }
}

mat-form-field {
  margin-bottom: 0.5rem;
}
```

### Step 4: Update Routes

Add login route to `apps/dms-material/src/app/app.routes.ts`:

```typescript
{
  path: 'auth',
  canActivate: [guestGuard],
  children: [
    {
      path: 'login',
      loadComponent: async () =>
        import('./auth/login/login').then((m) => m.Login),
    },
    {
      path: '',
      redirectTo: 'login',
      pathMatch: 'full',
    },
  ],
},
```

## Files Created

| File                    | Purpose         |
| ----------------------- | --------------- |
| `auth/login/login.ts`   | Login component |
| `auth/login/login.html` | Login template  |
| `auth/login/login.scss` | Login styles    |

## Definition of Done

- [ ] Login page renders with Material styling
- [ ] Email validation works (required, format)
- [ ] Password validation works (required, minlength)
- [ ] Password visibility toggle works
- [ ] Form submission calls auth service
- [ ] Loading state shows during submission
- [ ] Error messages display correctly
- [ ] Successful login redirects to home
- [ ] Guest guard prevents authenticated users from accessing
- [ ] All validation commands pass

## E2E Test Requirements

When this story is complete, ensure the following e2e tests exist in `apps/dms-material-e2e/`:

### Core Functionality

- [ ] Login page renders correctly
- [ ] Email validation shows error for invalid format
- [ ] Password validation shows error for too short
- [ ] Password visibility toggle shows/hides password
- [ ] Valid credentials redirect to home page
- [ ] Invalid credentials show error message
- [ ] Loading spinner shows during authentication
- [ ] Authenticated users redirected away from login

### Edge Cases

- [ ] Form submit prevented when fields are empty
- [ ] Multiple rapid form submissions are debounced
- [ ] Network timeout shows appropriate error message
- [ ] Server 500 error shows generic error message
- [ ] Session expired during login attempt is handled gracefully
- [ ] XSS attempt in email field is sanitized
- [ ] SQL injection attempt in email field is sanitized
- [ ] Very long email address is handled (max length validation)
- [ ] Password field does not autocomplete sensitive data
- [ ] Tab order follows logical flow (email → password → submit)
- [ ] Enter key submits form from password field
- [ ] Form state resets after failed login attempt
- [ ] Error message cleared when user starts typing again

Run `pnpm nx run dms-material-e2e:e2e` to verify all e2e tests pass.
