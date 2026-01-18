import { CurrencyPipe, DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { MatDialog } from '@angular/material/dialog';

import { BaseTableComponent } from '../../shared/components/base-table/base-table.component';
import { ColumnDef } from '../../shared/components/base-table/column-def.interface';
import { ConfirmDialogService } from '../../shared/services/confirm-dialog.service';
import { NotificationService } from '../../shared/services/notification.service';
import { DivDeposit } from '../../store/div-deposits/div-deposit.interface';
import { selectDivDepositEntity } from '../../store/div-deposits/div-deposits.selectors';
import { DivDepModal } from '../div-dep-modal/div-dep-modal.component';

@Component({
  selector: 'dms-dividend-deposits',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BaseTableComponent, DatePipe, CurrencyPipe],
  templateUrl: './dividend-deposits.component.html',
  styleUrl: './dividend-deposits.component.scss',
})
export class DividendDepositsComponent {
  private dialog = inject(MatDialog);
  private notification = inject(NotificationService);
  private confirmDialog = inject(ConfirmDialogService);

  readonly dividends$ = computed(
    // eslint-disable-next-line @smarttools/no-anonymous-functions -- computed signal
    () => Object.values(selectDivDepositEntity()) as DivDeposit[]
  );

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

  onAddDividend(): void {
    const context = this;
    const dialogRef = this.dialog.open(DivDepModal, {
      width: '500px',
      data: { mode: 'add' },
    });

    dialogRef.afterClosed().subscribe(function onClose(result: unknown) {
      if (result !== null && result !== undefined) {
        context.notification.success('Dividend added successfully');
      }
    });
  }

  onEditDividend(dividend: DivDeposit): void {
    const context = this;
    const dialogRef = this.dialog.open(DivDepModal, {
      width: '500px',
      data: { mode: 'edit', dividend },
    });

    dialogRef.afterClosed().subscribe(function onClose(result: unknown) {
      if (result !== null && result !== undefined) {
        context.notification.success('Dividend updated successfully');
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
        }
      });
  }
}
