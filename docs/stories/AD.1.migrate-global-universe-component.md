# Story AD.1: Migrate Global Universe Component

## Story

**As a** user managing my investment universe
**I want** to view and edit universe data in a Material-styled table
**So that** I can manage symbols, yields, ex-dates, and other investment data

## Context

**Current System:**

- Location: `apps/rms/src/app/global/global-universe/`
- PrimeNG components: `p-table` (editable), `p-toolbar`, `p-button`, `p-inputNumber`, `p-datepicker`, `p-select`, `p-cellEditor`
- Most complex table in the application with ~15 columns, many editable
- ~270 lines of template code

**Migration Target:**

- Base table component with virtual scrolling
- Editable cell components for inline editing
- Material toolbar and buttons

## Acceptance Criteria

### Functional Requirements

- [ ] All columns display correctly
- [ ] Editable cells for: yield, purchase price, ex-date, div amount, etc.
- [ ] Row selection for batch operations
- [ ] Toolbar actions (sync, update, delete)
- [ ] Sorting by column headers
- [ ] Filtering by symbol, risk group, etc.

### Technical Requirements

- [ ] Uses base table from AC.1
- [ ] Uses editable cell from AC.2
- [ ] Uses editable date cell from AC.3
- [ ] SmartNgRX signal for universe data
- [ ] Virtual scrolling for performance

### Visual Requirements

- [ ] Compact table layout
- [ ] Clear editable cell indicators
- [ ] Status indicators match current design
- [ ] Responsive toolbar

## Technical Approach

### Step 1: Create Global Universe Component

Create `apps/rms-material/src/app/global/global-universe/global-universe.component.ts`:

```typescript
import { Component, inject, OnInit, ViewChild } from '@angular/core';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';

import { BaseTableComponent, ColumnDef } from '../../shared/components/base-table/base-table.component';
import { EditableCellComponent } from '../../shared/components/editable-cell/editable-cell.component';
import { EditableDateCellComponent } from '../../shared/components/editable-date-cell/editable-date-cell.component';
import { selectUniverse } from '../../store/universe/select-universe.function';
import { Universe } from '../../store/universe/universe.interface';
import { UniverseSyncService } from '../../shared/services/universe-sync.service';
import { NotificationService } from '../../shared/services/notification.service';
import { ConfirmDialogService } from '../../shared/services/confirm-dialog.service';

@Component({
  selector: 'rms-global-universe',
  imports: [
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    BaseTableComponent,
    EditableCellComponent,
    EditableDateCellComponent,
  ],
  templateUrl: './global-universe.component.html',
  styleUrl: './global-universe.component.scss',
})
export class GlobalUniverseComponent implements OnInit {
  private universeSignal = inject(selectUniverse);
  private syncService = inject(UniverseSyncService);
  private notification = inject(NotificationService);
  private confirmDialog = inject(ConfirmDialogService);

  @ViewChild(BaseTableComponent) table!: BaseTableComponent<Universe>;

  columns: ColumnDef[] = [
    { field: 'symbol', header: 'Symbol', sortable: true, width: '80px' },
    { field: 'name', header: 'Name', sortable: true },
    { field: 'riskGroup', header: 'Risk', sortable: true, width: '80px' },
    { field: 'currentYield', header: 'Yield', type: 'number', editable: true, width: '80px' },
    { field: 'purchasePrice', header: 'Purchase', type: 'currency', editable: true, width: '100px' },
    { field: 'exDate', header: 'Ex-Date', type: 'date', editable: true, width: '100px' },
    { field: 'divAmount', header: 'Div Amt', type: 'currency', editable: true, width: '90px' },
    { field: 'frequency', header: 'Freq', width: '60px' },
    { field: 'isActive', header: 'Active', width: '70px' },
  ];

  ngOnInit(): void {
    // Data source initialized via SmartNgRX signal
  }

  onSyncUniverse(): void {
    const context = this;
    this.syncService.syncUniverse().subscribe({
      next: function onSuccess() {
        context.notification.success('Universe synced successfully');
      },
      error: function onError(err) {
        context.notification.error('Failed to sync universe: ' + err.message);
      },
    });
  }

  onDeleteSelected(): void {
    const selected = this.table.selection.selected;
    if (selected.length === 0) {
      this.notification.warn('No items selected');
      return;
    }

    const context = this;
    this.confirmDialog
      .confirm({
        title: 'Delete Selected',
        message: `Are you sure you want to delete ${selected.length} items?`,
        confirmText: 'Delete',
      })
      .subscribe(function onConfirm(confirmed) {
        if (confirmed) {
          // Perform delete via SmartNgRX
          context.notification.success(`Deleted ${selected.length} items`);
        }
      });
  }

  onCellEdit(row: Universe, field: string, value: unknown): void {
    // Update via SmartNgRX effects service
    const updatedRow = { ...row, [field]: value };
    // this.universeEffectsService.update(updatedRow);
  }
}
```

### Step 2: Create Global Universe Template

Create `apps/rms-material/src/app/global/global-universe/global-universe.component.html`:

```html
<div class="universe-container">
  <mat-toolbar class="universe-toolbar">
    <span class="toolbar-title">Global Universe</span>
    <span class="toolbar-spacer"></span>
    <button mat-button (click)="onSyncUniverse()">
      <mat-icon>sync</mat-icon>
      Sync Universe
    </button>
    <button mat-button color="warn" (click)="onDeleteSelected()">
      <mat-icon>delete</mat-icon>
      Delete Selected
    </button>
  </mat-toolbar>

  <rms-base-table
    [columns]="columns"
    [selectable]="true"
    [multiSelect]="true"
    [rowHeight]="48"
  >
    <!-- Custom cell templates for editable fields -->
    <ng-template #cellTemplate let-row let-column="column">
      @switch (column.field) {
        @case ('currentYield') {
          <rms-editable-cell
            [value]="row.currentYield"
            format="decimal"
            [decimalFormat]="'1.2-2'"
            (valueChange)="onCellEdit(row, 'currentYield', $event)"
          />
        }
        @case ('purchasePrice') {
          <rms-editable-cell
            [value]="row.purchasePrice"
            format="currency"
            (valueChange)="onCellEdit(row, 'purchasePrice', $event)"
          />
        }
        @case ('exDate') {
          <rms-editable-date-cell
            [value]="row.exDate"
            (valueChange)="onCellEdit(row, 'exDate', $event)"
          />
        }
        @case ('divAmount') {
          <rms-editable-cell
            [value]="row.divAmount"
            format="currency"
            (valueChange)="onCellEdit(row, 'divAmount', $event)"
          />
        }
        @case ('isActive') {
          <mat-icon [class.active]="row.isActive">
            {{ row.isActive ? 'check_circle' : 'cancel' }}
          </mat-icon>
        }
        @default {
          {{ row[column.field] }}
        }
      }
    </ng-template>
  </rms-base-table>
</div>
```

## Files Created

| File | Purpose |
|------|---------|
| `global/global-universe/global-universe.component.ts` | Universe component |
| `global/global-universe/global-universe.component.html` | Universe template |
| `global/global-universe/global-universe.component.scss` | Universe styles |

## Definition of Done

- [ ] All columns display correctly
- [ ] Editable cells work for all editable fields
- [ ] Sync button triggers universe sync
- [ ] Delete selected removes items with confirmation
- [ ] Virtual scrolling handles large dataset
- [ ] SmartNgRX data updates reflected
- [ ] All validation commands pass
