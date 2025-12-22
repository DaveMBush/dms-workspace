import { CurrencyPipe, DatePipe } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  inject,
  ViewChild,
} from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Observable, of } from 'rxjs';

import { BaseTableComponent } from '../../shared/components/base-table/base-table.component';
import { ColumnDef } from '../../shared/components/base-table/column-def.interface';
import { LazyLoadEvent } from '../../shared/components/base-table/lazy-load-event.interface';
import { ConfirmDialogService } from '../../shared/services/confirm-dialog.service';
import { NotificationService } from '../../shared/services/notification.service';
import { DivDeposit } from '../../store/div-deposits/div-deposit.interface';
import { selectDivDepositEntity } from '../../store/div-deposits/div-deposits.selectors';

@Component({
  selector: 'rms-dividend-deposits',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BaseTableComponent, DatePipe, CurrencyPipe],
  templateUrl: './dividend-deposits.component.html',
  styleUrl: './dividend-deposits.component.scss',
})
export class DividendDepositsComponent implements AfterViewInit {
  private dialog = inject(MatDialog);
  private notification = inject(NotificationService);
  private confirmDialog = inject(ConfirmDialogService);

  @ViewChild(BaseTableComponent) table!: BaseTableComponent<DivDeposit>;

  columns: ColumnDef[] = [
    { field: 'symbol', header: 'Symbol', sortable: true, width: '120px' },
    {
      field: 'date',
      header: 'Date',
      type: 'date',
      sortable: true,
      width: '110px',
    },
    {
      field: 'amount',
      header: 'Amount',
      type: 'currency',
      sortable: true,
      width: '100px',
    },
    { field: 'type', header: 'Type', width: '120px' },
  ];

  ngAfterViewInit(): void {
    const context = this;
    this.table.initDataSource(function loadDividends(event: LazyLoadEvent) {
      return context.loadDividends(event);
    });
  }

  onAddDividend(): void {
    const context = this;
    // FUTURE: Create DivDepModal component
    const dialogRef = this.dialog.open(null as never, {
      width: '500px',
      data: { mode: 'add' },
    });

    dialogRef.afterClosed().subscribe(function onClose(result: unknown) {
      if (result !== null && result !== undefined) {
        context.notification.success('Dividend added successfully');
        context.table?.refresh();
      }
    });
  }

  onEditDividend(dividend: DivDeposit): void {
    const context = this;
    // FUTURE: Create DivDepModal component
    const dialogRef = this.dialog.open(null as never, {
      width: '500px',
      data: { mode: 'edit', dividend },
    });

    dialogRef.afterClosed().subscribe(function onClose(result: unknown) {
      if (result !== null && result !== undefined) {
        context.notification.success('Dividend updated successfully');
        context.table?.refresh();
      }
    });
  }

  onDeleteDividend(__: DivDeposit): void {
    const context = this;
    this.confirmDialog
      .confirm({
        title: 'Delete Dividend',
        message: `Are you sure you want to delete this dividend?`,
        confirmText: 'Delete',
      })
      .subscribe(function onConfirm(confirmed) {
        if (confirmed) {
          // Delete via SmartNgRX
          context.notification.success('Dividend deleted');
          context.table?.refresh();
        }
      });
  }

  private loadDividends(
    event: LazyLoadEvent
  ): Observable<{ data: DivDeposit[]; total: number }> {
    // Fetch from API with pagination
    // In real implementation, this calls the backend
    // For now, simulate with signal data
    const allData = Object.values(selectDivDepositEntity());
    const data = allData.slice(event.first, event.first + event.rows);
    return of({ data: data as DivDeposit[], total: allData.length });
  }
}
