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

- [ ] Open positions display in table
- [ ] Editable cells for quantity, price, dates
- [ ] Add new position action
- [ ] Sell position action
- [ ] Sort and filter

### Technical Requirements

- [ ] Uses base table from AC.1
- [ ] Uses editable cells from AC.2/AC.3
- [ ] SmartNgRX trades signal

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
  imports: [
    MatToolbarModule, MatButtonModule, MatIconModule,
    BaseTableComponent, EditableCellComponent, EditableDateCellComponent,
  ],
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
