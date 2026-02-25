interface PriceValidationFailure {
  valid: false;
  error: string;
}

interface PriceValidationSuccess {
  valid: true;
}

/**
 * Validates that a price value is a valid positive number.
 * For purchases and sales, zero is not accepted.
 */
export function validatePrice(
  price: number,
  transactionType?: string
): PriceValidationFailure | PriceValidationSuccess {
  if (isNaN(price)) {
    return { valid: false, error: 'Price must be a number' };
  }
  if (price < 0) {
    return {
      valid: false,
      error: `Price must be a positive number. Found: ${price}`,
    };
  }
  if (
    price === 0 &&
    (transactionType === 'purchase' || transactionType === 'sale')
  ) {
    return {
      valid: false,
      error: 'Price must be a positive number for purchases and sales',
    };
  }
  return { valid: true };
}
