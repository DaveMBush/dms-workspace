import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { BaseTableComponent } from '../../shared/components/base-table/base-table.component';
import { ColumnDef } from '../../shared/components/base-table/column-def.interface';
import { Trade } from '../../store/trades/trade.interface';
import { TradeEffectsService } from '../../store/trades/trade-effect.service';
import { tradeEffectsServiceToken } from '../../store/trades/trade-effect-service-token';

@Component({
  selector: 'dms-open-positions',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    BaseTableComponent,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  templateUrl: './open-positions.component.html',
  styleUrl: './open-positions.component.scss',
})
export class OpenPositionsComponent {
  // Writable signal for trades (populated from SmartNgRX or set directly in tests)
  readonly trades$ = signal<Trade[]>([]);

  // Writable signal for selected account ID (can be set from parent or tests)
  readonly selectedAccountId = signal<string>('');

  // Computed signal for filtered open positions
  // eslint-disable-next-line @smarttools/no-anonymous-functions -- signal computed requires arrow function
  readonly displayedPositions = computed(() => {
    const allTrades = this.trades$();
    const accountId = this.selectedAccountId();

    return allTrades.filter(function filterOpenPositionsByAccount(
      trade: Trade
    ): boolean {
      return (
        (trade.sell_date === null || trade.sell_date === undefined) &&
        trade.accountId === accountId
      );
    });
  });

  // Signals for editable cells functionality
  errorMessage = signal<string>('');
  updating = signal<boolean>(false);

  // Inject TradeEffectsService for update operations
  tradesEffects: TradeEffectsService = inject(tradeEffectsServiceToken);

  searchText = '';

  columns: ColumnDef[] = [
    { field: 'universeId', header: 'Symbol', sortable: false, width: '120px' },
    { field: 'exDate', header: 'Ex-Date', type: 'date' },
    { field: 'buy', header: 'Buy', type: 'currency', editable: true },
    {
      field: 'buy_date',
      header: 'Buy Date',
      type: 'date',
      sortable: true,
      editable: true,
    },
    { field: 'quantity', header: 'Quantity', type: 'number', editable: true },
    { field: 'expectedValue', header: 'Expected $', type: 'currency' },
    { field: 'lastValue', header: 'Last $', type: 'currency' },
    {
      field: 'unrealizedGainPercent',
      header: 'Unrlz Gain %',
      type: 'number',
      sortable: true,
    },
    {
      field: 'unrealizedGain',
      header: 'Unrlz Gain$',
      type: 'currency',
      sortable: true,
    },
    { field: 'sell', header: 'Sell', type: 'currency', editable: true },
    { field: 'sell_date', header: 'Sell Date', type: 'date', editable: true },
    { field: 'daysHeld', header: 'Days Held', type: 'number' },
    { field: 'targetGain', header: 'Target Gain', type: 'number' },
    { field: 'targetSell', header: 'Target Sell', type: 'currency' },
  ];

  onAddPosition(): void {
    // Open new position dialog
  }

  onSellPosition(_: Trade): void {
    // Open sell dialog
  }

  onCellEdit(__: Trade, ___: string, ____: unknown): void {
    // Update via SmartNgRX
  }

  updateQuantity(tradeId: string, newQuantity: number): void {
    if (newQuantity <= 0) {
      this.errorMessage.set('Quantity must be positive');
      return;
    }

    this.updating.set(true);
    const context = this;
    const handleUpdateQuantitySuccess =
      function handleUpdateQuantitySuccess(): void {
        context.updating.set(false);
        context.errorMessage.set('');
      };
    const handleUpdateQuantityError = function handleUpdateQuantityError(
      error: Error
    ): void {
      context.updating.set(false);
      context.errorMessage.set(`Update failed: ${error.message}`);
    };
    this.tradesEffects
      .update({
        id: tradeId,
        quantity: newQuantity,
      } as unknown as Trade)
      .subscribe({
        next: handleUpdateQuantitySuccess,
        error: handleUpdateQuantityError,
      });
  }

  updatePrice(tradeId: string, newPrice: number): void {
    if (newPrice <= 0) {
      this.errorMessage.set('Price must be positive');
      return;
    }

    this.updating.set(true);
    const context = this;
    const handleUpdatePriceSuccess = function handleUpdatePriceSuccess(): void {
      context.updating.set(false);
      context.errorMessage.set('');
    };
    const handleUpdatePriceError = function handleUpdatePriceError(
      error: Error
    ): void {
      context.updating.set(false);
      context.errorMessage.set(`Update failed: ${error.message}`);
    };
    this.tradesEffects
      .update({
        id: tradeId,
        price: newPrice,
      } as unknown as Trade)
      .subscribe({
        next: handleUpdatePriceSuccess,
        error: handleUpdatePriceError,
      });
  }

  updatePurchaseDate(tradeId: string, newDate: string): void {
    if (!this.isValidDate(newDate)) {
      this.errorMessage.set('Invalid date format');
      return;
    }

    this.updating.set(true);
    const context = this;
    const handleUpdatePurchaseDateSuccess =
      function handleUpdatePurchaseDateSuccess(): void {
        context.updating.set(false);
        context.errorMessage.set('');
      };
    const handleUpdatePurchaseDateError =
      function handleUpdatePurchaseDateError(error: Error): void {
        context.updating.set(false);
        context.errorMessage.set(`Update failed: ${error.message}`);
      };
    this.tradesEffects
      .update({
        id: tradeId,
        purchase_date: newDate,
      } as unknown as Trade)
      .subscribe({
        next: handleUpdatePurchaseDateSuccess,
        error: handleUpdatePurchaseDateError,
      });
  }

  private isValidDate(dateString: string): boolean {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date.getTime());
  }
}
