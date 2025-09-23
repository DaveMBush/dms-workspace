import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { RowProxyDelete } from '@smarttools/smart-signals';

import { BasePositionsComponent } from '../../shared/base-positions.component';
import { POSITIONS_COMMON_IMPORTS } from '../../shared/positions-common-imports.const';
import { currentAccountSignalStore } from '../../store/current-account/current-account.signal-store';
import { Trade } from '../../store/trades/trade.interface';
import { Universe } from '../../store/universe/universe.interface';
import { calculateCapitalGains } from './capital-gains-calculator.function';
import { SoldPositionsComponentService } from './sold-positions-component.service';
import { SoldPositionsStorageService } from './sold-positions-storage.service';

interface SoldPosition {
  id: string;
  symbol: string;
  exDate: string;
  buy: number;
  buyDate: string;
  quantity: number;
  expectedYield: number;
  sell: number;
  sellDate: string;
  daysHeld: number;
  targetGain: number;
  targetSell: number;
  capitalGain: number;
  capitalGainPercentage: number;
  [key: string]: unknown;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'rms-sold-positions',
  standalone: true,
  imports: [...POSITIONS_COMMON_IMPORTS],
  templateUrl: './sold-positions.component.html',
  styleUrls: ['./sold-positions.component.scss'],
  viewProviders: [SoldPositionsStorageService],
})
export class SoldPositionsComponent extends BasePositionsComponent<
  SoldPosition,
  SoldPositionsStorageService
> {
  // Public methods
  override onSort(field: string): void {
    super.onSort(field);
  }

  override onSymbolFilterChange(): void {
    super.onSymbolFilterChange();
  }

  trackById(index: number, row: SoldPosition): string {
    return row.id;
  }

  stopArrowKeyPropagation(event: KeyboardEvent): void {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.stopPropagation();
    }
  }

  trash(position: SoldPosition): void {
    const trades = this.soldPositionsService.trades();
    for (let i = 0; i < trades.length; i++) {
      const trade = trades[i];
      if (trade.id === position.id) {
        (trade as RowProxyDelete).delete!();
      }
    }
  }

  override onEditCommit(row: SoldPosition, field: string): void {
    super.onEditCommit(row, field);
  }

  getSortValues(
    a: SoldPosition,
    b: SoldPosition,
    sortField: string
  ): { aValue: unknown; bValue: unknown } | null {
    switch (sortField) {
      case 'sellDate':
        return { aValue: a.sellDate, bValue: b.sellDate };
      default:
        return null;
    }
  }

  getTradesArray(): Trade[] {
    return this.soldPositionsService.trades();
  }

  // Protected properties and methods
  protected scrollTopSignal = signal(0);
  protected storageService = inject(SoldPositionsStorageService);

  // eslint-disable-next-line @smarttools/no-anonymous-functions -- arrow function required for correct typing
  protected tableRef = (): ElementRef | undefined => this.tableRefSignal();

  // Sort signals for UI
  readonly sortSignals = {
    // eslint-disable-next-line @smarttools/no-anonymous-functions -- would hide this
    sellDateSortIcon$: computed(() => this.getSortIcon('sellDate')),
    // eslint-disable-next-line @smarttools/no-anonymous-functions -- would hide this
    sellDateSortOrder$: computed(() => this.getSortOrderDisplay('sellDate')),
  };

  // eslint-disable-next-line @smarttools/no-anonymous-functions -- would hide this
  positions$ = computed(() => {
    const rawPositions = this.soldPositionsService.selectClosedPositions();
    const sortField = this.getSortField();
    const sortOrder = this.getSortOrder();
    const symbolFilter = this.symbolFilter();

    // Convert ClosedPosition to SoldPosition
    const soldPositions = rawPositions.map(function convertToSoldPosition(pos) {
      // Recalculate capital gains to ensure they reflect current buy/sell prices
      const capitalGains = calculateCapitalGains({
        buy: pos.buy,
        sell: pos.sell,
        quantity: pos.quantity,
      });

      return {
        id: pos.id,
        symbol: pos.symbol,
        exDate: '', // Not available in ClosedPosition
        buy: pos.buy,
        buyDate: pos.buyDate.toISOString(),
        quantity: pos.quantity,
        expectedYield: 0, // Not available in ClosedPosition
        sell: pos.sell,
        sellDate: pos.sellDate?.toISOString() ?? '',
        daysHeld: pos.daysHeld,
        targetGain: 0, // Not available in ClosedPosition
        targetSell: 0, // Not available in ClosedPosition
        capitalGain: capitalGains.capitalGain,
        capitalGainPercentage: capitalGains.capitalGainPercentage,
      } as SoldPosition;
    });

    // Apply symbol filter
    let filteredPositions = soldPositions;
    if (symbolFilter && symbolFilter.trim() !== '') {
      filteredPositions = soldPositions.filter(function filterSymbol(position) {
        return position.symbol
          .toLowerCase()
          .includes(symbolFilter.toLowerCase());
      });
    }

    // Apply sorting
    if (sortField && sortOrder !== 0) {
      // eslint-disable-next-line @smarttools/no-anonymous-functions -- would hide this
      return filteredPositions.sort((a, b) =>
        this.comparePositions(a, b, sortField, sortOrder)
      );
    }

    return filteredPositions;
  });

  protected validateTradeField(
    field: string,
    row: SoldPosition,
    trade: Trade,
    universe: Universe
  ): string {
    switch (field) {
      case 'sell':
        universe.most_recent_sell_price = row.sell;
        return 'sell';
      case 'sellDate':
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
          row.sellDate = trade.sell_date ?? '';
          return '';
        }
        return 'sell_date';
      case 'buyDate':
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
          row.buyDate = trade.buy_date ?? '';
          return '';
        }
        return 'buy_date';
      default:
        return field;
    }
  }

  // Private properties
  private soldPositionsService = inject(SoldPositionsComponentService);
  private currentAccountSignalStore = inject(currentAccountSignalStore);
  private tableRefSignal = viewChild('tableRef', { read: ElementRef });
}
