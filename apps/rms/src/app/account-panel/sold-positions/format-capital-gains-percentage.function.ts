import { isValidNumber } from './is-valid-number.function';

/**
 * Format capital gains percentage for display
 * Returns "N/A" for edge cases like zero buy price
 */
export function formatCapitalGainsPercentage(
  buyPrice: number,
  percentage: number
): string {
  if (!isValidNumber(buyPrice) || !isValidNumber(percentage)) {
    return 'N/A';
  }

  if (buyPrice === 0) {
    return 'N/A';
  }

  return percentage.toFixed(2) + '%';
}
