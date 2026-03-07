import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import { CusipCacheEntry } from './cusip-cache-entry.interface';
import { CusipCacheSource } from './cusip-cache-source.type';

const CUSIP_PATTERN = /^[A-Za-z0-9]{9}$/;

@Component({
  selector: 'dms-cusip-cache-add-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
  ],
  templateUrl: './cusip-cache-add-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CusipCacheAddDialogComponent {
  private readonly fb = inject(FormBuilder);

  private readonly dialogRef = inject(
    MatDialogRef<CusipCacheAddDialogComponent>
  );

  readonly data: CusipCacheEntry | null =
    inject<CusipCacheEntry | null>(MAT_DIALOG_DATA, { optional: true }) ?? null;

  readonly isEdit = this.data !== null;

  readonly form: FormGroup = this.fb.group({
    cusip: [
      { value: this.data?.cusip ?? '', disabled: this.isEdit },
      [Validators.required, Validators.pattern(CUSIP_PATTERN)],
    ],
    symbol: [
      this.data?.symbol ?? '',
      [Validators.required, Validators.minLength(1)],
    ],
    source: [this.data?.source ?? 'OPENFIGI', [Validators.required]],
    reason: [''],
  });

  onSubmit(): void {
    if (this.form.invalid) {
      return;
    }
    const rawValue = this.form.getRawValue() as {
      cusip: string;
      symbol: string;
      source: CusipCacheSource;
      reason: string;
    };
    rawValue.symbol = rawValue.symbol.trim();
    if (rawValue.symbol.length === 0) {
      return;
    }
    this.dialogRef.close(rawValue);
  }

  onCancel(): void {
    this.dialogRef.close(null);
  }
}
