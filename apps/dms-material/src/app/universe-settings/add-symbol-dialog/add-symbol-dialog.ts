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
  private readonly existingSymbolsSignal = signal<string[]>([]);
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

  private revalidateSymbolEffect = effect(
    function revalidateSymbol(this: AddSymbolDialogComponent) {
      this.existingSymbols();
      this.form.get('symbol')?.updateValueAndValidity();
    }.bind(this),
  );

  ngOnInit(): void {
    this.http
      .get<Array<{ symbol?: string }>>('/api/universe')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: function handleExistingSymbolsLoaded(
          this: AddSymbolDialogComponent,
          rows: Array<{ symbol?: string }>,
        ) {
          const validSymbols = rows
            .map(function getSymbol(r) {
              return r.symbol ?? '';
            })
            .filter(function isValid(s) {
              return s.length > 0 && s !== '\u2026';
            });
          this.existingSymbolsSignal.set(validSymbols);
          this.isLoading.set(false);
        }.bind(this),
        error: function handleGetUniverseError(this: AddSymbolDialogComponent) {
          this.isLoading.set(false);
        }.bind(this),
      });
  }

  symbolValue = computed(
    function symbolValue(this: AddSymbolDialogComponent) {
      return this.selectedSymbol()?.symbol;
    }.bind(this),
  );

  symbolName = computed(
    function symbolName(this: AddSymbolDialogComponent) {
      return this.selectedSymbol()?.name;
    }.bind(this),
  );

  hasSelectedSymbol = computed(
    function hasSelectedSymbol(this: AddSymbolDialogComponent) {
      return !!this.selectedSymbol();
    }.bind(this),
  );

  riskGroupIdHasError = computed(
    function riskGroupIdHasError(this: AddSymbolDialogComponent) {
      const c = this.form.get('riskGroupId');
      return Boolean(
        (c?.hasError('required') ?? false) && (c?.touched ?? false),
      );
    }.bind(this),
  );

  private readonly formStatus = toSignal(this.form.statusChanges, {
    initialValue: this.form.status,
  });

  private readonly symbolControlStatus = toSignal(
    this.form.get('symbol')!.statusChanges,
    { initialValue: this.form.get('symbol')!.status },
  );

  isSubmitDisabled = computed(
    function isSubmitDisabled(this: AddSymbolDialogComponent) {
      const sv = this.form.get('symbol')?.value ?? '';
      const existingSymbols = this.existingSymbols();
      return (
        this.isLoading() ||
        (sv.length > 0 && existingSymbols.includes(sv)) ||
        this.formStatus() === 'INVALID'
      );
    }.bind(this),
  );

  showSymbolErrors = computed(
    function showSymbolErrors(this: AddSymbolDialogComponent) {
      const ctrl = this.form.get('symbol');
      if (!ctrl?.touched) {
        return false;
      }
      return (
        this.symbolDuplicateError() || this.symbolControlStatus() === 'INVALID'
      );
    }.bind(this),
  );

  symbolRequiredError = computed(
    function symbolRequiredError(this: AddSymbolDialogComponent) {
      this.symbolControlStatus();
      return Boolean(this.form.get('symbol')?.hasError('required'));
    }.bind(this),
  );

  symbolPatternError = computed(
    function symbolPatternError(this: AddSymbolDialogComponent) {
      this.symbolControlStatus();
      return Boolean(this.form.get('symbol')?.hasError('pattern'));
    }.bind(this),
  );

  symbolDuplicateError = computed(
    function symbolDuplicateError(this: AddSymbolDialogComponent) {
      const sv = this.form.get('symbol')?.value ?? '';
      return sv.length > 0 && this.existingSymbols().includes(sv);
    }.bind(this),
  );

  boundSearchSymbols = this.searchSymbols.bind(this);
  get riskGroups(): RiskGroup[] {
    return selectRiskGroup();
  }

  duplicateSymbolValidator(): ValidatorFn {
    const symbols = this.existingSymbols;
    return function duplicateValidator(
      control: AbstractControl,
    ): ValidationErrors | null {
      const symbol = control.value as string;
      if (!symbol || symbol.length === 0) {
        return null;
      }
      if (symbols().includes(symbol)) {
        return { duplicate: { value: symbol } };
      }
      return null;
    };
  }

  private readonly syncSearchToFormEffect = effect(
    function syncSearchControlToFormSymbol(
      this: AddSymbolDialogComponent,
    ): void {
      const autocomplete = this.symbolAutocomplete();
      if (autocomplete === undefined) {
        return;
      }
      const self = this;
      const onSearchValueChange = function handleSearchValueChange(
        value: unknown,
      ): void {
        if (typeof value === 'string') {
          const ctrl = self.form.get('symbol');
          ctrl?.setValue(value);
          ctrl?.markAsTouched();
        }
      };
      autocomplete.searchControl.valueChanges
        .pipe(takeUntilDestroyed(self.destroyRef))
        .subscribe(onSearchValueChange);
      // Sync current value in case fill() fired before subscription established
      onSearchValueChange(autocomplete.searchControl.value);
    }.bind(this),
  );

  async searchSymbols(query: string): Promise<SymbolOption[]> {
    if (!query || query.trim().length === 0) {
      return [];
    }
    try {
      // eslint-disable-next-line no-restricted-syntax -- SymbolAutocompleteComponent requires Promise<SymbolOption[]> return type
      return await firstValueFrom(
        this.symbolSearchService.searchSymbols(query),
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
    const data = { symbol, risk_group_id: riskGroupId };
    this.http.post<unknown>('./api/universe/add', data).subscribe({
      next: function handleAddSuccess(this: AddSymbolDialogComponent) {
        const topFacade = facadeRegistry.register('app', 'top');
        const topState = selectTopEntities();
        if (topState.ids.length > 0) {
          topFacade.updateMany(
            (topState.ids as string[]).map(function markTopDirty(id) {
              return { id, changes: { isDirty: true } };
            }),
          );
        }
        this.notification.success(`Added ${symbol} to universe`);
        this.dialogRef.close({ symbol, riskGroupId });
        this.isLoading.set(false);
      }.bind(this),
      error: this.handleAddError.bind(this),
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
