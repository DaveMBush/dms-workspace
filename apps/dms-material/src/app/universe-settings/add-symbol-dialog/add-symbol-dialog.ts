import { A11yModule } from '@angular/cdk/a11y';
import { HttpClient } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
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
import { facadeRegistry } from '@smarttools/smart-core';
import { firstValueFrom } from 'rxjs';

import { SymbolAutocompleteComponent } from '../../shared/components/symbol-autocomplete/symbol-autocomplete.component';
import { SymbolOption } from '../../shared/components/symbol-autocomplete/symbol-option.interface';
import { NotificationService } from '../../shared/services/notification.service';
import { SymbolSearchService } from '../../shared/services/symbol-search.service';
import { RiskGroup } from '../../store/risk-group/risk-group.interface';
import { selectRiskGroup } from '../../store/risk-group/selectors/select-risk-group.function';
import { selectTopEntities } from '../../store/top/selectors/select-top-entities.function';

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
    A11yModule,
  ],
  templateUrl: './add-symbol-dialog.html',
  styleUrl: './add-symbol-dialog.scss',
  host: { class: 'block' },
})
export class AddSymbolDialogComponent implements OnInit {
  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<AddSymbolDialogComponent>);
  private notification = inject(NotificationService);
  private symbolSearchService = inject(SymbolSearchService);
  private http = inject(HttpClient);

  topEntities = selectTopEntities().entities;

  private readonly existingSymbolsSignal = signal<string[]>([]);
  // All existing universe symbols, loaded directly from the server on dialog open.
  existingSymbols = this.existingSymbolsSignal.asReadonly();

  private readonly symbolAutocomplete = viewChild(SymbolAutocompleteComponent);
  private readonly destroyRef = inject(DestroyRef);

  isLoading = signal(true);
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

  // Effect to revalidate symbol when universe data changes
  private revalidateSymbolEffect = effect(
    function revalidateSymbol(this: AddSymbolDialogComponent) {
      // Read existingSymbols to track changes
      this.existingSymbols();
      // Revalidate the symbol control when universe data updates
      this.form.get('symbol')?.updateValueAndValidity();
    }.bind(this)
  );

  // Load all existing universe symbols from the server on dialog open.
  // Uses a direct HTTP GET to bypass SmartNgRX lazy-loading complexity and
  // guarantee all symbols (including recently created ones) are available for
  // duplicate detection before the user finishes typing.
  // isLoading starts as true (set above) so the submit button stays disabled
  // until this GET completes — prevents the race where the user types a
  // duplicate symbol before _existingSymbols is populated.
  ngOnInit(): void {
    this.http
      .get<Array<{ symbol?: string }>>('/api/universe')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: function handleExistingSymbolsLoaded(
          this: AddSymbolDialogComponent,
          rows: Array<{ symbol?: string }>
        ) {
          const symbols = rows
            .map(function extractSymbol(r: { symbol?: string }) {
              return r.symbol ?? '';
            })
            .filter(function keepValidSymbol(s: string) {
              return s.length > 0 && s !== '\u2026';
            });
          this.existingSymbolsSignal.set(symbols);
          this.isLoading.set(false);
        }.bind(this),
        error: function handleGetUniverseError(this: AddSymbolDialogComponent) {
          this.isLoading.set(false);
        }.bind(this),
      });
  }

  // Computed signals for template
  symbolValue = computed(
    function symbolValue(this: AddSymbolDialogComponent) {
      return this.selectedSymbol()?.symbol;
    }.bind(this)
  );

  symbolName = computed(
    function symbolName(this: AddSymbolDialogComponent) {
      return this.selectedSymbol()?.name;
    }.bind(this)
  );

  hasSelectedSymbol = computed(
    function hasSelectedSymbol(this: AddSymbolDialogComponent) {
      return !!this.selectedSymbol();
    }.bind(this)
  );

  riskGroupIdControl = computed(
    function riskGroupIdControl(this: AddSymbolDialogComponent) {
      return this.form.get('riskGroupId');
    }.bind(this)
  );

  riskGroupIdHasError = computed(
    function riskGroupIdHasError(this: AddSymbolDialogComponent) {
      const c = this.form.get('riskGroupId');
      return Boolean(
        (c?.hasError('required') ?? false) && (c?.touched ?? false)
      );
    }.bind(this)
  );

  private readonly formStatus = toSignal(this.form.statusChanges, {
    initialValue: this.form.status,
  });

  private readonly symbolControlStatus = toSignal(
    this.form.get('symbol')!.statusChanges,
    { initialValue: this.form.get('symbol')!.status }
  );

  private readonly symbolFormValue = toSignal(
    this.form.get('symbol')!.valueChanges,
    { initialValue: this.form.get('symbol')!.value! }
  );

  private readonly symbolTouched = signal(false);

  isSubmitDisabled = computed(
    function isSubmitDisabled(this: AddSymbolDialogComponent) {
      const sv = this.symbolFormValue() ?? '';
      // Unconditionally read existingSymbols() so it is always a tracked
      // reactive dependency — avoids &&-short-circuit dropping the dep when sv is empty.
      const existingSymbols = this.existingSymbols();
      return (
        this.isLoading() ||
        (sv.length > 0 && existingSymbols.includes(sv)) ||
        this.formStatus() === 'INVALID'
      );
    }.bind(this)
  );

  // Computed signals for validation error display
  showSymbolErrors = computed(
    function showSymbolErrors(this: AddSymbolDialogComponent) {
      if (!this.symbolTouched()) {
        return false;
      }
      // Show errors when the control is INVALID (required/pattern validators)
      // OR when a duplicate is detected via direct signal dependency
      // (avoids waiting for revalidateSymbolEffect → updateValueAndValidity cycle)
      return (
        this.symbolDuplicateError() || this.symbolControlStatus() === 'INVALID'
      );
    }.bind(this)
  );

  symbolRequiredError = computed(
    function symbolRequiredError(this: AddSymbolDialogComponent) {
      this.symbolControlStatus();
      return Boolean(this.form.get('symbol')?.hasError('required'));
    }.bind(this)
  );

  symbolPatternError = computed(
    function symbolPatternError(this: AddSymbolDialogComponent) {
      this.symbolControlStatus();
      return Boolean(this.form.get('symbol')?.hasError('pattern'));
    }.bind(this)
  );

  symbolDuplicateError = computed(
    function symbolDuplicateError(this: AddSymbolDialogComponent) {
      const sv = this.symbolFormValue() ?? '';
      return sv.length > 0 && this.existingSymbols().includes(sv);
    }.bind(this)
  );

  boundSearchSymbols = this.searchSymbols.bind(this);

  get riskGroups(): RiskGroup[] {
    return selectRiskGroup();
  }

  // Polarity: returns error when symbol IS already in the Universe (must NOT be in Universe).
  // Sibling validator with opposite polarity lives in:
  //   apps/dms-material/src/app/account-panel/open-positions/add-position-dialog/add-position-dialog.component.ts
  //   → symbolExistsValidator() (returns error when symbol is NOT in the Universe)
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

  private readonly syncSearchToFormEffect = effect(
    function syncSearchControlToFormSymbol(
      this: AddSymbolDialogComponent
    ): void {
      const autocomplete = this.symbolAutocomplete();
      if (autocomplete === undefined) {
        return;
      }
      const self = this;
      function onSearchValueChange(value: unknown): void {
        if (typeof value === 'string') {
          self.form.get('symbol')?.setValue(value);
          self.form.get('symbol')?.markAsTouched();
          self.symbolTouched.set(true);
        }
      }
      autocomplete.searchControl.valueChanges
        .pipe(takeUntilDestroyed(self.destroyRef))
        .subscribe(onSearchValueChange);
      // Sync current value in case fill() fired before this subscription was established
      const currentSearchValue = autocomplete.searchControl.value;
      onSearchValueChange(currentSearchValue);
    }.bind(this)
  );

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
    const data: Record<string, string> = { symbol, risk_group_id: riskGroupId };
    this.http.post<unknown>('./api/universe/add', data).subscribe({
      next: function handleAddSuccess(this: AddSymbolDialogComponent) {
        const topState = selectTopEntities();
        const topIds = topState.ids as string[];
        if (topIds.length > 0) {
          const topFacade = facadeRegistry.register('app', 'top');
          topFacade.updateMany(
            topIds.map(function markTopDirty(id) {
              return { id, changes: { isDirty: true } };
            })
          );
        }
        this.notification.success(`Added ${symbol} to universe`);
        this.dialogRef.close({ symbol, riskGroupId });
        this.isLoading.set(false);
      }.bind(this),
      error: function handleAddError(
        this: AddSymbolDialogComponent,
        error: unknown
      ) {
        this.handleAddError(error);
      }.bind(this),
    });
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
