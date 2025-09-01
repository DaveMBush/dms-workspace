import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';

import { BasePositionsComponent } from '../../shared/base-positions.component';
import { EditableCellComponent } from '../../shared/editable-cell.component';
import { POSITIONS_COMMON_IMPORTS } from '../../shared/positions-common-imports.const';
import { SortableHeaderComponent } from '../../shared/sortable-header.component';
import { currentAccountSignalStore } from '../../store/current-account/current-account.signal-store';
import { OpenPosition } from '../../store/trades/open-position.interface';
import { Trade } from '../../store/trades/trade.interface';
import { Universe } from '../../store/universe/universe.interface';
import { OpenPositionsComponentService } from './open-positions-component.service';
import { OpenPositionsStorageService } from './open-positions-storage.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'rms-open-positions',
  standalone: true,
  imports: [
    ...POSITIONS_COMMON_IMPORTS,
    EditableCellComponent,
    SortableHeaderComponent,
  ],
  templateUrl: './open-positions.component.html',
  styleUrls: ['./open-positions.component.scss'],
  viewProviders: [OpenPositionsComponentService, OpenPositionsStorageService],
})
export class OpenPositionsComponent extends BasePositionsComponent<
  OpenPosition,
  OpenPositionsStorageService
> {
  // Public methods
  override onSort(field: string): void {
    super.onSort(field);
  }

  override onSymbolFilterChange(): void {
    super.onSymbolFilterChange();
  }

  trackById(index: number, row: OpenPosition): string {
    return row.id;
  }

  stopArrowKeyPropagation(event: KeyboardEvent): void {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.stopPropagation();
    }
  }

  trash(position: OpenPosition): void {
    this.openPositionsService.deleteOpenPosition(position);
  }

  override onEditCommit(row: OpenPosition, field: string): void {
    super.onEditCommit(row, field);
  }

  getSortValues(
    a: OpenPosition,
    b: OpenPosition,
    sortField: string
  ): { aValue: unknown; bValue: unknown } | null {
    switch (sortField) {
      case 'buyDate':
        return { aValue: a.buyDate, bValue: b.buyDate };
      case 'unrealizedGainPercent':
        return {
          aValue: a.unrealizedGainPercent,
          bValue: b.unrealizedGainPercent,
        };
      case 'unrealizedGain':
        return { aValue: a.unrealizedGain, bValue: b.unrealizedGain };
      default:
        return null;
    }
  }

  getTradesArray(): Trade[] {
    return this.openPositionsService.trades();
  }

  // Protected properties and methods
  protected scrollTopSignal = signal(0);
  protected storageService = inject(OpenPositionsStorageService);

  // Private properties
  private openPositionsService = inject(OpenPositionsComponentService);
  private currentAccountSignalStore = inject(currentAccountSignalStore);

  private tableRefSignal = viewChild('tableRef', { read: ElementRef });
  // eslint-disable-next-line @smarttools/no-anonymous-functions -- arrow function required for correct typing
  protected tableRef = (): ElementRef | undefined => this.tableRefSignal();
  // eslint-disable-next-line @smarttools/no-anonymous-functions -- would hide this
  positions$ = computed(() => {
    const rawPositions = this.openPositionsService.selectOpenPositions();
    const symbolFilter = this.symbolFilter();
    const sortField = this.getSortField();
    const sortOrder = this.getSortOrder();

    // Apply symbol filter
    let filteredPositions = rawPositions;
    if (symbolFilter && symbolFilter.trim() !== '') {
      filteredPositions = rawPositions.filter(function filterSymbol(position) {
        return position.symbol
          .toLowerCase()
          .includes(symbolFilter.toLowerCase());
      });
    }

    // Apply sorting
    if (sortField && sortOrder !== 0) {
      // eslint-disable-next-line @smarttools/no-anonymous-functions -- would hide this
      filteredPositions = [...filteredPositions].sort((a, b) =>
        this.comparePositions(a, b, sortField, sortOrder)
      );
    }

    return filteredPositions;
  });

  // Sort signals for UI
  readonly sortSignals = {
    // eslint-disable-next-line @smarttools/no-anonymous-functions -- would hide this
    buyDateSortIcon$: computed(() => this.getSortIcon('buyDate')),
    // eslint-disable-next-line @smarttools/no-anonymous-functions -- would hide this
    buyDateSortOrder$: computed(() => this.getSortOrderDisplay('buyDate')),
    // eslint-disable-next-line @smarttools/no-anonymous-functions -- would hide this
    unrealizedGainPercentSortIcon$: computed(() =>
      this.getSortIcon('unrealizedGainPercent')
    ),
    // eslint-disable-next-line @smarttools/no-anonymous-functions -- would hide this
    unrealizedGainPercentSortOrder$: computed(() =>
      this.getSortOrderDisplay('unrealizedGainPercent')
    ),
    // eslint-disable-next-line @smarttools/no-anonymous-functions -- would hide this
    unrealizedGainSortIcon$: computed(() => this.getSortIcon('unrealizedGain')),
    // eslint-disable-next-line @smarttools/no-anonymous-functions -- would hide this
    unrealizedGainSortOrder$: computed(() =>
      this.getSortOrderDisplay('unrealizedGain')
    ),
  };

  protected validateTradeField(
    field: string,
    row: OpenPosition,
    trade: Trade,
    universe: Universe
  ): string {
    switch (field) {
      case 'sell':
        return this.validateSellField(row, universe);
      case 'sellDate':
        return this.validateSellDateField(row, trade, universe);
      case 'buyDate':
        return this.validateBuyDateField(row, trade);
      default:
        return field;
    }
  }

  private validateSellField(row: OpenPosition, universe: Universe): string {
    universe.most_recent_sell_price = row.sell;
    return 'sell';
  }

  private validateSellDateField(
    row: OpenPosition,
    trade: Trade,
    universe: Universe
  ): string {
    if (
      !this.storageService.isDateRangeValid(
        row.buyDate,
        row.sellDate,
        'sellDate'
      )
    ) {
      this.messageService.add({
        severity: 'error',
        summary: 'Invalid Date',
        detail: 'Sell date cannot be before buy date.',
      });
      this.revertSellDate(row, trade);
      return '';
    }

    this.updateUniverseSellDate(row, universe);
    return 'sell_date';
  }

  private validateBuyDateField(row: OpenPosition, trade: Trade): string {
    if (
      !this.storageService.isDateRangeValid(
        row.buyDate,
        row.sellDate,
        'buyDate'
      )
    ) {
      this.messageService.add({
        severity: 'error',
        summary: 'Invalid Date',
        detail: 'Buy date cannot be after sell date.',
      });
      this.revertBuyDate(row, trade);
      return '';
    }
    return 'buy_date';
  }

  private revertSellDate(row: OpenPosition, trade: Trade): void {
    row.sellDate =
      trade.sell_date !== undefined ? new Date(trade.sell_date) : undefined;
  }

  private revertBuyDate(row: OpenPosition, trade: Trade): void {
    row.buyDate = trade.buy_date ? new Date(trade.buy_date) : new Date();
  }

  private updateUniverseSellDate(row: OpenPosition, universe: Universe): void {
    if (
      universe.most_recent_sell_date !== null &&
      universe.most_recent_sell_date !== undefined
    ) {
      if (
        row.sellDate &&
        row.sellDate > new Date(universe.most_recent_sell_date)
      ) {
        universe.most_recent_sell_date = row.sellDate?.toISOString() ?? null;
      }
    } else {
      universe.most_recent_sell_date = row.sellDate?.toISOString() ?? null;
    }
  }
}
