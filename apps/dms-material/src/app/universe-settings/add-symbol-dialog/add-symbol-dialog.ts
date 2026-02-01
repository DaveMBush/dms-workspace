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
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { firstValueFrom } from 'rxjs';

import { SymbolAutocompleteComponent } from '../../shared/components/symbol-autocomplete/symbol-autocomplete.component';
import { SymbolOption } from '../../shared/components/symbol-autocomplete/symbol-option.interface';
import { NotificationService } from '../../shared/services/notification.service';
import { SymbolSearchService } from '../../shared/services/symbol-search.service';
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
  private symbolSearchService = inject(SymbolSearchService);

  topEntities = selectTopEntities().entities;

  // Track existing symbols for duplicate validation
  existingSymbols = computed(
    function existingSymbols(this: AddSymbolDialog) {
      const universes = selectUniverses() as unknown as Array<{
        symbol: string;
      }>;
      return Array.isArray(universes)
        ? universes.map(function mapSymbol(u: { symbol: string }) {
            return u.symbol;
          })
        : [];
    }.bind(this)
  );

  isLoading = signal(false);
  selectedSymbol = signal<SymbolOption | null>(null);

  form = this.fb.group({
    symbol: [
      '',
      [
        Validators.required,
        Validators.pattern(/^[A-Z]{1,5}$/),
        this.duplicateSymbolValidator(),
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

  // Computed signals for validation error display
  showSymbolErrors = computed(
    function showSymbolErrors(this: AddSymbolDialog) {
      const control = this.form.get('symbol');
      const touched = control?.touched ?? false;
      const invalid = control?.invalid ?? false;
      return touched && invalid;
    }.bind(this)
  );

  symbolRequiredError = computed(
    function symbolRequiredError(this: AddSymbolDialog) {
      return Boolean(this.form.get('symbol')?.hasError('required'));
    }.bind(this)
  );

  symbolPatternError = computed(
    function symbolPatternError(this: AddSymbolDialog) {
      return Boolean(this.form.get('symbol')?.hasError('pattern'));
    }.bind(this)
  );

  symbolDuplicateError = computed(
    function symbolDuplicateError(this: AddSymbolDialog) {
      return Boolean(this.form.get('symbol')?.hasError('duplicate'));
    }.bind(this)
  );

  boundSearchSymbols = this.searchSymbols.bind(this);

  get riskGroups(): RiskGroup[] {
    return selectRiskGroup();
  }

  duplicateSymbolValidator(): ValidatorFn {
    // Capture existingSymbols at validator creation time
    const symbols = this.existingSymbols;
    return function duplicateValidator(
      control: AbstractControl
    ): ValidationErrors | null {
      const symbol = control.value as string;
      if (!symbol || symbol.length === 0) {
        return null;
      }
      const existingSymbols: string[] = symbols();
      if (existingSymbols.includes(symbol)) {
        return { duplicate: { value: symbol } };
      }
      return null;
    };
  }

  async searchSymbols(query: string): Promise<SymbolOption[]> {
    if (!query || query.trim().length === 0) {
      return [];
    }

    try {
      // eslint-disable-next-line no-restricted-syntax -- SymbolAutocompleteComponent requires Promise<SymbolOption[]> return type
      return await firstValueFrom(
        this.symbolSearchService.searchSymbols(query)
      );
    } catch {
      return [];
    }
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

  onFormReset(): void {
    this.selectedSymbol.set(null);
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
    } else if (typeof errorObj.status === 'number' && errorObj.status >= 500) {
      this.notification.error('Server error. Please try again later.');
    } else {
      this.notification.error('Failed to add symbol. Please try again.');
    }
  }
}
