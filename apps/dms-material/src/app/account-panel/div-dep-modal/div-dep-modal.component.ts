import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';

import { DivDeposit } from '../../store/div-deposits/div-deposit.interface';
import { DivDepModalData } from './div-dep-modal-data.interface';

@Component({
  selector: 'rms-div-dep-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './div-dep-modal.component.html',
  styleUrl: './div-dep-modal.component.scss',
})
export class DivDepModal implements OnInit {
  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<DivDepModal>);
  data = inject<DivDepModalData>(MAT_DIALOG_DATA);

  isLoading$ = signal(false);

  depositTypes = ['Regular', 'Special', 'Return of Capital', 'Qualified'];

  form = this.fb.group({
    symbol: ['', Validators.required],
    date: [null as Date | null, Validators.required],
    amount: [0, [Validators.required, Validators.min(0.01)]],
    type: ['Regular', Validators.required],
  });

  // eslint-disable-next-line @smarttools/no-anonymous-functions -- hiding arrow function
  symbolHasError$ = computed(() => {
    return this.form.get('symbol')?.hasError('required') ?? false;
  });

  // eslint-disable-next-line @smarttools/no-anonymous-functions -- hiding arrow function
  dateHasError$ = computed(() => {
    return this.form.get('date')?.hasError('required') ?? false;
  });

  // eslint-disable-next-line @smarttools/no-anonymous-functions -- hiding arrow function
  amountHasError$ = computed(() => {
    return this.form.get('amount')?.hasError('required') ?? false;
  });

  // eslint-disable-next-line @smarttools/no-anonymous-functions -- hiding arrow function
  buttonLabel$ = computed(() => {
    return this.isEditMode ? 'Update' : 'Save';
  });

  get isEditMode(): boolean {
    return this.data.mode === 'edit';
  }

  get title(): string {
    return this.isEditMode
      ? 'Edit Dividend or Deposit'
      : 'New Dividend or Deposit';
  }

  ngOnInit(): void {
    if (this.isEditMode && this.data.dividend) {
      this.form.patchValue({
        symbol: this.data.dividend.symbol,
        date: this.data.dividend.exDate || this.data.dividend.date,
        amount: this.data.dividend.amount,
        type: this.data.dividend.type,
      });
    }
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isLoading$.set(true);

    // Build dividend object
    const dividend: Partial<DivDeposit> = {
      ...this.data.dividend,
      ...this.form.value,
    } as Partial<DivDeposit>;

    // In real implementation, save via SmartNgRX
    // eslint-disable-next-line @smarttools/no-anonymous-functions -- hiding arrow function
    setTimeout(() => {
      this.isLoading$.set(false);
      this.dialogRef.close(dividend);
    }, 500);
  }

  onCancel(): void {
    this.dialogRef.close(null);
  }
}
