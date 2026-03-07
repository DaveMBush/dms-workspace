import { KeyValuePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';

import { ConfirmDialogService } from '../../shared/services/confirm-dialog.service';
import { NotificationService } from '../../shared/services/notification.service';
import { CusipCacheAddDialogComponent } from './cusip-cache-add-dialog.component';
import { CusipCacheAdminService } from './cusip-cache-admin.service';
import { CusipCacheDialogResult } from './cusip-cache-dialog-result.interface';
import { CusipCacheEntry } from './cusip-cache-entry.interface';

@Component({
  selector: 'dms-cusip-cache',
  imports: [
    KeyValuePipe,
    FormsModule,
    MatCardModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTableModule,
    MatSortModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
  ],
  templateUrl: './cusip-cache.html',
  styleUrl: './cusip-cache.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CusipCacheComponent implements OnInit {
  private readonly adminService = inject(CusipCacheAdminService);
  private readonly dialog = inject(MatDialog);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly notification = inject(NotificationService);

  readonly stats = this.adminService.stats;
  readonly searchResults = this.adminService.searchResults;
  readonly auditEntries = this.adminService.auditEntries;
  readonly loading = this.adminService.loading;
  readonly error = this.adminService.error;

  readonly searchType = signal<'cusip' | 'symbol'>('cusip');
  readonly searchValue = signal('');

  readonly displayedColumns = [
    'cusip',
    'symbol',
    'source',
    'resolvedAt',
    'lastUsedAt',
    'actions',
  ];

  readonly auditColumns = ['createdAt', 'cusip', 'symbol', 'action', 'source'];

  ngOnInit(): void {
    this.adminService.fetchStats();
    this.adminService.fetchAuditLog();
  }

  onRefresh(): void {
    this.adminService.fetchStats();
    this.adminService.fetchAuditLog();
  }

  onSearch(): void {
    const value = this.searchValue().trim();
    if (value.length === 0) {
      return;
    }
    if (this.searchType() === 'cusip') {
      this.adminService.search(value);
    } else {
      this.adminService.search(undefined, value);
    }
  }

  onClearSearch(): void {
    this.searchValue.set('');
    this.adminService.clearSearch();
  }

  onAddMapping(): void {
    const self = this;
    const dialogRef = this.dialog.open<
      CusipCacheAddDialogComponent,
      unknown,
      CusipCacheDialogResult
    >(CusipCacheAddDialogComponent, { width: '480px' });

    dialogRef
      .afterClosed()
      .subscribe(function onDialogClosed(
        result: CusipCacheDialogResult | undefined
      ) {
        if (result !== null && result !== undefined) {
          self.adminService.addMapping(
            result.cusip,
            result.symbol,
            result.source,
            result.reason
          );
          self.notification.success('Mapping added successfully');
          self.adminService.fetchStats();
          self.adminService.fetchAuditLog();
        }
      });
  }

  onEditMapping(entry: CusipCacheEntry): void {
    const self = this;
    const dialogRef = this.dialog.open<
      CusipCacheAddDialogComponent,
      CusipCacheEntry,
      CusipCacheDialogResult
    >(CusipCacheAddDialogComponent, { width: '480px', data: entry });

    dialogRef
      .afterClosed()
      .subscribe(function onEditClosed(
        result: CusipCacheDialogResult | undefined
      ) {
        if (result !== null && result !== undefined) {
          self.adminService.addMapping(
            result.cusip,
            result.symbol,
            result.source,
            result.reason
          );
          self.notification.success('Mapping updated successfully');
          self.adminService.fetchStats();
          self.adminService.fetchAuditLog();
          if (self.searchValue().trim().length > 0) {
            self.onSearch();
          }
        }
      });
  }

  onDeleteMapping(entry: CusipCacheEntry): void {
    const self = this;
    this.confirmDialog
      .confirm({
        title: 'Delete Cache Entry',
        message: `Delete CUSIP ${entry.cusip} (${entry.symbol})?`,
        confirmText: 'Delete',
        cancelText: 'Cancel',
      })
      .subscribe(function onDeleteConfirmed(confirmed) {
        if (confirmed) {
          self.adminService.deleteMapping(entry.id);
          self.notification.success('Cache entry deleted');
          self.adminService.fetchStats();
          self.adminService.fetchAuditLog();
          if (self.searchValue().trim().length > 0) {
            self.onSearch();
          }
        }
      });
  }

  onSort(_: Sort): void {
    // Sort is handled client-side since results are limited
  }
}
