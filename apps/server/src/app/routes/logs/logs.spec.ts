import {
  describe,
  test,
  expect,
  beforeEach,
  afterEach,
  vi,
} from 'vitest';
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import fastify, { FastifyInstance } from 'fastify';

import registerLogsRoutes from './index';

const testLogsDir = join(process.cwd(), 'test-logs');

function setupTestLogs(): void {
  if (existsSync(testLogsDir)) {
    rmSync(testLogsDir, { recursive: true, force: true });
  }
  mkdirSync(testLogsDir, { recursive: true });

  // Create test log files
  const log1 = [
    '{"timestamp":"2025-09-23T10:00:00.000Z","correlationId":"test-id-1","level":"error","message":"Test error message","service":"rms-backend","environment":"test"}',
    '{"timestamp":"2025-09-23T09:00:00.000Z","correlationId":"test-id-2","level":"warn","message":"Test warning message","service":"rms-backend","environment":"test"}',
    '{"timestamp":"2025-09-23T08:00:00.000Z","correlationId":"test-id-3","level":"info","message":"Test info message","service":"rms-backend","environment":"test"}',
  ].join('\n');

  const log2 = [
    '{"timestamp":"2025-09-23T11:00:00.000Z","correlationId":"test-id-4","level":"error","message":"Another error message","service":"rms-backend","environment":"test","data":{"key":"value"}}',
  ].join('\n');

  writeFileSync(join(testLogsDir, 'test1.log'), log1);
  writeFileSync(join(testLogsDir, 'test2.log'), log2);
}

function cleanupTestLogs(): void {
  if (existsSync(testLogsDir)) {
    rmSync(testLogsDir, { recursive: true, force: true });
  }
}

describe('Logs API', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    // Mock process.cwd to point to test directory
    vi.spyOn(process, 'cwd').mockReturnValue(testLogsDir.replace('/test-logs', ''));

    setupTestLogs();

    app = fastify();
    registerLogsRoutes(app);
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
    cleanupTestLogs();
    vi.restoreAllMocks();
  });

  describe('GET /logs/errors', () => {
    test('should return error logs with default pagination', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/logs/errors',
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);

      expect(data).toHaveProperty('logs');
      expect(data).toHaveProperty('totalCount');
      expect(data).toHaveProperty('currentPage');
      expect(data).toHaveProperty('totalPages');

      expect(data.logs).toBeInstanceOf(Array);
      expect(data.logs.length).toBeGreaterThan(0);
      expect(data.currentPage).toBe(1);
    });

    test('should filter logs by level', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/logs/errors?level=error',
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);

      data.logs.forEach(function checkErrorLevel(log: { level: string }) {
        expect(log.level).toBe('error');
      });
    });

    test('should handle pagination parameters', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/logs/errors?page=1&limit=2',
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);

      expect(data.currentPage).toBe(1);
      expect(data.logs.length).toBeLessThanOrEqual(2);
    });

    test('should return 400 for invalid pagination parameters', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/logs/errors?page=0&limit=0',
      });

      expect(response.statusCode).toBe(400);
      const data = JSON.parse(response.payload);
      expect(data).toHaveProperty('error');
    });

    test('should filter logs by search term', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/logs/errors?search=Test%20error',
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);

      data.logs.forEach(function checkSearchTerm(log: { message: string }) {
        expect(log.message.toLowerCase()).toContain('test error');
      });
    });

    test('should handle empty results', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/logs/errors?search=nonexistent',
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);

      expect(data.logs).toHaveLength(0);
      expect(data.totalCount).toBe(0);
    });
  });
});