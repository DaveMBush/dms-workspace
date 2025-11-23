# Story AC.5: Create Symbol Filter Header Component

## Story

**As a** user filtering table data
**I want** a dropdown filter in the table header
**So that** I can quickly filter rows by symbol or other criteria

## Context

**Current System:**

- PrimeNG `p-select` in table header
- Filters table data by selected value

**Migration Target:**

- Angular Material `mat-select`
- Same filtering behavior

## Acceptance Criteria

### Functional Requirements

- [ ] Dropdown displays filter options
- [ ] Selection filters table data
- [ ] Clear option to show all
- [ ] Compact display in header cell

### Technical Requirements

- [ ] Uses `mat-select`
- [ ] Emits filter value on change
- [ ] Integrates with table filtering

## Test-Driven Development Approach

**Write tests BEFORE implementation code.**

### Step 1: Create Unit Tests First

Create `apps/rms-material/src/app/shared/components/symbol-filter-header/symbol-filter-header.component.spec.ts`:

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SymbolFilterHeaderComponent, FilterOption } from './symbol-filter-header.component';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('SymbolFilterHeaderComponent', () => {
  let component: SymbolFilterHeaderComponent;
  let fixture: ComponentFixture<SymbolFilterHeaderComponent>;

  const mockOptions: FilterOption[] = [
    { value: 'A', label: 'Option A' },
    { value: 'B', label: 'Option B' },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SymbolFilterHeaderComponent, NoopAnimationsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(SymbolFilterHeaderComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('options', mockOptions);
  });

  it('should render mat-select', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('mat-select')).toBeTruthy();
  });

  it('should display label', () => {
    fixture.componentRef.setInput('label', 'Test Filter');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Test Filter');
  });

  it('should emit null for All option', () => {
    const spy = vi.spyOn(component.filterChange, 'emit');
    component.onSelectionChange(null);
    expect(spy).toHaveBeenCalledWith(null);
  });

  it('should emit selected value', () => {
    const spy = vi.spyOn(component.filterChange, 'emit');
    component.onSelectionChange('A');
    expect(spy).toHaveBeenCalledWith('A');
  });
});
```

**TDD Cycle:**

1. Run `pnpm nx run rms-material:test` - tests should fail (RED)
2. Implement minimal code to pass tests (GREEN)
3. Refactor while keeping tests passing (REFACTOR)

## Technical Approach

Create `apps/rms-material/src/app/shared/components/symbol-filter-header/symbol-filter-header.component.ts`:

```typescript
import { Component, input, output } from '@angular/core';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';

export interface FilterOption {
  value: string;
  label: string;
}

@Component({
  selector: 'rms-symbol-filter-header',
  imports: [MatSelectModule, MatFormFieldModule],
  template: `
    <mat-form-field appearance="outline" class="filter-field">
      <mat-label>{{ label() }}</mat-label>
      <mat-select [value]="selectedValue()" (selectionChange)="onSelectionChange($event.value)">
        <mat-option [value]="null">All</mat-option>
        @for (option of options(); track option.value) {
        <mat-option [value]="option.value">
          {{ option.label }}
        </mat-option>
        }
      </mat-select>
    </mat-form-field>
  `,
  styles: [
    `
      .filter-field {
        width: 100%;
        max-width: 150px;
        ::ng-deep .mat-mdc-form-field-infix {
          padding: 4px 0;
          min-height: 32px;
        }
      }
    `,
  ],
})
export class SymbolFilterHeaderComponent {
  label = input<string>('Filter');
  options = input<FilterOption[]>([]);
  selectedValue = input<string | null>(null);

  filterChange = output<string | null>();

  onSelectionChange(value: string | null): void {
    this.filterChange.emit(value);
  }
}
```

## Definition of Done

- [ ] Dropdown displays options
- [ ] Selection emits filter value
- [ ] "All" option clears filter
- [ ] Compact styling for header
- [ ] All validation commands pass

## E2E Test Requirements

When this story is complete, ensure the following e2e tests exist in `apps/rms-material-e2e/`:

- [ ] Filter dropdown displays all options
- [ ] Selecting option filters table data
- [ ] "All" option shows all data
- [ ] Filter fits within table header cell
- [ ] Filter selection persists during session

Run `pnpm nx run rms-material-e2e:e2e` to verify all e2e tests pass.
