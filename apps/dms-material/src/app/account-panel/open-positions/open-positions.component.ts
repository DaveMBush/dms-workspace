import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { BaseTableComponent } from '../../shared/components/base-table/base-table.component';
import { ColumnDef } from '../../shared/components/base-table/column-def.interface';
import { Trade } from '../../store/trades/trade.interface';
import { TradeEffectsService } from '../../store/trades/trade-effect.service';
import { tradeEffectsServiceToken } from '../../store/trades/trade-effect-service-token';
import { AddPositionDialogComponent } from './add-position-dialog/add-position-dialog.component';
import { isPositive, isValidDate, isValidNumber } from './position-validators';
@Component({
  selector: 'dms-open-positions',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    BaseTableComponent,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
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
  successMessage = signal<string>('');
  updating = signal<boolean>(false);
  // Inject TradeEffectsService for update operations
  tradesEffects: TradeEffectsService = inject(tradeEffectsServiceToken);
  // Inject MatDialog for add position dialog
  private dialog = inject(MatDialog);
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

  openAddPositionDialog(): void {
    const dialogRef = this.dialog.open(AddPositionDialogComponent, {
      width: '500px',
      data: {
        accountId: this.selectedAccountId(),
      },
    });

    const context = this;
    const handleDialogClose = function handleDialogClose(
      result: {
        symbol?: string;
        quantity?: number;
        price?: number;
        // eslint-disable-next-line @typescript-eslint/naming-convention -- backend field name
        purchase_date?: string;
      } | null
    ): void {
      context.handleDialogResult(result);
    };

    const handleDialogCloseError = function handleDialogCloseError(
      error: Error
    ): void {
      context.handleDialogError(error);
    };

    dialogRef.afterClosed().subscribe({
      next: handleDialogClose,
      error: handleDialogCloseError,
    });
  }

  onSellPosition(_: Trade): void {
    // Open sell dialog
  }

  onCellEdit(__: Trade, ___: string, ____: unknown): void {
    // Update via SmartNgRX
  }

  updateQuantity(tradeId: string, newQuantity: number): void {
    if (!isValidNumber(newQuantity)) {
      this.errorMessage.set('Quantity must be a valid number');
      return;
    }
    if (!isPositive(newQuantity)) {
      this.errorMessage.set('Quantity must be positive');
      return;
    }
    this.performUpdate(tradeId, { quantity: newQuantity } as unknown as Trade);
  }

  updatePrice(tradeId: string, newPrice: number): void {
    if (!isValidNumber(newPrice)) {
      this.errorMessage.set('Price must be a valid number');
      return;
    }
    if (!isPositive(newPrice)) {
      this.errorMessage.set('Price must be positive');
      return;
    }
    this.performUpdate(tradeId, { price: newPrice } as unknown as Trade);
  }

  updatePurchaseDate(tradeId: string, newDate: string): void {
    if (!isValidDate(newDate)) {
      this.errorMessage.set('Invalid date format');
      return;
    }
    this.performUpdate(tradeId, {
      purchase_date: newDate,
    } as unknown as Trade);
  }

  updateSellPrice(tradeId: string, newSellPrice: number): void {
    if (!isValidNumber(newSellPrice)) {
      this.errorMessage.set('Sell price must be a valid number');
      return;
    }
    if (!isPositive(newSellPrice)) {
      this.errorMessage.set('Sell price must be positive');
      return;
    }
    this.performUpdate(tradeId, { sell: newSellPrice } as unknown as Trade);
  }

  updateSellDate(tradeId: string, newSellDate: string): void {
    const findTradeById = function findTradeById(t: Trade): boolean {
      return t.id === tradeId;
    };
    const trade = this.trades$().find(findTradeById);
    if (!trade) {
      this.errorMessage.set('Trade not found');
      return;
    }
    if (!isValidDate(newSellDate)) {
      this.errorMessage.set('Invalid date format');
      return;
    }

    if (!isValidDate(trade.buy_date)) {
      this.errorMessage.set('Missing or invalid purchase date');
      return;
    }

    if (new Date(newSellDate) <= new Date(trade.buy_date)) {
      this.errorMessage.set('Sell date must be after purchase date');
      return;
    }

    if (trade.sell === null || trade.sell === undefined) {
      this.errorMessage.set('Sell price is required to close position');
      return;
    }
    const confirmed = confirm('Close this position?');
    if (!confirmed) {
      return;
    }
    this.performClosePosition(tradeId, newSellDate);
  }

  private performClosePosition(tradeId: string, sellDate: string): void {
    this.updating.set(true);
    const context = this;
    const handleSuccess = function handleSuccess(): void {
      context.updating.set(false);
      context.errorMessage.set('');
      context.successMessage.set('Position closed successfully');
      const clearMessage = function clearMessage(): void {
        context.successMessage.set('');
      };
      setTimeout(clearMessage, 3000);
    };
    const handleError = function handleError(error: Error): void {
      context.updating.set(false);
      context.errorMessage.set(`Failed to close position: ${error.message}`);
    };
    this.tradesEffects
      .update({ id: tradeId, sell_date: sellDate } as unknown as Trade)
      .subscribe({ next: handleSuccess, error: handleError });
  }

  private performUpdate(tradeId: string, updateData: Partial<Trade>): void {
    this.updating.set(true);
    const context = this;
    const handleSuccess = function handleSuccess(): void {
      context.updating.set(false);
      context.errorMessage.set('');
    };
    const handleError = function handleError(error: Error): void {
      context.updating.set(false);
      context.errorMessage.set(`Update failed: ${error.message}`);
    };
    this.tradesEffects
      .update({ id: tradeId, ...updateData } as unknown as Trade)
      .subscribe({ next: handleSuccess, error: handleError });
  }

  private handleDialogResult(
    result: {
      symbol?: string;
      quantity?: number;
      price?: number;
      // eslint-disable-next-line @typescript-eslint/naming-convention -- backend field name
      purchase_date?: string;
    } | null
  ): void {
    if (result === null || result === undefined) {
      return;
    }

    // Validate required fields
    if (
      result.symbol === undefined ||
      result.symbol === '' ||
      result.quantity === undefined ||
      result.price === undefined ||
      result.purchase_date === undefined ||
      result.purchase_date === ''
    ) {
      this.errorMessage.set('All fields are required');
      return;
    }

    const tradeData = {
      ...result,
      accountId: this.selectedAccountId(),
      sell_date: null,
    };

    const context = this;
    const handleAddComplete = function handleAddComplete(): void {
      context.handleAddSuccess();
    };

    const handleAddFailed = function handleAddFailed(error: Error): void {
      context.handleAddError(error);
    };

    this.tradesEffects.add(tradeData as unknown as Trade).subscribe({
      next: handleAddComplete,
      error: handleAddFailed,
    });
  }

  private handleAddSuccess(): void {
    this.successMessage.set('Position added successfully');
    const context = this;
    const clearSuccessMessage = function clearSuccessMessage(): void {
      context.successMessage.set('');
    };
    setTimeout(clearSuccessMessage, 3000);
  }

  private handleAddError(error: Error): void {
    this.errorMessage.set(`Failed to add position: ${error.message}`);
  }

  private handleDialogError(error: Error): void {
    this.errorMessage.set(`Dialog error: ${error.message}`);
  }
}
