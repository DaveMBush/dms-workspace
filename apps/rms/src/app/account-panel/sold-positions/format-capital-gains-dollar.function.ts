import { isValidNumber } from './is-valid-number.function';

/**
 * Format capital gains dollar amount for display
 */
export function formatCapitalGainsDollar(amount: number): string {
  if (!isValidNumber(amount)) {
    return '$0.00';
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(amount);
}
