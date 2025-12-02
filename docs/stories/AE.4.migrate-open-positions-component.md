# Story AE.4: Migrate Open Positions Component

## Story

**As a** user managing open positions
**I want** to view and edit my open positions in a table
**So that** I can track and update my current investments

## Context

**Current System:**

- Location: `apps/rms/src/app/account-panel/open-positions/`
- PrimeNG components: `p-table` (editable), `p-toolbar`, `p-cellEditor`, `p-inputNumber`, `p-datepicker`
- Similar complexity to Global Universe

**Migration Target:**

- Base table with editable cells
- Material toolbar

## Acceptance Criteria

### Functional Requirements

- [ ] All GUI look as close to the existing RMS app as possible
- [ ] Open positions display in table
- [ ] Editable cells for quantity, price, dates
- [ ] Add new position action
- [ ] Sell position action
- [ ] Sort and filter

### Technical Requirements

- [ ] Uses base table from AC.1
- [ ] Uses editable cells from AC.2/AC.3
- [ ] SmartNgRX trades signal

## Test-Driven Development Approach

**Write tests BEFORE implementation code.**

### Step 1: Create Unit Tests First

Create `apps/rms-material/src/app/account-panel/open-positions/open-positions.component.spec.ts`:

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OpenPositionsComponent } from './open-positions.component';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('OpenPositionsComponent', () => {
  let component: OpenPositionsComponent;
  let fixture: ComponentFixture<OpenPositionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OpenPositionsComponent, NoopAnimationsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(OpenPositionsComponent);
    component = fixture.componentInstance;
  });

  it('should define columns', () => {
    expect(component.columns.length).toBeGreaterThan(0);
    expect(component.columns.find((c) => c.field === 'symbol')).toBeTruthy();
  });

  it('should have editable quantity column', () => {
    const col = component.columns.find((c) => c.field === 'quantity');
    expect(col?.editable).toBe(true);
  });

  it('should have editable price column', () => {
    const col = component.columns.find((c) => c.field === 'purchasePrice');
    expect(col?.editable).toBe(true);
  });

  it('should have editable date column', () => {
    const col = component.columns.find((c) => c.field === 'purchaseDate');
    expect(col?.editable).toBe(true);
  });

  it('should call onAddPosition without error', () => {
    expect(() => component.onAddPosition()).not.toThrow();
  });

  it('should call onSellPosition without error', () => {
    const trade = { id: '1', symbol: 'AAPL' } as any;
    expect(() => component.onSellPosition(trade)).not.toThrow();
  });

  it('should call onCellEdit without error', () => {
    const trade = { id: '1', symbol: 'AAPL' } as any;
    expect(() => component.onCellEdit(trade, 'quantity', 100)).not.toThrow();
  });
});
```

**TDD Cycle:**

1. Run `pnpm nx run rms-material:test` - tests should fail (RED)
2. Implement minimal code to pass tests (GREEN)
3. Refactor while keeping tests passing (REFACTOR)

## Technical Approach

Create `apps/rms-material/src/app/account-panel/open-positions/open-positions.component.ts`:

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
  selector: 'rms-open-positions',
  imports: [MatToolbarModule, MatButtonModule, MatIconModule, BaseTableComponent, EditableCellComponent, EditableDateCellComponent],
  templateUrl: './open-positions.component.html',
  styleUrl: './open-positions.component.scss',
})
export class OpenPositionsComponent {
  private tradesSignal = inject(selectTrades);

  @ViewChild(BaseTableComponent) table!: BaseTableComponent<Trade>;

  columns: ColumnDef[] = [
    { field: 'symbol', header: 'Symbol', sortable: true },
    { field: 'quantity', header: 'Qty', type: 'number', editable: true },
    { field: 'purchasePrice', header: 'Price', type: 'currency', editable: true },
    { field: 'purchaseDate', header: 'Date', type: 'date', editable: true },
    { field: 'currentValue', header: 'Value', type: 'currency' },
    { field: 'gain', header: 'Gain', type: 'currency' },
  ];

  onAddPosition(): void {
    // Open new position dialog
  }

  onSellPosition(trade: Trade): void {
    // Open sell dialog
  }

  onCellEdit(row: Trade, field: string, value: unknown): void {
    // Update via SmartNgRX
  }
}
```

## Definition of Done

- [ ] Open positions display
- [ ] Editable cells work
- [ ] Add position action
- [ ] Sell position action
- [ ] SmartNgRX updates
- [ ] All validation commands pass

## E2E Test Requirements

When this story is complete, ensure the following e2e tests exist in `apps/rms-material-e2e/`:

### Core Functionality

- [ ] Open positions table displays all positions
- [ ] Inline editing works for quantity, price, date
- [ ] Add position button opens dialog
- [ ] Add position saves new position
- [ ] Sell position button opens sell dialog
- [ ] Sell position removes from open positions
- [ ] Sorting by columns works
- [ ] Data updates reflect immediately

### Edge Cases

- [ ] Empty positions table shows appropriate message
- [ ] Edit validation prevents negative quantities
- [ ] Edit validation prevents future purchase dates
- [ ] Partial sell (quantity < total) works correctly
- [ ] Sell all (full quantity) moves to sold positions
- [ ] Cancel add position dialog preserves no state
- [ ] Add position with existing symbol creates new lot
- [ ] Current value calculates with real-time prices
- [ ] Gain/loss updates on price changes
- [ ] Large position counts (100+) perform well
- [ ] Export positions to CSV works
- [ ] Print view formats table correctly
- [ ] Concurrent edits to same position handled

Run `pnpm nx run rms-material-e2e:e2e` to verify all e2e tests pass.
