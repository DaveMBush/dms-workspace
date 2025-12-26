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
- [ ] All GUI look as close to the existing RMS app as possible
- [ ] Dropdown shows matching symbols
- [ ] Select suggestion to populate input
- [ ] Force selection option (no custom values)
- [ ] Minimum characters before search

### Technical Requirements

- [ ] Uses `mat-autocomplete`
- [ ] Debounced search requests
- [ ] Loading indicator during search

## Test-Driven Development Approach

**Write tests BEFORE implementation code.**

### Step 1: Create Unit Tests First

Create `apps/rms-material/src/app/shared/components/symbol-autocomplete/symbol-autocomplete.component.spec.ts`:

```typescript
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { SymbolAutocompleteComponent, SymbolOption } from './symbol-autocomplete.component';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('SymbolAutocompleteComponent', () => {
  let component: SymbolAutocompleteComponent;
  let fixture: ComponentFixture<SymbolAutocompleteComponent>;
  let mockSearchFn: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    mockSearchFn = vi.fn().mockResolvedValue([
      { symbol: 'AAPL', name: 'Apple Inc.' },
      { symbol: 'AMZN', name: 'Amazon.com Inc.' },
    ]);

    await TestBed.configureTestingModule({
      imports: [SymbolAutocompleteComponent, NoopAnimationsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(SymbolAutocompleteComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('searchFn', mockSearchFn);
  });

  it('should render input field', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('input')).toBeTruthy();
  });

  it('should not search below min length', fakeAsync(() => {
    fixture.detectChanges();
    component.searchControl.setValue('A');
    tick(300);
    expect(mockSearchFn).not.toHaveBeenCalled();
  }));

  it('should search after min length and debounce', fakeAsync(() => {
    fixture.detectChanges();
    component.searchControl.setValue('AA');
    tick(300);
    expect(mockSearchFn).toHaveBeenCalledWith('AA');
  }));

  it('should set loading during search', fakeAsync(() => {
    fixture.detectChanges();
    component.searchControl.setValue('AAP');
    tick(100);
    expect(component.isLoading()).toBe(true);
    tick(200);
    expect(component.isLoading()).toBe(false);
  }));

  it('should emit selected option', () => {
    const spy = vi.spyOn(component.symbolSelected, 'emit');
    const option: SymbolOption = { symbol: 'AAPL', name: 'Apple' };
    component.onOptionSelected(option);
    expect(spy).toHaveBeenCalledWith(option);
  });

  it('should display symbol in displayFn', () => {
    expect(component.displayFn({ symbol: 'AAPL', name: 'Apple' })).toBe('AAPL');
  });

  it('should reset control and options', () => {
    component.filteredOptions.set([{ symbol: 'A', name: 'Test' }]);
    component.searchControl.setValue('test');
    component.reset();
    expect(component.searchControl.value).toBeFalsy();
    expect(component.filteredOptions().length).toBe(0);
  });
});
```

**TDD Cycle:**

1. Run `pnpm nx run rms-material:test` - tests should fail (RED)
2. Implement minimal code to pass tests (GREEN)
3. Refactor while keeping tests passing (REFACTOR)

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
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatAutocompleteModule, MatProgressSpinnerModule],
  template: `
    <mat-form-field appearance="outline" class="full-width">
      <mat-label>{{ label() }}</mat-label>
      <input matInput [formControl]="searchControl" [matAutocomplete]="auto" [placeholder]="placeholder()" />
      @if (isLoading()) {
      <mat-spinner matSuffix diameter="20"></mat-spinner>
      }
      <mat-autocomplete #auto="matAutocomplete" [displayWith]="displayFn" (optionSelected)="onOptionSelected($event.option.value)">
        @for (option of filteredOptions(); track option.symbol) {
        <mat-option [value]="option">
          <strong>{{ option.symbol }}</strong> - {{ option.name }}
        </mat-option>
        }
      </mat-autocomplete>
    </mat-form-field>
  `,
  styles: [
    `
      .full-width {
        width: 100%;
      }
    `,
  ],
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

## E2E Test Requirements

When this story is complete, ensure the following e2e tests exist in `apps/rms-material-e2e/`:

### Core Functionality

