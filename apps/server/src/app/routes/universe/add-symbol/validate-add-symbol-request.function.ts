interface AddSymbolRequest {
  symbol: string;
  risk_group_id: string;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

function validateSymbol(symbol: unknown, errors: string[]): void {
  if (symbol === undefined || symbol === null || typeof symbol !== 'string') {
    errors.push('Symbol is required and must be a string');
    return;
  }

  const symbolRegex = /^[A-Z]{1,5}$/;
  if (!symbolRegex.test(symbol)) {
    errors.push('Symbol must be 1-5 uppercase letters only');
  }
}

function validateRiskGroupId(riskGroupId: unknown, errors: string[]): void {
  if (
    riskGroupId === undefined ||
    riskGroupId === null ||
    typeof riskGroupId !== 'string'
  ) {
    errors.push('Risk group ID is required and must be a string');
    return;
  }

  if (riskGroupId.trim().length === 0) {
    errors.push('Risk group ID cannot be empty');
  }
}

export function validateAddSymbolRequest(request: unknown): ValidationResult {
  const errors: string[] = [];

  if (
    request === null ||
    request === undefined ||
    typeof request !== 'object'
  ) {
    errors.push('Request body is required');
    return { isValid: false, errors };
  }

  const { symbol, risk_group_id } = request as Partial<AddSymbolRequest>;

  validateSymbol(symbol, errors);
  validateRiskGroupId(risk_group_id, errors);

  return {
    isValid: errors.length === 0,
    errors,
  };
}
