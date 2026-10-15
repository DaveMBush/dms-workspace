import { validateAddSymbolRequest } from './validate-add-symbol-request.function';

describe('validateAddSymbolRequest', function () {
  test('should return valid for correct request', function () {
    const request = {
      symbol: 'SPY',
      risk_group_id: 'test-risk-group-id',
    };

    const result = validateAddSymbolRequest(request);

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('should return invalid for missing symbol', function () {
    const request = {
      risk_group_id: 'test-risk-group-id',
    };

    const result = validateAddSymbolRequest(request);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Symbol is required and must be a string');
  });

  test('should return invalid for missing risk_group_id', function () {
    const request = {
      symbol: 'SPY',
    };

    const result = validateAddSymbolRequest(request);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain(
      'Risk group ID is required and must be a string'
    );
  });

  test.each([
    [
      'invalid symbol format',
      'spy',
      'test-risk-group-id',
      'Symbol must be 1-5 uppercase letters only',
    ],
    [
      'symbol too long',
      'TOOLONG',
      'test-risk-group-id',
      'Symbol must be 1-5 uppercase letters only',
    ],
    [
      'symbol with numbers',
      'SPY1',
      'test-risk-group-id',
      'Symbol must be 1-5 uppercase letters only',
    ],
    ['empty risk_group_id', 'SPY', '', 'Risk group ID cannot be empty'],
    [
      'whitespace-only risk_group_id',
      'SPY',
      '   ',
      'Risk group ID cannot be empty',
    ],
  ])(
    'should return invalid for %s',
    (label, symbol, riskGroupId, expectedMessage) => {
      const request = {
        symbol,
        risk_group_id: riskGroupId,
      };

      const result = validateAddSymbolRequest(request);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(expectedMessage);
    }
  );

  test('should return invalid for null request', function () {
    const result = validateAddSymbolRequest(null);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Request body is required');
  });

  test('should return invalid for undefined request', function () {
    const result = validateAddSymbolRequest(undefined);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Request body is required');
  });
});
