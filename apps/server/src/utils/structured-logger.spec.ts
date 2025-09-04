/* eslint-disable @typescript-eslint/unbound-method -- Test mocking requires unbound methods */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StructuredLogger, logger } from './structured-logger';
import type { LogContext } from './structured-logger-types';

// Mock fs and console
vi.mock('fs');

const consoleMock = vi.fn();
const originalConsoleLog = console.log;

describe('StructuredLogger', () => {
  let testLogger: StructuredLogger;

  beforeEach(() => {
    consoleMock.mockClear();
    console.log = consoleMock;
    testLogger = new StructuredLogger('test-service');
  });

  afterEach(() => {
    console.log = originalConsoleLog;
  });

  describe('Basic logging functionality', () => {
    it('should log info messages in structured format', () => {
      testLogger.info('Test message', { key: 'value' });

      expect(consoleMock).toHaveBeenCalledTimes(1);
      const logCall = consoleMock.mock.calls[0][0];
      const logEntry = JSON.parse(logCall);

      expect(logEntry).toMatchObject({
        level: 'info',
        message: 'Test message',
        service: 'test-service',
        data: { key: 'value' },
      });
      expect(logEntry.timestamp).toBeDefined();
      expect(logEntry.correlationId).toBeDefined();
    });

    it('should log warning messages', () => {
      testLogger.warn('Warning message');

      const logCall = consoleMock.mock.calls[0][0];
      const logEntry = JSON.parse(logCall);

      expect(logEntry.level).toBe('warn');
      expect(logEntry.message).toBe('Warning message');
    });

    it('should log error messages with error objects', () => {
      const testError = new Error('Test error');
      testLogger.error('Error occurred', testError, { context: 'test' });

      const logCall = consoleMock.mock.calls[0][0];
      const logEntry = JSON.parse(logCall);

      expect(logEntry.level).toBe('error');
      expect(logEntry.message).toBe('Error occurred');
      expect(logEntry.data.error).toMatchObject({
        name: 'Error',
        message: 'Test error',
        stack: expect.stringContaining('Test error'),
      });
      expect(logEntry.data.context).toBe('test');
    });

    it('should only log debug messages in development', () => {
      const originalEnv = process.env.NODE_ENV;

      // Test debug disabled in production
      process.env.NODE_ENV = 'production';
      const prodLogger = new StructuredLogger('prod-service');
      prodLogger.debug('Debug message');
      expect(consoleMock).not.toHaveBeenCalled();

      // Test debug enabled in development
      process.env.NODE_ENV = 'development';
      const devLogger = new StructuredLogger('dev-service');
      devLogger.debug('Debug message');
      expect(consoleMock).toHaveBeenCalledTimes(1);

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Context management', () => {
    it('should maintain context across synchronous operations', () => {
      const context: LogContext = {
        requestId: 'req-123',
        userId: 'user-456',
      };

      testLogger.setContext(context, () => {
        testLogger.info('Message with context');
      });

      const logCall = consoleMock.mock.calls[0][0];
      const logEntry = JSON.parse(logCall);

      expect(logEntry.context).toMatchObject(context);
      expect(logEntry.correlationId).toBe('req-123');
    });

    it('should maintain context across async operations', async () => {
      const context: LogContext = {
        requestId: 'async-req-123',
        userId: 'async-user-456',
      };

      await testLogger.setContextAsync(context, async () => {
        await new Promise((resolve) => setTimeout(resolve, 1));
        testLogger.info('Async message with context');
      });

      const logCall = consoleMock.mock.calls[0][0];
      const logEntry = JSON.parse(logCall);

      expect(logEntry.context).toMatchObject(context);
    });

    it('should isolate contexts between different calls', () => {
      const context1: LogContext = { requestId: 'req-1' };
      const context2: LogContext = { requestId: 'req-2' };

      testLogger.setContext(context1, () => {
        testLogger.info('Message 1');
      });

      testLogger.setContext(context2, () => {
        testLogger.info('Message 2');
      });

      expect(consoleMock).toHaveBeenCalledTimes(2);

      const log1 = JSON.parse(consoleMock.mock.calls[0][0]);
      const log2 = JSON.parse(consoleMock.mock.calls[1][0]);

      expect(log1.context.requestId).toBe('req-1');
      expect(log2.context.requestId).toBe('req-2');
    });
  });

  describe('Performance logging', () => {
    it('should log performance metrics', () => {
      const startTime = process.hrtime();

      // Simulate some work
      const result = Array.from({ length: 1000 }, (_, i) => i * 2);

      testLogger.performance('Array processing completed', startTime, {
        arrayLength: result.length,
      });

      const logCall = consoleMock.mock.calls[0][0];
      const logEntry = JSON.parse(logCall);

      expect(logEntry.data.performance).toBeDefined();
      expect(logEntry.data.performance.duration).toBeGreaterThan(0);
      expect(logEntry.data.performance.memoryUsage).toBeDefined();
      expect(logEntry.data.arrayLength).toBe(1000);
    });
  });

  describe('Security and business logging', () => {
    it('should log security events with proper markers', () => {
      testLogger.security('failed_login_attempt', {
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
      });

      const logCall = consoleMock.mock.calls[0][0];
      const logEntry = JSON.parse(logCall);

      expect(logEntry.level).toBe('warn');
      expect(logEntry.message).toBe('SECURITY_EVENT: failed_login_attempt');
      expect(logEntry.data.securityEvent).toBe(true);
      expect(logEntry.data.eventType).toBe('failed_login_attempt');
    });

    it('should log business metrics', () => {
      testLogger.business('user_signup', 1, {
        source: 'web',
        campaign: 'summer2024',
      });

      const logCall = consoleMock.mock.calls[0][0];
      const logEntry = JSON.parse(logCall);

      expect(logEntry.message).toBe('BUSINESS_METRIC: user_signup');
      expect(logEntry.data.businessMetric).toBe(true);
      expect(logEntry.data.metricName).toBe('user_signup');
      expect(logEntry.data.metricValue).toBe(1);
    });
  });

  describe('Request logger factory', () => {
    it('should create request-specific loggers', () => {
      const { logger: reqLogger, setContext } =
        StructuredLogger.createRequestLogger(
          'req-factory-123',
          'user-factory-456'
        );

      setContext(() => {
        reqLogger.info('Request scoped message');
      });

      const logCall = consoleMock.mock.calls[0][0];
      const logEntry = JSON.parse(logCall);

      expect(logEntry.context.requestId).toBe('req-factory-123');
      expect(logEntry.context.userId).toBe('user-factory-456');
    });

    it('should support async request logging', async () => {
      const { logger: reqLogger, setContextAsync } =
        StructuredLogger.createRequestLogger('async-req-123');

      await setContextAsync(async () => {
        await new Promise((resolve) => setTimeout(resolve, 1));
        reqLogger.info('Async request message');
      });

      const logCall = consoleMock.mock.calls[0][0];
      const logEntry = JSON.parse(logCall);

      expect(logEntry.context.requestId).toBe('async-req-123');
    });
  });

  describe('Environment-based behavior', () => {
    it('should set correct environment in log entries', () => {
      const originalEnv = process.env.NODE_ENV;

      process.env.NODE_ENV = 'production';
      const prodLogger = new StructuredLogger();
      prodLogger.info('Production message');

      const logCall = consoleMock.mock.calls[0][0];
      const logEntry = JSON.parse(logCall);

      expect(logEntry.environment).toBe('production');

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Singleton logger', () => {
    it('should provide a default singleton logger', () => {
      expect(logger).toBeInstanceOf(StructuredLogger);

      logger.info('Singleton test message');

      expect(consoleMock).toHaveBeenCalledTimes(1);
    });
  });
});
