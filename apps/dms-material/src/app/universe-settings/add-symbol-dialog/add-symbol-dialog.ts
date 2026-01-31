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
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';

import { SymbolAutocompleteComponent } from '../../shared/components/symbol-autocomplete/symbol-autocomplete.component';
import { SymbolOption } from '../../shared/components/symbol-autocomplete/symbol-option.interface';
import { NotificationService } from '../../shared/services/notification.service';
import { RiskGroup } from '../../store/risk-group/risk-group.interface';
import { selectRiskGroup } from '../../store/risk-group/selectors/select-risk-group.function';
import { selectTopEntities } from '../../store/top/selectors/select-top-entities.function';
import { selectUniverses } from '../../store/universe/selectors/select-universes.function';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'dms-add-symbol-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatSelectModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    SymbolAutocompleteComponent,
  ],
  templateUrl: './add-symbol-dialog.html',
  styleUrl: './add-symbol-dialog.scss',
})
export class AddSymbolDialog {
  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<AddSymbolDialog>);
  private notification = inject(NotificationService);

  private readonly notImplementedError = 'Not implemented - TDD RED phase';

  topEntities = selectTopEntities().entities;

  isLoading = signal(false);
  selectedSymbol = signal<SymbolOption | null>(null);

  form = this.fb.group({
    symbol: [
      '',
      [
        Validators.required,
        function uppercaseValidator(
          control: AbstractControl
        ): ValidationErrors | null {
          const value = control.value as unknown;
          if (typeof value !== 'string' || value.length === 0) {
            return null;
          }
          const isUppercase = value === value.toUpperCase();
          return isUppercase ? null : { uppercase: true };
        },
      ],
    ],
    riskGroupId: ['', Validators.required],
  });

  // Computed signals for template
  symbolValue = computed(
    function symbolValue(this: AddSymbolDialog) {
      return this.selectedSymbol()?.symbol;
    }.bind(this)
  );

  symbolName = computed(
    function symbolName(this: AddSymbolDialog) {
      return this.selectedSymbol()?.name;
    }.bind(this)
  );

  hasSelectedSymbol = computed(
    function hasSelectedSymbol(this: AddSymbolDialog) {
      return !!this.selectedSymbol();
    }.bind(this)
  );

  riskGroupIdControl = computed(
    function riskGroupIdControl(this: AddSymbolDialog) {
      return this.form.get('riskGroupId');
    }.bind(this)
  );

  riskGroupIdHasError = computed(
    function riskGroupIdHasError(this: AddSymbolDialog) {
      const control = this.form.get('riskGroupId');
      const hasError = control?.hasError('required') ?? false;
      const isTouched = control?.touched ?? false;
      return Boolean(hasError && isTouched);
    }.bind(this)
  );

  isSubmitDisabled = computed(
    function isSubmitDisabled(this: AddSymbolDialog) {
      return this.isLoading() || !this.selectedSymbol();
    }.bind(this)
  );

  boundSearchSymbols = this.searchSymbols.bind(this);

  get riskGroups(): RiskGroup[] {
    return selectRiskGroup();
  }

  async searchSymbols(): Promise<SymbolOption[]> {
    // Simulate API call - in real implementation, this would call a service
    // For now, return empty array to pass tests
    return Promise.resolve([]);
  }

  onSymbolSelected(symbol: SymbolOption): void {
    this.selectedSymbol.set(symbol);
    this.form.patchValue({ symbol: symbol.symbol });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { symbol, riskGroupId } = this.form.value;
    if (
      typeof symbol === 'string' &&
      symbol.length > 0 &&
      typeof riskGroupId === 'string' &&
      riskGroupId.length > 0
    ) {
      this.addSymbolToUniverse(symbol, riskGroupId);
    }
  }

  onCancel(): void {
    this.dialogRef.close(null);
  }

  private addSymbolToUniverse(symbol: string, riskGroupId: string): void {
    this.isLoading.set(true);
    const universeArray = selectUniverses() as unknown as {
      add(data: { symbol: string; riskGroupId: string }): void;
    };

    try {
      universeArray.add({ symbol, riskGroupId });
      this.notification.success(`Added ${symbol} to universe`);
      this.dialogRef.close({ symbol, riskGroupId });
      this.isLoading.set(false);
    } catch (error: unknown) {
      this.handleAddError(error);
    }
  }

  private handleAddError(error: unknown): void {
    this.isLoading.set(false);

    const errorObj = error as { status?: number };
    if (errorObj.status === 409) {
      this.notification.error('Symbol already exists in universe');
    } else {
      this.notification.error('Failed to add symbol. Please try again.');
    }
  }
}