- [ ] Typing minimum characters triggers search
- [ ] Dropdown displays matching suggestions
- [ ] Clicking suggestion populates input
- [ ] Loading spinner shows during search
- [ ] No suggestions message when no matches
- [ ] Force selection prevents custom values (when enabled)

### Edge Cases

- [ ] Debounce prevents excessive API calls during rapid typing
- [ ] Search cancelled when input cleared before results return
- [ ] Stale search results not displayed (out-of-order responses)
- [ ] Arrow key navigation through suggestions works
- [ ] Enter key selects highlighted suggestion
- [ ] Escape key closes dropdown without selection
- [ ] Tab key selects highlighted suggestion and moves focus
- [ ] Case-insensitive search matches correctly
- [ ] Special characters in symbol handled (BRK.A, BRK.B)
- [ ] Long company names truncated with tooltip
- [ ] Dropdown positions correctly near viewport edges
- [ ] Dropdown closes when clicking outside
- [ ] Search handles API timeout gracefully
- [ ] Search handles API error gracefully
- [ ] Clear button resets input and closes dropdown
- [ ] Re-opening dropdown shows previous results if unchanged

Run `pnpm nx run rms-material-e2e:e2e` to verify all e2e tests pass.

## File List

### Component Files

- `apps/rms-material/src/app/shared/components/symbol-autocomplete/symbol-autocomplete.component.ts`
- `apps/rms-material/src/app/shared/components/symbol-autocomplete/symbol-autocomplete.component.html`
- `apps/rms-material/src/app/shared/components/symbol-autocomplete/symbol-autocomplete.component.scss`
- `apps/rms-material/src/app/shared/components/symbol-autocomplete/symbol-autocomplete.component.spec.ts`

### E2E Test Files

- `apps/rms-material-e2e/src/symbol-autocomplete.spec.ts`

## Status

**Status**: Ready for Integration
**Date Completed**: 2025-12-08
**Test Coverage**: Unit tests passing, E2E tests created and skipped (ready for integration)

## QA Results

### Review Date: 2025-12-08

### Reviewed By: Quinn (Test Architect)

**Summary**: Symbol Autocomplete component demonstrates strong implementation fundamentals with comprehensive testing structure. Unit tests all pass (11 tests), production build succeeds, and 17 E2E tests are prepared for integration validation. Component properly implements Angular Material patterns, signals-based reactivity, and debouncing.

**Key Strengths**:

- ✅ Solid TDD approach with tests written first
- ✅ Clean component architecture with proper separation of concerns
- ✅ All unit tests passing (487 total in project, 11 for this component)
- ✅ Comprehensive E2E test suite prepared (17 tests covering core + edge cases)
- ✅ Production build successful with proper tree-shaking
- ✅ Follows Angular Material best practices

**Quality Concerns** (3 Medium, 2 Low severity):

1. **TEST-001** (Medium): E2E tests created but skipped pending integration - cannot validate real browser behavior until component is used in a feature page
2. **REQ-001** (Medium): Force selection requirement not enforced - `forceSelection` input exists but no validation logic prevents custom values when enabled
3. **REL-001** (Medium): No error handling for failed searches - API errors would leave user with loading spinner and no feedback
4. **MNT-001** (Low): Observable subscription in ngOnInit never unsubscribed - potential memory leak on component destruction
5. **SEC-001** (Low): Missing aria-live region for autocomplete results - impacts screen reader accessibility

**Recommendations**:

_Immediate (before production)_:

- Enable and verify E2E tests pass when component is integrated into a feature page
- Implement force selection validation to clear/reject invalid input when `forceSelection=true`
- Add `catchError` operator to handle search API failures with user notification

_Future improvements_:

- Add `takeUntilDestroyed()` to prevent subscription memory leaks
- Add `aria-live="polite"` to mat-autocomplete for screen reader announcements

**Traceability**: All 6 functional/technical acceptance criteria mapped to tests. See `symbol-autocomplete.component.spec.ts:27-91` and `symbol-autocomplete.spec.ts:12-338`.

**Quality Score**: 72/100 (Deductions: -10 deferred E2E validation, -8 missing force selection enforcement, -5 no error handling, -5 subscription leak)

### Gate Status

Gate: CONCERNS → docs/qa/gates/AC.4-create-symbol-autocomplete-component.yml
