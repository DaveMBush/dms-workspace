import { CurrencyPipe, DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  signal,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { Sort } from '@angular/material/sort';
import { handleSocketNotification } from '@smarttools/smart-signals';
import { filter, switchMap } from 'rxjs';

import { BaseTableComponent } from '../../shared/components/base-table/base-table.component';
import { ColumnDef } from '../../shared/components/base-table/column-def.interface';
import { ConfirmDialogService } from '../../shared/services/confirm-dialog.service';
import { NotificationService } from '../../shared/services/notification.service';
import { SortFilterStateService } from '../../shared/services/sort-filter-state.service';
import { getAccountIds } from '../../store/accounts/selectors/get-account-ids.function';
import { currentAccountSignalStore } from '../../store/current-account/current-account.signal-store';
import { DivDeposit } from '../../store/div-deposits/div-deposit.interface';
import { divDepositsEffectsServiceToken } from '../../store/div-deposits/div-deposits-effect-service-token';
import { DivDepModal } from '../div-dep-modal/div-dep-modal.component';
import { DividendDepositsComponentService } from './dividend-deposits-component.service';

@Component({
  selector: 'dms-dividend-deposits',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    BaseTableComponent,
    DatePipe,
    CurrencyPipe,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './dividend-deposits.component.html',
  styleUrl: './dividend-deposits.component.scss',
})
export class DividendDepositsComponent {
  private static readonly tableKey = 'div-deposits';
  readonly dividendDepositsService = inject(DividendDepositsComponentService);
  private currentAccountStore = inject(currentAccountSignalStore);
  private dialog = inject(MatDialog);
  private notification = inject(NotificationService);
  private confirmDialog = inject(ConfirmDialogService);
  private effectsService = inject(divDepositsEffectsServiceToken);
  private readonly sortFilterStateService = inject(SortFilterStateService);

  constructor() {
    const store = this.currentAccountStore;
    const service = this.dividendDepositsService;
    effect(function syncAccountSelection() {
      const accountId = store.selectCurrentAccountId();
      service.selectedAccountId.set(accountId);
    });
  }

  readonly dividends$ = this.dividendDepositsService.dividends;
  readonly visibleRange = signal<{ start: number; end: number }>({
    start: 0,
    end: 50,
  });

  onRangeChange(range: { start: number; end: number }): void {
    this.visibleRange.set(range);
    this.dividendDepositsService.visibleRange.set(range);
  }

  onSortChange(sort: Sort): void {
    if (sort.direction === '') {
      this.sortFilterStateService.clearSortState(
        DividendDepositsComponent.tableKey
      );
    } else {
      this.sortFilterStateService.saveSortState(
        DividendDepositsComponent.tableKey,
        {
          field: sort.active,
          order: sort.direction,
        }
      );
    }
    handleSocketNotification('accounts', 'update', getAccountIds());
  }

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
    { field: 'actions', header: '', type: 'actions', width: '60px' },
  ];

  onAddDividend(): void {
    const context = this;
    this.dialog
      .open(DivDepModal, { width: '500px', data: { mode: 'add' } })
      .afterClosed()
      .pipe(
        filter(function hasResult(result: unknown): result is DivDeposit {
          return result !== null && result !== undefined;
        })
      )
      .subscribe(function onAdd(result: DivDeposit) {
        context.dividendDepositsService.addDivDeposit(result);
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
        })
      )
      .subscribe(function onDelete() {
        context.dividendDepositsService.deleteDivDeposit(dividend.id);
        context.notification.success('Dividend deleted');
      });
  }
}
