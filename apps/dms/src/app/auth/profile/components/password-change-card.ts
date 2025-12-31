import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { PasswordModule } from 'primeng/password';

import { ProfileActionsService } from '../../services/profile-actions.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'dms-password-change-card',
  imports: [ReactiveFormsModule, CardModule, ButtonModule, PasswordModule],
  templateUrl: './password-change-card.html',
  styleUrls: ['./password-change-card.scss'],
})
export class PasswordChangeCard {
  private fb = inject(FormBuilder);
  private profileActionsService = inject(ProfileActionsService);

  isSubmitting$ = signal(false);
  passwordChangeForm: FormGroup;

  // eslint-disable-next-line @smarttools/no-anonymous-functions -- Uses this binding
  isCurrentPasswordInvalid$ = computed(() => {
    const control = this.passwordChangeForm.get('currentPassword');
    return Boolean(control?.invalid) && Boolean(control?.touched);
  });

  // eslint-disable-next-line @smarttools/no-anonymous-functions -- Uses this binding
  isNewPasswordInvalid$ = computed(() => {
    const control = this.passwordChangeForm.get('newPassword');
    return Boolean(control?.invalid) && Boolean(control?.touched);
  });

  // eslint-disable-next-line @smarttools/no-anonymous-functions -- Uses this binding
  hasPasswordMismatch$ = computed(() => {
    const confirmControl = this.passwordChangeForm.get('confirmPassword');
    const hasError = this.passwordChangeForm.errors?.['passwordMismatch'] as
      | boolean
      | undefined;
    return Boolean(hasError) && Boolean(confirmControl?.touched);
  });

  isPasswordFormDisabled$ = computed(
    // eslint-disable-next-line @smarttools/no-anonymous-functions -- Computed signal requires this binding
    () => this.passwordChangeForm.invalid || this.isSubmitting$()
  );

  constructor() {
    this.passwordChangeForm = this.fb.group(
      {
        currentPassword: ['', Validators.required],
        newPassword: [
          '',
          [
            Validators.required,
            Validators.minLength(8),
            this.passwordStrengthValidator.bind(this),
          ],
        ],
        confirmPassword: ['', Validators.required],
      },
      { validators: this.passwordMatchValidator.bind(this) }
    );
  }

  async onChangePassword(): Promise<void> {
    if (!this.passwordChangeForm.valid || this.isSubmitting$()) {
      return;
    }

    this.isSubmitting$.set(true);

    try {
      const formValue = this.passwordChangeForm.value as {
        currentPassword: string;
        newPassword: string;
      };
      const success = await this.profileActionsService.changePassword(
        formValue.currentPassword,
        formValue.newPassword
      );
      if (success) {
        this.passwordChangeForm.reset();
      }
    } finally {
      this.isSubmitting$.set(false);
    }
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
    const value: string = control.value as string;
    if (!value) {
      return null;
    }

    const hasNumber = /\d/.test(value);
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
