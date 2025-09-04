/* eslint-disable @typescript-eslint/unbound-method -- Test mocking requires unbound methods */
import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { FastifyRequest, FastifyReply } from 'fastify';
import { tracingMiddleware, captureDBQuery, captureHTTPCall } from './tracing';

// Mock the structured logger
vi.mock('../utils/structured-logger', () => ({
  logger: {
    setContextAsync: vi.fn((context, callback) => callback()),
    getContext: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    performance: vi.fn(),
  },
}));

import { logger } from '../utils/structured-logger';

describe('Tracing Middleware', () => {
  let mockRequest: Partial<FastifyRequest>;
  let mockReply: Partial<FastifyReply>;
  let loggerSpy: {
    setContextAsync: Mock<unknown[], unknown>;
    getContext: Mock<unknown[], unknown>;
    info: Mock<unknown[], unknown>;
    error: Mock<unknown[], unknown>;
    debug: Mock<unknown[], unknown>;
    performance: Mock<unknown[], unknown>;
  };

  beforeEach(() => {
    loggerSpy = {
      setContextAsync: vi.mocked(logger.setContextAsync) as Mock<
        unknown[],
        unknown
      >,
      getContext: vi.mocked(logger.getContext) as Mock<unknown[], unknown>,
      info: vi.mocked(logger.info) as Mock<unknown[], unknown>,
      error: vi.mocked(logger.error) as Mock<unknown[], unknown>,
      debug: vi.mocked(logger.debug) as Mock<unknown[], unknown>,
      performance: vi.mocked(logger.performance) as Mock<unknown[], unknown>,
    };

    // Clear all mocks
    Object.values(loggerSpy).forEach((spy) => spy.mockClear());

    mockRequest = {
      id: 'req-123',
      method: 'GET',
      url: '/api/test',
      headers: {
        'user-agent': 'test-agent',
        'x-amzn-trace-id': 'Root=1-67891234-abcdef123456789012345678',
      },
      ip: '127.0.0.1',
    };

    mockReply = {
      statusCode: 200,
    };
  });

  describe('tracingMiddleware', () => {
    it('should create tracing context and log request start', async () => {
      await tracingMiddleware(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      expect(loggerSpy.setContextAsync).toHaveBeenCalledTimes(1);
      expect(loggerSpy.info).toHaveBeenCalledWith(
        'Request started: GET /api/test',
        expect.objectContaining({
          method: 'GET',
          url: '/api/test',
          userAgent: 'test-agent',
          ipAddress: '127.0.0.1',
        })
      );

      // Check that context was set with correct values
      const contextCall = loggerSpy.setContextAsync.mock.calls[0][0];
      expect(contextCall).toMatchObject({
        requestId: 'req-123',
        traceId: expect.stringContaining('Root=1-'),
        userAgent: 'test-agent',
        ipAddress: '127.0.0.1',
      });
    });

    it('should handle requests with authorization header', async () => {
      mockRequest.headers!.authorization = 'Bearer test-token';

      await tracingMiddleware(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      const contextCall = loggerSpy.setContextAsync.mock.calls[0][0];
      expect(contextCall.userId).toBeDefined();
    });

    it('should handle requests with session information', async () => {
      mockRequest.headers!['x-session-id'] = 'session-123';

      await tracingMiddleware(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      const contextCall = loggerSpy.setContextAsync.mock.calls[0][0];
      expect(contextCall.sessionId).toBe('session-123');
    });

    it('should extract session ID from cookies', async () => {
      mockRequest.headers!.cookie = 'sessionId=cookie-session-456; other=value';

      await tracingMiddleware(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      const contextCall = loggerSpy.setContextAsync.mock.calls[0][0];
      expect(contextCall.sessionId).toBe('cookie-session-456');
    });

    it('should generate trace ID when not provided', async () => {
      delete mockRequest.headers!['x-amzn-trace-id'];

      await tracingMiddleware(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      const contextCall = loggerSpy.setContextAsync.mock.calls[0][0];
      expect(contextCall.traceId).toMatch(/^Root=1-[0-9a-f]{8}-[0-9a-f]{24}$/);
    });
  });

  describe('captureDBQuery', () => {
    it('should create and return query tracer with close method', () => {
      const tracer = captureDBQuery('SELECT * FROM users WHERE id = ?', [123]);

      expect(tracer).toHaveProperty('close');
      expect(typeof tracer.close).toBe('function');
    });

    it('should log query start and completion', () => {
      loggerSpy.getContext.mockReturnValue({ requestId: 'req-123' });

      const tracer = captureDBQuery('SELECT * FROM users WHERE id = ?', [123]);

      expect(loggerSpy.debug).toHaveBeenCalledWith(
        'Database query started',
        expect.objectContaining({
          queryType: 'SELECT',
          hasParams: true,
          queryLength: expect.any(Number),
        })
      );

      // Mock process.hrtime for performance testing
      const originalHrtime = process.hrtime;
      process.hrtime = vi.fn(() => [0, 1000000]); // 1ms

      tracer.close(undefined, 5);

      expect(loggerSpy.performance).toHaveBeenCalledWith(
        'Database query completed',
        expect.any(Array),
        expect.objectContaining({
          queryType: 'SELECT',
          rowCount: 5,
        })
      );

      process.hrtime = originalHrtime;
    });

    it('should handle query errors', () => {
      loggerSpy.getContext.mockReturnValue({ requestId: 'req-123' });

      const tracer = captureDBQuery('INSERT INTO users (name) VALUES (?)', [
        'test',
      ]);
      const testError = new Error('Database connection failed');

      tracer.close(testError);

      expect(loggerSpy.error).toHaveBeenCalledWith(
        'Database query failed',
        testError,
        expect.objectContaining({
          queryType: 'INSERT',
        })
      );
    });

    it('should work without active tracing context', () => {
      loggerSpy.getContext.mockReturnValue(undefined);

      const tracer = captureDBQuery('SELECT 1');

      expect(() => tracer.close()).not.toThrow();
      expect(loggerSpy.performance).toHaveBeenCalledWith(
        'Database query completed (no tracing)',
        expect.any(Array),
        expect.objectContaining({
          queryType: 'SELECT',
        })
      );
    });
  });

  describe('captureHTTPCall', () => {
    it('should create and return HTTP call tracer', () => {
      const tracer = captureHTTPCall('https://api.example.com', 'POST');

      expect(tracer).toHaveProperty('close');
      expect(typeof tracer.close).toBe('function');
    });

    it('should log HTTP call start and completion', () => {
      loggerSpy.getContext.mockReturnValue({ requestId: 'req-123' });

      const tracer = captureHTTPCall('https://api.example.com/users', 'GET');

      expect(loggerSpy.debug).toHaveBeenCalledWith('HTTP call started', {
        url: 'https://api.example.com/users',
        method: 'GET',
      });

      // Mock process.hrtime for performance testing
      const originalHrtime = process.hrtime;
      process.hrtime = vi.fn(() => [0, 5000000]); // 5ms

      tracer.close(undefined, 200);

      expect(loggerSpy.performance).toHaveBeenCalledWith(
        'HTTP call completed',
        expect.any(Array),
        expect.objectContaining({
          url: 'https://api.example.com/users',
          method: 'GET',
          statusCode: 200,
        })
      );

      process.hrtime = originalHrtime;
    });

    it('should handle HTTP call errors', () => {
      loggerSpy.getContext.mockReturnValue({ requestId: 'req-123' });

      const tracer = captureHTTPCall('https://api.example.com/users', 'POST');
      const testError = new Error('Network timeout');

      tracer.close(testError);

      expect(loggerSpy.error).toHaveBeenCalledWith(
        'HTTP call failed',
        testError,
        expect.objectContaining({
          url: 'https://api.example.com/users',
          method: 'POST',
        })
      );
    });

    it('should default to GET method when not specified', () => {
      loggerSpy.getContext.mockReturnValue({ requestId: 'req-123' });

      const tracer = captureHTTPCall('https://api.example.com');
      tracer.close(undefined, 200);

      expect(loggerSpy.debug).toHaveBeenCalledWith('HTTP call started', {
        url: 'https://api.example.com',
        method: 'GET',
      });
    });

    it('should work without active tracing context', () => {
      loggerSpy.getContext.mockReturnValue(undefined);

      const tracer = captureHTTPCall('https://api.example.com');

      expect(() => tracer.close(undefined, 200)).not.toThrow();
      expect(loggerSpy.performance).toHaveBeenCalledWith(
        'HTTP call completed (no tracing)',
        expect.any(Array),
        expect.objectContaining({
          url: 'https://api.example.com',
          method: 'GET',
          statusCode: 200,
        })
      );
    });
  });

  describe('User and session extraction', () => {
    it('should extract user ID from Bearer token', async () => {
      mockRequest.headers!.authorization = 'Bearer eyJhbGciOiJIUzI1NiJ9';

      await tracingMiddleware(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      const contextCall = loggerSpy.setContextAsync.mock.calls[0][0];
      expect(contextCall.userId).toMatch(/^user-/);
    });

    it('should handle malformed authorization headers', async () => {
      mockRequest.headers!.authorization = 'Invalid token format';

      await tracingMiddleware(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      const contextCall = loggerSpy.setContextAsync.mock.calls[0][0];
      expect(contextCall.userId).toBeUndefined();
    });

    it('should prioritize x-session-id header over cookies', async () => {
      mockRequest.headers!['x-session-id'] = 'header-session';
      mockRequest.headers!.cookie = 'sessionId=cookie-session';

      await tracingMiddleware(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      const contextCall = loggerSpy.setContextAsync.mock.calls[0][0];
      expect(contextCall.sessionId).toBe('header-session');
    });
  });
});
