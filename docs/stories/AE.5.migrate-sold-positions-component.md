# Story AE.5: Migrate Sold Positions Component

## Story

**As a** user reviewing sold positions
**I want** to view and edit sold position data
**So that** I can track my realized gains/losses

## Context

**Current System:**

- Location: `apps/rms/src/app/account-panel/sold-positions/`
- PrimeNG components: `p-table` (editable), `p-toolbar`, `p-cellEditor`, `p-inputNumber`, `p-datepicker`
- Similar to Open Positions with sell-specific fields

**Migration Target:**

- Base table with editable cells
- Material toolbar

## Acceptance Criteria

### Functional Requirements

- [ ] Sold positions display in table
- [ ] Editable cells for sell price, sell date
- [ ] Gain/loss calculations displayed
- [ ] Sort and filter

### Technical Requirements

- [ ] Uses base table from AC.1
- [ ] Uses editable cells from AC.2/AC.3
- [ ] SmartNgRX trades signal (sold filter)

## Test-Driven Development Approach

**Write tests BEFORE implementation code.**

### Step 1: Create Unit Tests First

Create `apps/rms-material/src/app/account-panel/sold-positions/sold-positions.component.spec.ts`:

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SoldPositionsComponent } from './sold-positions.component';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('SoldPositionsComponent', () => {
  let component: SoldPositionsComponent;
  let fixture: ComponentFixture<SoldPositionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SoldPositionsComponent, NoopAnimationsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(SoldPositionsComponent);
    component = fixture.componentInstance;
  });

  it('should define columns', () => {
    expect(component.columns.length).toBeGreaterThan(0);
    expect(component.columns.find((c) => c.field === 'symbol')).toBeTruthy();
  });

  it('should have sell price editable', () => {
    const col = component.columns.find((c) => c.field === 'sellPrice');
    expect(col?.editable).toBe(true);
  });

  it('should have sell date editable', () => {
    const col = component.columns.find((c) => c.field === 'sellDate');
    expect(col?.editable).toBe(true);
  });

  it('should have realizedGain column', () => {
    const col = component.columns.find((c) => c.field === 'realizedGain');
    expect(col).toBeTruthy();
  });

  it('should have holdingPeriod column', () => {
    const col = component.columns.find((c) => c.field === 'holdingPeriod');
    expect(col).toBeTruthy();
  });

  it('should call onCellEdit without error', () => {
    const trade = { id: '1', symbol: 'AAPL' } as any;
    expect(() => component.onCellEdit(trade, 'sellPrice', 150)).not.toThrow();
  });
});
```

**TDD Cycle:**

1. Run `pnpm nx run rms-material:test` - tests should fail (RED)
2. Implement minimal code to pass tests (GREEN)
3. Refactor while keeping tests passing (REFACTOR)

## Technical Approach

Create `apps/rms-material/src/app/account-panel/sold-positions/sold-positions.component.ts`:

```typescript
import { Component, inject, ViewChild } from '@angular/core';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { BaseTableComponent, ColumnDef } from '../../shared/components/base-table/base-table.component';
import { EditableCellComponent } from '../../shared/components/editable-cell/editable-cell.component';
import { EditableDateCellComponent } from '../../shared/components/editable-date-cell/editable-date-cell.component';
import { selectTrades } from '../../store/trades/select-trades.function';
import { Trade } from '../../store/trades/trade.interface';

@Component({
  selector: 'rms-sold-positions',
  imports: [MatToolbarModule, MatButtonModule, MatIconModule, BaseTableComponent, EditableCellComponent, EditableDateCellComponent],
  templateUrl: './sold-positions.component.html',
  styleUrl: './sold-positions.component.scss',
})
export class SoldPositionsComponent {
  private tradesSignal = inject(selectTrades);

  @ViewChild(BaseTableComponent) table!: BaseTableComponent<Trade>;

  columns: ColumnDef[] = [
    { field: 'symbol', header: 'Symbol', sortable: true },
    { field: 'quantity', header: 'Qty', type: 'number' },
    { field: 'purchasePrice', header: 'Buy Price', type: 'currency' },
    { field: 'sellPrice', header: 'Sell Price', type: 'currency', editable: true },
    { field: 'sellDate', header: 'Sell Date', type: 'date', editable: true },
    { field: 'realizedGain', header: 'Gain/Loss', type: 'currency' },
    { field: 'holdingPeriod', header: 'Held (days)', type: 'number' },
  ];

  onCellEdit(row: Trade, field: string, value: unknown): void {
    // Update via SmartNgRX
  }
}
```

## Definition of Done

- [ ] Sold positions display
- [ ] Editable cells work
- [ ] Gain/loss shows correctly
- [ ] SmartNgRX updates
- [ ] All validation commands pass

## E2E Test Requirements

When this story is complete, ensure the following e2e tests exist in `apps/rms-material-e2e/`:

### Core Functionality

- [ ] Sold positions table displays all sold positions
- [ ] Inline editing works for sell price, sell date
- [ ] Realized gain/loss calculates correctly
- [ ] Holding period displays correctly
- [ ] Sorting by columns works
- [ ] Data updates reflect immediately

### Edge Cases

- [ ] Empty sold positions shows appropriate message
- [ ] Edit validation prevents sell date before purchase date
- [ ] Holding period calculates correctly (including leap years)
- [ ] Short-term vs long-term gain indicator (1 year boundary)
- [ ] Negative gain (loss) displayed in red
- [ ] Very old positions (years) display correctly
- [ ] Same-day sale (0 days holding) handled
- [ ] Filter by date range works
- [ ] Filter by gain/loss type works
- [ ] Tax lot identification displayed correctly
- [ ] Export for tax reporting works (CSV format)
- [ ] Aggregated totals displayed at bottom
- [ ] Wash sale indicator (if applicable)

Run `pnpm nx run rms-material-e2e:e2e` to verify all e2e tests pass.
