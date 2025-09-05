import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { createErrorResponse } from './create-error-response.function';

describe('createErrorResponse', () => {
  beforeEach(() => {
    // Mock Date to have predictable timestamps
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should create error response with all fields', () => {
    const response = createErrorResponse(
      'Unauthorized',
      'Invalid token',
      'request-123'
    );

    expect(response).toEqual({
      error: 'Unauthorized',
      message: 'Invalid token',
      requestId: 'request-123',
      timestamp: '2024-01-01T12:00:00.000Z',
    });
  });

  it('should create error response without requestId', () => {
    const response = createErrorResponse(
      'Bad Request',
      'Missing required field'
    );

    expect(response).toEqual({
      error: 'Bad Request',
      message: 'Missing required field',
      requestId: undefined,
      timestamp: '2024-01-01T12:00:00.000Z',
    });
  });

  it('should include current timestamp', () => {
    const response = createErrorResponse('Error', 'Message');

    expect(response.timestamp).toBe('2024-01-01T12:00:00.000Z');
  });

  it('should handle empty strings', () => {
    const response = createErrorResponse('', '');

    expect(response.error).toBe('');
    expect(response.message).toBe('');
    expect(response.timestamp).toBeTruthy();
  });
});
