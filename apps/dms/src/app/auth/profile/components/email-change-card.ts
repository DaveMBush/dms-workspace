import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';

import { ProfileActionsService } from '../../services/profile-actions.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'dms-email-change-card',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CardModule,
    ButtonModule,
    InputTextModule,
  ],
  templateUrl: './email-change-card.html',
  styleUrls: ['./email-change-card.scss'],
})
export class EmailChangeCard {
  private fb = inject(FormBuilder);
  private profileActionsService = inject(ProfileActionsService);

  isSubmitting$ = signal(false);
  showEmailVerification$ = signal(false);
  emailChangeForm: FormGroup;

  // eslint-disable-next-line @smarttools/no-anonymous-functions -- Uses this binding
  isNewEmailInvalid$ = computed(() => {
    const control = this.emailChangeForm.get('newEmail');
    return Boolean(control?.invalid) && Boolean(control?.touched);
  });

  isEmailFormDisabled$ = computed(
    // eslint-disable-next-line @smarttools/no-anonymous-functions -- Computed signal requires this binding
    () =>
      Boolean(this.emailChangeForm.get('newEmail')?.invalid) ||
      this.isSubmitting$()
  );

  // eslint-disable-next-line @smarttools/no-anonymous-functions -- Uses this binding
  isVerificationCodeEmpty$ = computed(() => {
    const codeControl = this.emailChangeForm.get('verificationCode');
    const value = codeControl?.value as string | null;
    return value === null || value === undefined || value === '';
  });

  constructor() {
    this.emailChangeForm = this.fb.group({
      newEmail: ['', [Validators.required, Validators.email]],
      verificationCode: [''],
    });
  }

  async onChangeEmail(): Promise<void> {
    if (!this.emailChangeForm.valid || this.isSubmitting$()) {
      return;
    }

    this.isSubmitting$.set(true);

    try {
      const formValue = this.emailChangeForm.value as { newEmail: string };
      const success = await this.profileActionsService.updateEmail(
        formValue.newEmail
      );
      if (success) {
        this.showEmailVerification$.set(true);
      }
    } finally {
      this.isSubmitting$.set(false);
    }
  }

  async onVerifyEmail(): Promise<void> {
    const formValue = this.emailChangeForm.value as {
      verificationCode: string;
    };
    const success = await this.profileActionsService.verifyEmailChange(
      formValue.verificationCode
    );
    if (success) {
      this.emailChangeForm.reset();
      this.showEmailVerification$.set(false);
    }
  }
}
