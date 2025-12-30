import type { CapitalGainsResult } from './capital-gains-result.interface';
import { isValidNumber } from './is-valid-number.function';
import type { TradeData } from './trade-data.interface';

/**
 * Safely calculates capital gains dollar amount and percentage
 * Handles edge cases like zero buy price, negative values, and invalid inputs
 */
export function calculateCapitalGains(trade: TradeData): CapitalGainsResult {
  // Validate inputs
  if (
    !isValidNumber(trade.buy) ||
    !isValidNumber(trade.sell) ||
    !isValidNumber(trade.quantity)
  ) {
    return { capitalGain: 0, capitalGainPercentage: 0 };
  }

  // Calculate dollar amount: (sell_price - buy_price) * quantity
  const capitalGain = (trade.sell - trade.buy) * trade.quantity;

  // Calculate percentage: ((sell_price - buy_price) / buy_price) * 100
  let capitalGainPercentage: number;

  if (trade.buy === 0) {
    // Special case: when buy price is 0, percentage is undefined
    // Return 0 instead of Infinity for display purposes
    capitalGainPercentage = 0;
  } else {
    capitalGainPercentage = ((trade.sell - trade.buy) / trade.buy) * 100;
  }

  // Ensure results are valid numbers
  return {
    capitalGain: isValidNumber(capitalGain) ? capitalGain : 0,
    capitalGainPercentage: isValidNumber(capitalGainPercentage)
      ? capitalGainPercentage
      : 0,
  };
}
