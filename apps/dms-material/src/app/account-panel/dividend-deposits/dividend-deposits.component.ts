import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { filter, switchMap } from 'rxjs';

import { BaseTableComponent } from '../../shared/components/base-table/base-table.component';
import { ColumnDef } from '../../shared/components/base-table/column-def.interface';
import { ConfirmDialogService } from '../../shared/services/confirm-dialog.service';
import { NotificationService } from '../../shared/services/notification.service';
import { DivDeposit } from '../../store/div-deposits/div-deposit.interface';
import { divDepositsEffectsServiceToken } from '../../store/div-deposits/div-deposits-effect-service-token';
import { DivDepModal } from '../div-dep-modal/div-dep-modal.component';
import { DividendDepositsComponentService } from './dividend-deposits-component.service';

@Component({
  selector: 'dms-dividend-deposits',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BaseTableComponent, DatePipe, CurrencyPipe],
  templateUrl: './dividend-deposits.component.html',
  styleUrl: './dividend-deposits.component.scss',
})
export class DividendDepositsComponent {
  readonly dividendDepositsService = inject(DividendDepositsComponentService);
  private dialog = inject(MatDialog);
  private notification = inject(NotificationService);
  private confirmDialog = inject(ConfirmDialogService);
  private effectsService = inject(divDepositsEffectsServiceToken);

  readonly dividends$ = this.dividendDepositsService.dividends;

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
    this.dialog
      .open(DivDepModal, { width: '500px', data: { mode: 'add' } })
      .afterClosed()
      .pipe(
        filter(function hasResult(result: unknown): result is DivDeposit {
          return result !== null && result !== undefined;
        }),
        switchMap(function addToStore(result: DivDeposit) {
          return context.effectsService.add(result);
        })
      )
      .subscribe(function onAdd() {
        context.notification.success('Dividend added successfully');
      });
  }

  onEditDividend(dividend: DivDeposit): void {
    const context = this;
    this.dialog
      .open(DivDepModal, { width: '500px', data: { mode: 'edit', dividend } })
      .afterClosed()
      .pipe(
        filter(function hasResult(result: unknown): result is DivDeposit {
          return result !== null && result !== undefined;
        }),
        switchMap(function updateInStore(result: DivDeposit) {
          return context.effectsService.update(result);
        })
      )
      .subscribe(function onUpdate() {
        context.notification.success('Dividend updated successfully');
      });
  }

  onDeleteDividend(dividend: DivDeposit): void {
    const context = this;
    this.confirmDialog
      .confirm({
        title: 'Delete Dividend',
        message: `Are you sure you want to delete this dividend?`,
        confirmText: 'Delete',
      })
      .pipe(
        filter(function isConfirmed(confirmed: boolean): confirmed is true {
          return confirmed;
        }),
        switchMap(function deleteFromStore() {
          return context.effectsService.delete(dividend.id);
        })
      )
      .subscribe(function onDelete() {
        context.notification.success('Dividend deleted');
      });
  }
}
