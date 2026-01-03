import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
  ViewEncapsulation,
} from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { PasswordModule } from 'primeng/password';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

import { GlobalLoadingService } from '../../shared/services/global-loading.service';
import { AuthService } from '../auth.service';
import { LoginFormData } from '../auth.types';

@Component({
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    CheckboxModule,
    InputTextModule,
    MessageModule,
    PasswordModule,
    ProgressSpinnerModule,
  ],
  templateUrl: './login.html',
  styleUrl: './login.scss',
  selector: 'dms-login',
  encapsulation: ViewEncapsulation.Emulated,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Login implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private globalLoading = inject(GlobalLoadingService);

  loginForm!: FormGroup;
  isSubmitting = signal(false);

  // Signals to track form state changes
  private emailTouched = signal(false);
  private passwordTouched = signal(false);
  private formValid = signal(false);

  // Remember Me state
  private rememberMeChecked = signal(false);

  // Computed signals for reactive UI
  isLoading$ = computed(
    // eslint-disable-next-line @smarttools/no-anonymous-functions -- Arrow function required for proper this binding in computed signal
    () => this.authService.isLoading() || this.isSubmitting()
  );

  // eslint-disable-next-line @smarttools/no-anonymous-functions -- Arrow function required for proper this binding in computed signal
  authError$ = computed(() => this.authService.error());

  // Form validation computed signals
  // eslint-disable-next-line @smarttools/no-anonymous-functions -- Arrow function required for proper this binding in computed signal
  emailInvalid = computed(() => {
    const emailControl = this.loginForm?.get('email');
    return Boolean((emailControl?.invalid ?? false) && this.emailTouched());
  });

  // eslint-disable-next-line @smarttools/no-anonymous-functions -- Arrow function required for proper this binding in computed signal
  passwordInvalid = computed(() => {
    const passwordControl = this.loginForm?.get('password');
    return Boolean(
      (passwordControl?.invalid ?? false) && this.passwordTouched()
    );
  });

  // eslint-disable-next-line @smarttools/no-anonymous-functions -- Arrow function required for proper this binding in computed signal
  isFormInvalid = computed(() =>
    Boolean(!this.formValid() || this.isLoading$())
  );

  // Remember Me computed signal
  // eslint-disable-next-line @smarttools/no-anonymous-functions -- Arrow function required for proper this binding in computed signal
  isRememberMeEnabled = computed(() => this.rememberMeChecked());

  ngOnInit(): void {
    this.initializeForm();
    this.clearAuthError();
  }

  // Getter methods for template access
  // eslint-disable-next sonarjs/no-duplicate-string -- Required for imports
  get emailControl(): import('@angular/forms').AbstractControl<unknown> | null {
    return this.loginForm.get('email');
  }

  get passwordControl(): // eslint-disable-next sonarjs/no-duplicate-string -- Required for imports
  import('@angular/forms').AbstractControl<unknown> | null {
    return this.loginForm.get('password');
  }

  get rememberMeControl(): // eslint-disable-next sonarjs/no-duplicate-string -- Required for imports
  import('@angular/forms').AbstractControl<unknown> | null {
    return this.loginForm.get('rememberMe');
  }

  // Email validation error messages
  // eslint-disable-next-line @smarttools/no-anonymous-functions -- Arrow function required for proper this binding in computed signal
  getEmailErrorMessage = computed(() => {
    const emailControl = this.loginForm?.get('email');
    if (emailControl?.hasError('required') === true) {
      return 'Email is required';
    }
    if (emailControl?.hasError('email') === true) {
      return 'Please enter a valid email address';
    }
    return '';
  });

  // Password validation error messages
  // eslint-disable-next-line @smarttools/no-anonymous-functions -- Arrow function required for proper this binding in computed signal
  getPasswordErrorMessage = computed(() => {
    const passwordControl = this.loginForm?.get('password');
    if (passwordControl?.hasError('required') === true) {
      return 'Password is required';
    }
    if (passwordControl?.hasError('minlength') === true) {
      return 'Password must be at least 8 characters long';
    }
    return '';
  });

  async onSubmit(): Promise<void> {
    if (this.loginForm.valid && !this.isLoading$()) {
      this.isSubmitting.set(true);
      this.globalLoading.show('Signing you in...');
      this.clearAuthError();

      try {
        const formData = this.loginForm.value as LoginFormData & {
          rememberMe: boolean;
        };

        await this.performSignIn(formData);

        // Navigate to dashboard or return URL
        const returnUrl = this.getReturnUrl();
        await this.router.navigate([returnUrl]);
      } catch {
        // Error is handled by AuthService and displayed via reactive signals
      } finally {
        this.isSubmitting.set(false);
        this.globalLoading.hide();
      }
    } else {
      this.markFormGroupTouched();
    }
  }

  /**
   * Handle remember me checkbox change
   */
  onRememberMeChange(checked: boolean): void {
    this.rememberMeChecked.set(checked);
    const rememberMeControl = this.loginForm.get('rememberMe');
    if (rememberMeControl) {
      rememberMeControl.setValue(checked);
    }
  }

  private async performSignIn(
    formData: LoginFormData & { rememberMe: boolean }
  ): Promise<void> {
    if (formData.rememberMe) {
      await this.authService.signInWithRememberMe(
        formData.email,
        formData.password
      );
    } else {
      await this.authService.signIn({
        username: formData.email,
        password: formData.password,
      });
    }
  }

  private initializeForm(): void {
    // Check if remember me was previously enabled
    const previousRememberMe =
      localStorage.getItem('dms_remember_me') === 'true';

    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      rememberMe: [previousRememberMe], // Default to previous preference
    });

    // Subscribe to form control state changes
    const emailControl = this.loginForm.get('email');
    const passwordControl = this.loginForm.get('password');
    const rememberMeControl = this.loginForm.get('rememberMe');

    // eslint-disable-next-line @smarttools/no-anonymous-functions -- Subscription callback required for form control state tracking
    emailControl?.statusChanges.subscribe(() => {
      this.emailTouched.set(emailControl.touched);
    });

    // eslint-disable-next-line @smarttools/no-anonymous-functions -- Subscription callback required for form control state tracking
    passwordControl?.statusChanges.subscribe(() => {
      this.passwordTouched.set(passwordControl.touched);
    });

    // Track remember me changes
    // eslint-disable-next-line @smarttools/no-anonymous-functions -- Subscription callback required for form control state tracking
    rememberMeControl?.valueChanges.subscribe((value: unknown) => {
      this.rememberMeChecked.set(Boolean(value));
    });

    // Set initial remember me state
    this.rememberMeChecked.set(Boolean(rememberMeControl?.value ?? false));

    // Subscribe to form validity changes
    // eslint-disable-next-line @smarttools/no-anonymous-functions -- Subscription callback required for form validity tracking
    this.loginForm.statusChanges.subscribe(() => {
      this.formValid.set(this.loginForm.valid);
    });

    // Set initial form validity
    this.formValid.set(this.loginForm.valid);
  }

  private clearAuthError(): void {
    this.authService.clearError();
  }

  private getReturnUrl(): string {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('returnUrl') ?? '/';
  }

  private markFormGroupTouched(): void {
    const controls = this.loginForm.controls;
    // eslint-disable-next-line @smarttools/no-anonymous-functions -- Arrow function required for proper this binding in computed signal
    Object.keys(controls).forEach((key: string) => {
      this.loginForm.get(key)?.markAsTouched();
    });
  }
}
