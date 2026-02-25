import { ValidationWarning } from './validation-warning.interface';

/**
 * Checks if the total amount matches quantity * price.
 * Returns a warning if there is a significant mismatch.
 */
export function checkAmountMismatch(
  quantity: number,
  price: number,
  amount: number,
  row: number
): ValidationWarning | null {
  const expected = quantity * price;
  const tolerance = 0.01;

  if (Math.abs(Math.abs(amount) - expected) > tolerance) {
    return {
      row,
      message: `Amount ($${amount}) doesn't match quantity (${quantity}) × price ($${price}) = $${expected}`,
    };
  }

  return null;
}
