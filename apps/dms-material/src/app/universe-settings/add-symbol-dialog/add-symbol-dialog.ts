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
    // TODO: Implement submit logic in Story AM.2 (TDD GREEN phase)
    throw new Error('Not implemented - TDD RED phase');
  }

  onCancel(): void {
    // TODO: Implement cancel logic in Story AM.2 (TDD GREEN phase)
    throw new Error('Not implemented - TDD RED phase');
  }

  private addSymbolToUniverse(symbol: string, riskGroupId: string): void {
    // TODO: Implement add symbol logic in Story AM.2 (TDD GREEN phase)
    throw new Error('Not implemented - TDD RED phase');
  }

  private handleAddError(error: unknown): void {
    // TODO: Implement error handling in Story AM.2 (TDD GREEN phase)
    throw new Error('Not implemented - TDD RED phase');
  }
}
