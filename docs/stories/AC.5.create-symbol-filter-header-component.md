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
      <mat-select
        [value]="selectedValue()"
        (selectionChange)="onSelectionChange($event.value)"
      >
        <mat-option [value]="null">All</mat-option>
        @for (option of options(); track option.value) {
          <mat-option [value]="option.value">
            {{ option.label }}
          </mat-option>
        }
      </mat-select>
    </mat-form-field>
  `,
  styles: [`
    .filter-field {
      width: 100%;
      max-width: 150px;
      ::ng-deep .mat-mdc-form-field-infix { padding: 4px 0; min-height: 32px; }
    }
  `],
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
