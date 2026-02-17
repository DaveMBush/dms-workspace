import { Injectable, Signal, signal } from '@angular/core';
import { SmartArray } from '@smarttools/smart-signals';

import { CurrentAccount } from '../../store/current-account/current-account.interface';
import { Trade } from '../../store/trades/trade.interface';
import { AddPositionDialogResult } from './add-position-dialog-result.interface';

@Injectable({
  providedIn: 'root',
})
export class AddPositionService {
  private errorMessage = signal<string>('');
  private successMessage = signal<string>('');

  getErrorMessage(): Signal<string> {
    return this.errorMessage.asReadonly();
  }

  getSuccessMessage(): Signal<string> {
    return this.successMessage.asReadonly();
  }

  clearMessages(): void {
    this.errorMessage.set('');
    this.successMessage.set('');
  }

  /**
   * Creates a handler function to process the add position dialog result
   */
  createDialogCloseHandler(
    trades: Signal<Trade[]>,
    currentAccount: Signal<CurrentAccount>,
    accountId: string | null
  ): (result: AddPositionDialogResult | null) => void {
    const service = this;

    return function handleDialogClose(
      result: AddPositionDialogResult | null
    ): void {
      if (!result) {
        return;
      }

      // Validate required fields
      if (!service.validateDialogResult(result, accountId)) {
        return;
      }

      // Transform dialog result to trade data
      const tradeData = service.transformToTradeData(result, accountId!);

      // Add position using SmartNgRX proxy pattern
      service.addPositionToTrades(tradeData, trades, currentAccount);
    };
  }

  private validateDialogResult(
    result: AddPositionDialogResult,
    accountId: string | null
  ): boolean {
    const hasUniverseId = this.isNonEmptyString(result.universeId);
    const hasPurchaseDate = this.isNonEmptyString(result.purchase_date);
    const hasAccountId = this.isNonEmptyString(accountId);

    if (
      !hasUniverseId ||
      result.quantity === undefined ||
      result.price === undefined ||
      !hasPurchaseDate ||
      !hasAccountId
    ) {
      this.errorMessage.set('All fields are required');
      return false;
    }
    return true;
  }

  private isNonEmptyString(value: string | null | undefined): boolean {
    return value !== null && value !== undefined && value !== '';
  }

  private transformToTradeData(
    result: AddPositionDialogResult,
    accountId: string
  ): Omit<Trade, 'id'> & { id: string } {
    // Note: validateDialogResult ensures these fields are defined
    return {
      id: 'new',
      universeId: result.universeId!,
      quantity: result.quantity!,
      buy: result.price!,
      buy_date: result.purchase_date!,
      sell: 0,
      accountId,
    };
  }

  private addPositionToTrades(
    tradeData: Omit<Trade, 'id'> & { id: string },
    trades: Signal<Trade[]>,
    currentAccount: Signal<CurrentAccount>
  ): void {
    const tradesArray = trades() as SmartArray;

    try {
      tradesArray.add!(tradeData, currentAccount());
      this.successMessage.set('Position added successfully');
      const service = this;
      const clearSuccessMessage = function clearSuccessMessage(): void {
        service.successMessage.set('');
      };
      setTimeout(clearSuccessMessage, 3000);
    } catch (error: unknown) {
      const err = error as Error;
      this.errorMessage.set(`Failed to add position: ${err.message}`);
    }
  }
}
