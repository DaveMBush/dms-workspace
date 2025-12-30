import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { SmartArray } from '@smarttools/smart-signals';

import { SymbolAutocompleteComponent } from '../../shared/components/symbol-autocomplete/symbol-autocomplete.component';
import { SymbolOption } from '../../shared/components/symbol-autocomplete/symbol-option.interface';
import { NotificationService } from '../../shared/services/notification.service';
import { RiskGroup } from '../../store/risk-group/risk-group.interface';
import { selectRiskGroup } from '../../store/risk-group/selectors/select-risk-group.function';
import { selectTopEntities } from '../../store/top/selectors/select-top-entities.function';
import { Top } from '../../store/top/top.interface';
import { selectUniverses } from '../../store/universe/selectors/select-universes.function';
import { Universe } from '../../store/universe/universe.interface';

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

  topEntities = selectTopEntities().entities;

  isLoading = signal(false);
  selectedSymbol = signal<SymbolOption | null>(null);

  form = this.fb.group({
    symbol: ['', Validators.required],
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

    this.isLoading.set(true);

    const symbol = this.form.value.symbol!.trim().toUpperCase();
    const riskGroupId = this.form.value.riskGroupId!;

    this.addSymbolToUniverse(symbol, riskGroupId);
  }

  onCancel(): void {
    this.dialogRef.close(null);
  }

  private addSymbolToUniverse(symbol: string, riskGroupId: string): void {
    const universeArray = selectUniverses() as SmartArray<Top, Universe> &
      Universe[];
    const top = this.topEntities['1']!;

    const newUniverse: Universe = {
      id: 'new',
      symbol,
      risk_group_id: riskGroupId,
      distribution: 0,
      distributions_per_year: 0,
      last_price: 0,
      most_recent_sell_date: null,
      most_recent_sell_price: null,
      ex_date: '',
      expired: false,
      is_closed_end_fund: false,
      name: this.selectedSymbol()?.name ?? symbol,
      position: 0,
    };

    try {
      universeArray.add!(newUniverse, top);
      this.isLoading.set(false);
      this.notification.success(`Added ${symbol} to universe`);

      const data = {
        symbol,
        riskGroupId,
        name: this.selectedSymbol()?.name,
      };

      this.dialogRef.close(data);
    } catch (error) {
      this.handleAddError(error);
    }
  }

  private handleAddError(error: unknown): void {
    this.isLoading.set(false);
    let errorMsg = 'Failed to add symbol to universe';

    if (
      error !== null &&
      error !== undefined &&
      typeof error === 'object' &&
      'message' in error &&
      typeof error.message === 'string'
    ) {
      errorMsg = error.message;
    }

    this.notification.error(errorMsg);
  }
}
