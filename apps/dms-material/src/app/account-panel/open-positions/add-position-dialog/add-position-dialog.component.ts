import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { AddPositionData } from './add-position-data.interface';

@Component({
  selector: 'dms-add-position-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './add-position-dialog.component.html',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatDatepickerModule,
  ],
})
export class AddPositionDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<AddPositionDialogComponent>);
  readonly data: AddPositionData = inject<AddPositionData>(MAT_DIALOG_DATA);

  form: FormGroup;

  // Expose controls for template access without function calls
  get symbolControl(): FormControl {
    return this.form.get('symbol') as FormControl;
  }

  get quantityControl(): FormControl {
    return this.form.get('quantity') as FormControl;
  }

  get priceControl(): FormControl {
    return this.form.get('price') as FormControl;
  }

  get purchaseDateControl(): FormControl {
    return this.form.get('purchase_date') as FormControl;
  }

  constructor() {
    this.form = this.fb.group({
      symbol: ['', [Validators.required]],
      quantity: [null, [Validators.required, Validators.min(1)]],
      price: [null, [Validators.required, Validators.min(0.01)]],
      purchase_date: ['', [Validators.required]],
    });
  }

  onSave(): void {
    if (this.form.valid) {
      this.dialogRef.close(this.form.value);
    }
  }

  onCancel(): void {
    this.dialogRef.close(null);
  }
}
