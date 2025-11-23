# Story AB.2: Migrate Login Component

## Story

**As a** user of the rms-material application
**I want** to log in using a Material-styled login form
**So that** I can access the protected application features

## Context

**Current System:**

- Location: `apps/rms/src/app/auth/login/login.ts`
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

## Technical Approach

### Step 1: Create Login Component

Create `apps/rms-material/src/app/auth/login/login.ts`:

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
  selector: 'rms-login',
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
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
      this.errorMessage.set(
        error instanceof Error ? error.message : 'Login failed. Please try again.'
      );
    } finally {
      this.isLoading.set(false);
    }
  }
}
```

### Step 2: Create Login Template

Create `apps/rms-material/src/app/auth/login/login.html`:

```html
<div class="login-container">
  <mat-card class="login-card">
    <mat-card-header>
      <mat-card-title>Welcome to RMS</mat-card-title>
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
          <input
            matInput
            type="email"
            formControlName="email"
            placeholder="Enter your email"
            autocomplete="email"
          />
          <mat-icon matPrefix>email</mat-icon>
          @if (loginForm.get('email')?.hasError('required')) {
            <mat-error>Email is required</mat-error>
          }
          @if (loginForm.get('email')?.hasError('email')) {
            <mat-error>Please enter a valid email</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Password</mat-label>
          <input
            matInput
            [type]="hidePassword() ? 'password' : 'text'"
            formControlName="password"
            placeholder="Enter your password"
            autocomplete="current-password"
          />
          <mat-icon matPrefix>lock</mat-icon>
          <button
            mat-icon-button
            matSuffix
            type="button"
            (click)="togglePasswordVisibility()"
            [attr.aria-label]="hidePassword() ? 'Show password' : 'Hide password'"
          >
            <mat-icon>{{ hidePassword() ? 'visibility_off' : 'visibility' }}</mat-icon>
          </button>
          @if (loginForm.get('password')?.hasError('required')) {
            <mat-error>Password is required</mat-error>
          }
          @if (loginForm.get('password')?.hasError('minlength')) {
            <mat-error>Password must be at least 8 characters</mat-error>
          }
        </mat-form-field>

        <button
          mat-raised-button
          color="primary"
          type="submit"
          class="full-width submit-button"
          [disabled]="isLoading()"
        >
          @if (isLoading()) {
            <mat-spinner diameter="20"></mat-spinner>
          } @else {
            Sign In
          }
        </button>
      </form>
    </mat-card-content>
  </mat-card>
</div>
```

### Step 3: Create Login Styles

Create `apps/rms-material/src/app/auth/login/login.scss`:

```scss
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-color: var(--rms-background);
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
  border: 1px solid var(--rms-error);
  border-radius: 4px;
  color: var(--rms-error);

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

Add login route to `apps/rms-material/src/app/app.routes.ts`:

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

| File | Purpose |
|------|---------|
| `auth/login/login.ts` | Login component |
| `auth/login/login.html` | Login template |
| `auth/login/login.scss` | Login styles |

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
