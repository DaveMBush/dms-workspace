import { FidelityCsvRow } from './fidelity-csv-row.interface';
import { formatValidationError } from './format-validation-error.function';
import { validateAction } from './validate-action.function';
import { validateAmount } from './validate-amount.function';
import { validateDate } from './validate-date.function';
import { validatePrice } from './validate-price.function';
import { validateQuantity } from './validate-quantity.function';
import { validateSymbol } from './validate-symbol.function';
import { ValidationError } from './validation-error.interface';

/**
 * Maps a Fidelity action string to a transaction type for numeric validation.
 */
function mapTransactionType(action: string): string | undefined {
  if (action === 'YOU BOUGHT') {
    return 'purchase';
  }
  if (action === 'YOU SOLD') {
    return 'sale';
  }
  return undefined;
}

/**
 * Validates all fields of a single transaction row.
 * Collects all errors (does not stop at the first error).
 */
export function validateRow(
  row: FidelityCsvRow,
  rowNumber: number
): ValidationError[] {
  const errors: ValidationError[] = [];

  const dateResult = validateDate(row.date);
  if (!dateResult.valid) {
    errors.push(formatValidationError(rowNumber, 'date', dateResult.error));
  }

  const actionResult = validateAction(row.action);
  if (!actionResult.valid) {
    errors.push(formatValidationError(rowNumber, 'action', actionResult.error));
  }

  const symbolResult = validateSymbol(row.symbol);
  if (!symbolResult.valid) {
    errors.push(formatValidationError(rowNumber, 'symbol', symbolResult.error));
  }

  const txType = mapTransactionType(row.action);

  const quantityResult = validateQuantity(row.quantity, txType);
  if (!quantityResult.valid) {
    errors.push(
      formatValidationError(rowNumber, 'quantity', quantityResult.error)
    );
  }

  const priceResult = validatePrice(row.price, txType);
  if (!priceResult.valid) {
    errors.push(formatValidationError(rowNumber, 'price', priceResult.error));
  }

  const amountResult = validateAmount(row.totalAmount);
  if (!amountResult.valid) {
    errors.push(
      formatValidationError(rowNumber, 'totalAmount', amountResult.error)
    );
  }

  return errors;
}
