# Story AC.4: Create Symbol Autocomplete Component

## Story

**As a** user searching for stock symbols
**I want** an autocomplete input that suggests symbols as I type
**So that** I can quickly find and select the correct symbol

## Context

**Current System:**

- PrimeNG `p-autoComplete`
- Dropdown suggestions, force selection, min length

**Migration Target:**

- Angular Material `mat-autocomplete`
- Same functionality

## Acceptance Criteria

### Functional Requirements

- [ ] Type to filter suggestions
- [ ] Dropdown shows matching symbols
- [ ] Select suggestion to populate input
- [ ] Force selection option (no custom values)
- [ ] Minimum characters before search

### Technical Requirements

- [ ] Uses `mat-autocomplete`
- [ ] Debounced search requests
- [ ] Loading indicator during search

## Technical Approach

Create `apps/rms-material/src/app/shared/components/symbol-autocomplete/symbol-autocomplete.component.ts`:

```typescript
import { Component, input, output, signal, inject, OnInit } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { debounceTime, filter, switchMap, tap } from 'rxjs/operators';

export interface SymbolOption {
  symbol: string;
  name: string;
}

@Component({
  selector: 'rms-symbol-autocomplete',
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatAutocompleteModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <mat-form-field appearance="outline" class="full-width">
      <mat-label>{{ label() }}</mat-label>
      <input
        matInput
        [formControl]="searchControl"
        [matAutocomplete]="auto"
        [placeholder]="placeholder()"
      />
      @if (isLoading()) {
        <mat-spinner matSuffix diameter="20"></mat-spinner>
      }
      <mat-autocomplete
        #auto="matAutocomplete"
        [displayWith]="displayFn"
        (optionSelected)="onOptionSelected($event.option.value)"
      >
        @for (option of filteredOptions(); track option.symbol) {
          <mat-option [value]="option">
            <strong>{{ option.symbol }}</strong> - {{ option.name }}
          </mat-option>
        }
      </mat-autocomplete>
    </mat-form-field>
  `,
  styles: [`.full-width { width: 100%; }`],
})
export class SymbolAutocompleteComponent implements OnInit {
  label = input<string>('Symbol');
  placeholder = input<string>('Search for a symbol...');
  minLength = input<number>(2);
  searchFn = input.required<(query: string) => Promise<SymbolOption[]>>();
  forceSelection = input<boolean>(true);

  symbolSelected = output<SymbolOption>();

  searchControl = new FormControl('');
  filteredOptions = signal<SymbolOption[]>([]);
  isLoading = signal(false);

  ngOnInit(): void {
    const context = this;
    this.searchControl.valueChanges
      .pipe(
        debounceTime(300),
        filter(function filterMinLength(value): value is string {
          return typeof value === 'string' && value.length >= context.minLength();
        }),
        tap(function setLoading() {
          context.isLoading.set(true);
        }),
        switchMap(function doSearch(query: string) {
          return context.searchFn()(query);
        })
      )
      .subscribe(function onResults(options) {
        context.filteredOptions.set(options);
        context.isLoading.set(false);
      });
  }

  displayFn(option: SymbolOption | string): string {
    if (typeof option === 'string') return option;
    return option?.symbol ?? '';
  }

  onOptionSelected(option: SymbolOption): void {
    this.symbolSelected.emit(option);
  }

  reset(): void {
    this.searchControl.reset();
    this.filteredOptions.set([]);
  }
}
```

## Definition of Done

- [ ] Typing triggers search after min length
- [ ] Suggestions display in dropdown
- [ ] Selection emits chosen symbol
- [ ] Loading indicator shows during search
- [ ] All validation commands pass
