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
  imports: [
    MatToolbarModule, MatButtonModule, MatIconModule,
    BaseTableComponent, EditableCellComponent, EditableDateCellComponent,
  ],
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
