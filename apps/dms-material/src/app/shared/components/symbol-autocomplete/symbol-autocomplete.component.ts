import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  input,
  OnInit,
  output,
  signal,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { debounceTime, filter, switchMap, tap } from 'rxjs/operators';

import { SymbolOption } from './symbol-option.interface';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatAutocompleteModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    ReactiveFormsModule,
    CommonModule,
  ],
  selector: 'rms-symbol-autocomplete',
  standalone: true,
  styleUrls: ['./symbol-autocomplete.component.scss'],
  templateUrl: './symbol-autocomplete.component.html',
})
export class SymbolAutocompleteComponent implements OnInit {
  readonly forceSelection = input<boolean>(true);
  readonly label = input<string>('Symbol');
  readonly minLength = input<number>(2);
  readonly placeholder = input<string>('Search for a symbol...');
  readonly searchFn =
    input.required<(query: string) => Promise<SymbolOption[]>>();

  private filteredOptionsSig = signal<SymbolOption[]>([]);
  private isLoadingSig = signal(false);

  readonly searchControl = new FormControl('');
  readonly symbolSelected = output<SymbolOption>();

  readonly displayFnRef = this.displayFn.bind(this);

  // Expose writable signals for tests and external consumers
  readonly filteredOptions = this.filteredOptionsSig;
  readonly isLoading = this.isLoadingSig;

  // Template-friendly properties (avoid call expressions in templates)
  get filteredOptionsValue(): SymbolOption[] {
    return this.filteredOptions();
  }

  get isLoadingValue(): boolean {
    return this.isLoading();
  }

  get labelValue(): string {
    return this.computeLabelValue();
  }

  get placeholderValue(): string {
    return this.computePlaceholderValue();
  }

  ngOnInit(): void {
    const context = this;
    this.searchControl.valueChanges
      .pipe(
        debounceTime(300),
        filter(this.filterMinLength.bind(context)),
        tap(this.setLoading.bind(context)),
        switchMap(this.doSearch.bind(context))
      )
      .subscribe(this.handleSearchResults.bind(context));
  }

  computeLabelValue(): string {
    return this.label();
  }

  computePlaceholderValue(): string {
    return this.placeholder();
  }

  displayFn(option: SymbolOption | string | null): string {
    if (typeof option === 'string') {
      return option;
    }
    return option?.symbol ?? '';
  }

  async doSearch(query: string): Promise<SymbolOption[]> {
    return this.searchFn()(query);
  }

  filterMinLength(value: string | null): value is string {
    return typeof value === 'string' && value.length >= this.minLength();
  }

  getFilteredOptions(): SymbolOption[] {
    return this.filteredOptionsSig();
  }

  getIsLoading(): boolean {
    return this.isLoadingSig();
  }

  handleSearchResults(options: SymbolOption[]): void {
    this.filteredOptionsSig.set(options);
    this.isLoadingSig.set(false);
  }

  onOptionSelected(option: SymbolOption): void {
    this.symbolSelected.emit(option);
  }

  reset(): void {
    this.searchControl.reset();
    this.filteredOptionsSig.set([]);
  }

  trackBySymbol(index: number, item: SymbolOption): string {
    return item?.symbol ?? String(index);
  }

  private setLoading(): void {
    this.isLoadingSig.set(true);
  }
}
