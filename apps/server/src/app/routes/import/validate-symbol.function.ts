interface SymbolValidationFailure {
  valid: false;
  error: string;
}

interface SymbolValidationSuccess {
  valid: true;
}

/**
 * Validates that a ticker symbol is in an acceptable format.
 * Accepts uppercase alphanumeric characters, plus dots for international symbols.
 */
export function validateSymbol(
  symbol: string
): SymbolValidationFailure | SymbolValidationSuccess {
  if (symbol.trim().length === 0) {
    return { valid: false, error: 'Symbol is required' };
  }
  if (!/^[A-Z0-9]+(?:\.[A-Z0-9]+)*$/.test(symbol)) {
    return {
      valid: false,
      error: `Symbol '${symbol}' has an invalid format. Use uppercase letters and numbers only.`,
    };
  }
  return { valid: true };
}
