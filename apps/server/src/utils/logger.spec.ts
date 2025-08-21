import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { SyncLogger } from './logger';

// Mock fs operations
vi.mock('fs', () => ({
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
  writeFileSync: vi.fn(),
}));

vi.mock('crypto', () => ({
  randomUUID: vi.fn(() => 'test-uuid-123'),
}));

describe('SyncLogger', () => {
  const TEST_UUID = 'test-uuid-123';
  const TEST_TIMESTAMP = '2025-08-21T15:30:45.123Z';
  const TEST_LOG_FILENAME = 'sync-2025-08-21T15-30-45-123Z-test-uuid-123.log';
  
  const mockExistsSync = vi.mocked(existsSync);
  const mockMkdirSync = vi.mocked(mkdirSync);
  const mockWriteFileSync = vi.mocked(writeFileSync);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-08-21T15:30:45.123Z'));
    mockExistsSync.mockReturnValue(true);
  });

  afterEach(() => {
    try {
      vi.useRealTimers();
    } catch {
      // Ignore errors when restoring timers
    }
  });

  function expectLoggerToBeValid(logger: SyncLogger): void {
    expect(logger).toBeDefined();
  }

  test('creates logger with correlation ID and log file path', () => {
    const logger = new SyncLogger();

    expect(logger.getCorrelationId()).toBe(TEST_UUID);
    expect(logger.getLogFilePath()).toBe(
      join(process.cwd(), 'logs', TEST_LOG_FILENAME)
    );
  });

  test('creates logs directory if it does not exist', () => {
    mockExistsSync.mockReturnValueOnce(false);

    const logger = new SyncLogger();
    expectLoggerToBeValid(logger);

    expect(mockMkdirSync).toHaveBeenCalledWith(
      join(process.cwd(), 'logs'),
      { recursive: true }
    );
  });

  test('does not create logs directory if it exists', () => {
    mockExistsSync.mockReturnValue(true);

    const logger = new SyncLogger();
    expectLoggerToBeValid(logger);

    expect(mockMkdirSync).not.toHaveBeenCalled();
  });

  test('writes info log entry', () => {
    const logger = new SyncLogger();

    logger.info('Test message', { key: 'value' });

    expect(mockWriteFileSync).toHaveBeenCalledWith(
      expect.stringContaining(TEST_LOG_FILENAME),
      JSON.stringify({
        timestamp: TEST_TIMESTAMP,
        correlationId: TEST_UUID,
        level: 'info',
        message: 'Test message',
        data: { key: 'value' },
      }) + '\n',
      { flag: 'a' }
    );
  });

  test('writes warn log entry', () => {
    const logger = new SyncLogger();

    logger.warn('Warning message', { warning: true });

    expect(mockWriteFileSync).toHaveBeenCalledWith(
      expect.stringContaining(TEST_LOG_FILENAME),
      JSON.stringify({
        timestamp: TEST_TIMESTAMP,
        correlationId: TEST_UUID,
        level: 'warn',
        message: 'Warning message',
        data: { warning: true },
      }) + '\n',
      { flag: 'a' }
    );
  });

  test('writes error log entry', () => {
    const logger = new SyncLogger();

    logger.error('Error message', { error: 'details' });

    expect(mockWriteFileSync).toHaveBeenCalledWith(
      expect.stringContaining(TEST_LOG_FILENAME),
      JSON.stringify({
        timestamp: TEST_TIMESTAMP,
        correlationId: TEST_UUID,
        level: 'error',
        message: 'Error message',
        data: { error: 'details' },
      }) + '\n',
      { flag: 'a' }
    );
  });

  test('writes log entry without data parameter', () => {
    const logger = new SyncLogger();

    logger.info('Simple message');

    expect(mockWriteFileSync).toHaveBeenCalledWith(
      expect.stringContaining(TEST_LOG_FILENAME),
      JSON.stringify({
        timestamp: TEST_TIMESTAMP,
        correlationId: TEST_UUID,
        level: 'info',
        message: 'Simple message',
        data: undefined,
      }) + '\n',
      { flag: 'a' }
    );
  });

  test('appends to existing log file', () => {
    const logger = new SyncLogger();

    logger.info('First message');
    logger.warn('Second message');

    expect(mockWriteFileSync).toHaveBeenCalledTimes(2);
    expect(mockWriteFileSync).toHaveBeenNthCalledWith(1, expect.any(String), expect.any(String), { flag: 'a' });
    expect(mockWriteFileSync).toHaveBeenNthCalledWith(2, expect.any(String), expect.any(String), { flag: 'a' });
  });
});