import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router } from '@angular/router';

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
    MatCheckboxModule,
  ],
  templateUrl: './login.html',
  styleUrl: './login.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Login {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  hidePassword = signal(true);
  isLoading = signal(false);
  errorMessage = signal<string | null>(null);
  passwordFieldType = signal<'password' | 'text'>('password');
  passwordToggleAriaLabel = signal('Show password');
  passwordToggleIcon = signal('visibility_off');
  emailHasRequiredError = signal(false);
  emailHasFormatError = signal(false);
  passwordHasRequiredError = signal(false);
  passwordHasMinLengthError = signal(false);

  loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    rememberMe: [
      localStorage.getItem('rms_remember_me') === 'true', // Default to previous preference
    ],
  });

  emailControl = this.loginForm.get('email');
  passwordControl = this.loginForm.get('password');
  rememberMeControl = this.loginForm.get('rememberMe');

  togglePasswordVisibility(): void {
    const isHidden = this.hidePassword();
    this.hidePassword.set(!isHidden);
    this.passwordFieldType.set(isHidden ? 'text' : 'password');
    this.passwordToggleAriaLabel.set(
      isHidden ? 'Hide password' : 'Show password'
    );
    this.passwordToggleIcon.set(isHidden ? 'visibility' : 'visibility_off');
  }

  updateValidationErrors(): void {
    this.emailHasRequiredError.set(
      this.emailControl?.hasError('required') ?? false
    );
    this.emailHasFormatError.set(this.emailControl?.hasError('email') ?? false);
    this.passwordHasRequiredError.set(
      this.passwordControl?.hasError('required') ?? false
    );
    this.passwordHasMinLengthError.set(
      this.passwordControl?.hasError('minlength') ?? false
    );
  }

  async onSubmit(): Promise<void> {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      this.updateValidationErrors();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const { email, password, rememberMe } = this.loginForm.value;

    try {
      // Store remember me preference
      localStorage.setItem('rms_remember_me', String(rememberMe ?? false));

      if (rememberMe === true) {
        await this.authService.signInWithRememberMe(email!, password!);
      } else {
        await this.authService.signIn(email!, password!);
      }
      void this.router.navigate(['/']);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Login failed. Please try again.';
      this.errorMessage.set(message);
    } finally {
      this.isLoading.set(false);
    }
  }
}
