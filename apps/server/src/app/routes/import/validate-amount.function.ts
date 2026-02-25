interface AmountValidationFailure {
  valid: false;
  error: string;
}

interface AmountValidationSuccess {
  valid: true;
}

/**
 * Validates that an amount is a valid number (can be negative, zero, or positive).
 */
export function validateAmount(
  amount: number
): AmountValidationFailure | AmountValidationSuccess {
  if (isNaN(amount)) {
    return { valid: false, error: 'Amount must be a number' };
  }
  return { valid: true };
}
