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

  test('should return invalid for invalid symbol format', function () {
    const request = {
      symbol: 'spy',
      risk_group_id: 'test-risk-group-id',
    };

    const result = validateAddSymbolRequest(request);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain(
      'Symbol must be 1-5 uppercase letters only'
    );
  });

  test('should return invalid for symbol too long', function () {
    const request = {
      symbol: 'TOOLONG',
      risk_group_id: 'test-risk-group-id',
    };

    const result = validateAddSymbolRequest(request);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain(
      'Symbol must be 1-5 uppercase letters only'
    );
  });

  test('should return invalid for symbol with numbers', function () {
    const request = {
      symbol: 'SPY1',
      risk_group_id: 'test-risk-group-id',
    };

    const result = validateAddSymbolRequest(request);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain(
      'Symbol must be 1-5 uppercase letters only'
    );
  });

  test('should return invalid for empty risk_group_id', function () {
    const request = {
      symbol: 'SPY',
      risk_group_id: '',
    };

    const result = validateAddSymbolRequest(request);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Risk group ID cannot be empty');
  });

  test('should return invalid for whitespace-only risk_group_id', function () {
    const request = {
      symbol: 'SPY',
      risk_group_id: '   ',
    };

    const result = validateAddSymbolRequest(request);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Risk group ID cannot be empty');
  });

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
