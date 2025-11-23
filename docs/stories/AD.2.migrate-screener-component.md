# Story AD.2: Migrate Screener Component

## Story

**As a** user screening stocks for investment
**I want** to view and filter screened stocks in a Material table
**So that** I can identify potential investment opportunities

## Context

**Current System:**

- Location: `apps/rms/src/app/global/screener/`
- PrimeNG components: `p-table`, `p-toolbar`, `p-select`, `p-button`
- Displays screened stocks with filtering by various criteria

**Migration Target:**

- Base table with Material styling
- Material select for filters
- Material toolbar

## Acceptance Criteria

### Functional Requirements

- [ ] Screener data displays in table
- [ ] Filter by risk group, frequency, etc.
- [ ] Sortable columns
- [ ] Refresh button to re-run screener
- [ ] Add to universe action

### Technical Requirements

- [ ] Uses base table from AC.1
- [ ] SmartNgRX signal for screen data
- [ ] Filter controls in toolbar

## Technical Approach

Create `apps/rms-material/src/app/global/screener/screener.ts`:

```typescript
import { Component, inject, signal } from '@angular/core';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';

import { BaseTableComponent, ColumnDef } from '../../shared/components/base-table/base-table.component';
import { selectScreen } from '../../store/screen/select-screen.function';
import { NotificationService } from '../../shared/services/notification.service';

@Component({
  selector: 'rms-screener',
  imports: [
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    BaseTableComponent,
  ],
  templateUrl: './screener.html',
  styleUrl: './screener.scss',
})
export class Screener {
  private screenSignal = inject(selectScreen);
  private notification = inject(NotificationService);

  columns: ColumnDef[] = [
    { field: 'symbol', header: 'Symbol', sortable: true },
    { field: 'name', header: 'Name', sortable: true },
    { field: 'yield', header: 'Yield', type: 'number', sortable: true },
    { field: 'price', header: 'Price', type: 'currency', sortable: true },
    { field: 'frequency', header: 'Frequency', sortable: true },
    { field: 'riskGroup', header: 'Risk Group', sortable: true },
  ];

  riskGroupFilter = signal<string | null>(null);
  frequencyFilter = signal<string | null>(null);

  riskGroups = ['Low', 'Medium', 'High'];
  frequencies = ['Monthly', 'Quarterly', 'Annual'];

  onRefresh(): void {
    // Trigger screener refresh
    this.notification.info('Refreshing screener...');
  }

  onAddToUniverse(symbol: string): void {
    // Add symbol to universe
    this.notification.success(`Added ${symbol} to universe`);
  }
}
```

## Definition of Done

- [ ] Screener table displays data
- [ ] Filters work correctly
- [ ] Refresh triggers screener update
- [ ] Add to universe works
- [ ] All validation commands pass
