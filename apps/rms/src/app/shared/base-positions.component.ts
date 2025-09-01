import { Directive, effect, ElementRef, inject, signal } from '@angular/core';
import { MessageService } from 'primeng/api';

import { Trade } from '../store/trades/trade.interface';
import { Universe } from '../store/universe/universe.interface';
import { BasePosition } from './base-position.interface';
import { BasePositionsStorageService } from './base-positions-storage.service';
import {
  findTradeForRow,
  findUniverseForSymbol,
  setScrollPosition,
} from './position-operations.function';
import { compareValues } from './positions-utils.function';

@Directive()
export abstract class BasePositionsComponent<
  T extends BasePosition,
  S extends BasePositionsStorageService
> {
  protected abstract storageService: S;
  protected abstract getTradesArray(): Trade[];
  protected abstract tableRef: () => ElementRef | undefined;
  protected abstract scrollTopSignal: () => number;
  protected messageService = inject(MessageService);

  private sortField = signal<string>('');
  private sortOrder = signal<number>(0);
  symbolFilter = signal<string>('');
  private isInitialized = signal<boolean>(false);

  constructor() {
    // Use effect to initialize signals when storageService becomes available
    // eslint-disable-next-line @smarttools/no-anonymous-functions -- would hide this
    effect(() => {
      if (!this.isInitialized() && this.storageService !== undefined) {
        this.sortField.set(this.storageService.loadSortField());
        this.sortOrder.set(this.storageService.loadSortOrder());
        this.symbolFilter.set(this.storageService.loadSymbolFilter());
        this.isInitialized.set(true);
      }
    });
  }

  protected getSortField(): string {
    return this.sortField();
  }

  protected getSortOrder(): number {
    return this.sortOrder();
  }

  protected getSymbolFilter(): string {
    return this.symbolFilter();
  }

  protected onSymbolFilterChange(): void {
    this.storageService.saveSymbolFilter(this.symbolFilter());
  }

  protected onSort(field: string): void {
    const currentField = this.getSortField();
    const currentOrder = this.getSortOrder();

    if (currentField === field) {
      this.sortOrder.set(currentOrder === 1 ? -1 : 1);
    } else {
      this.sortField.set(field);
      this.sortOrder.set(1);
    }

    this.storageService.saveSortState(this.getSortField(), this.getSortOrder());
  }

  protected getSortIcon(field: string): string {
    const currentField = this.getSortField();
    const order = this.getSortOrder();
    if (currentField === field) {
      return order === 1 ? 'pi pi-sort-up' : 'pi pi-sort-down';
    }
    return 'pi pi-sort';
  }

  protected getSortOrderDisplay(field: string): string {
    const currentField = this.getSortField();
    const order = this.getSortOrder();
    if (currentField === field) {
      return order === 1 ? '1' : '2';
    }
    return '';
  }

  protected comparePositions(
    a: T,
    b: T,
    sortField: string,
    sortOrder: number
  ): number {
    const values = this.getSortValues(a, b, sortField);
    if (values === null) {
      return 0;
    }

    const { aValue, bValue } = values;
    return compareValues(aValue, bValue, sortOrder);
  }

  protected abstract getSortValues(
    a: T,
    b: T,
    sortField: string
  ): { aValue: unknown; bValue: unknown } | null;

  protected abstract validateTradeField(
    field: string,
    row: T,
    trade: Trade,
    universe: Universe
  ): string;

  protected onEditCommit(row: T, field: string): void {
    setScrollPosition(this.tableRef, this.scrollTopSignal());
    const trade = findTradeForRow(this.getTradesArray(), row.id);
    const universe = findUniverseForSymbol(row.symbol);
    if (trade === undefined && universe === undefined) {
      return;
    }
    const tradeField = this.validateTradeField(field, row, trade!, universe!);
    if (tradeField === '') {
      return;
    }
    (trade as Record<keyof Trade, unknown>)[tradeField as keyof Trade] =
      row[field as keyof T];
  }
}
