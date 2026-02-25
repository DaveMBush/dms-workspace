interface QuantityValidationFailure {
  valid: false;
  error: string;
}

interface QuantityValidationSuccess {
  valid: true;
}

/**
 * Validates that a quantity value is a valid positive number.
 * For purchases and sales, zero is not accepted.
 */
export function validateQuantity(
  quantity: number,
  transactionType?: string
): QuantityValidationFailure | QuantityValidationSuccess {
  if (isNaN(quantity)) {
    return { valid: false, error: 'Quantity must be a number' };
  }
  if (quantity < 0) {
    return {
      valid: false,
      error: `Quantity must be a positive number. Found: ${quantity}`,
    };
  }
  if (
    quantity === 0 &&
    (transactionType === 'purchase' || transactionType === 'sale')
  ) {
    return {
      valid: false,
      error: 'Quantity must be a positive number for purchases and sales',
    };
  }
  return { valid: true };
}
