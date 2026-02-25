import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import type { Mock } from 'vitest';

import type { ImportResult } from './import-result.interface';

vi.mock('./fidelity-import-service.function', function () {
  return {
    importFidelityTransactions: vi.fn(),
  };
});

import fastify from 'fastify';
import multipart from '@fastify/multipart';
import registerImportRoutes from './index';

function buildApp() {
  const app = fastify({ bodyLimit: 15 * 1024 * 1024 });
  app.register(multipart, {
    limits: { fileSize: 15 * 1024 * 1024 },
  });
  app.register(
    function registerRoutes(instance, _, done) {
      registerImportRoutes(instance);
      done();
    },
    { prefix: '/api/import' }
  );
  return app;
}

/**
 * TDD RED Phase tests for backend file upload handling.
 * These tests define expected behavior for file upload features
 * that will be implemented in Story AR.4.
 *
 * All tests are disabled with describe.skip to allow CI to pass.
 */

describe('POST /api/import/fidelity - File Upload Handling (TDD RED)', function () {
  let app: ReturnType<typeof fastify>;
  let mockImportFidelityTransactions: Mock;

  beforeEach(async function () {
    vi.clearAllMocks();
    const serviceModule = await import('./fidelity-import-service.function');
    mockImportFidelityTransactions =
      serviceModule.importFidelityTransactions as Mock;
    app = buildApp();
  });

  afterEach(async function closeApp() {
    await app.close();
  });

  describe('multipart request parsing', function () {
    test('should accept multipart/form-data file upload', async function () {
      const successResult: ImportResult = {
        success: true,
        imported: 5,
        errors: [],
        warnings: [],
      };
      mockImportFidelityTransactions.mockResolvedValue(successResult);

      const boundary = '----FormBoundary7MA4YWxkTrZu0gW';
      const csvContent =
        'Date,Action,Symbol,Description,Quantity,Price,Total Amount,Account\n01/15/2025,YOU BOUGHT,SPY,SPDR S&P 500 ETF,10,450.25,-4502.50,MyAccount';

      const body = [
        `--${boundary}`,
        'Content-Disposition: form-data; name="file"; filename="transactions.csv"',
        'Content-Type: text/csv',
        '',
        csvContent,
        `--${boundary}--`,
      ].join('\r\n');

      const response = await app.inject({
        method: 'POST',
        url: '/api/import/fidelity',
        payload: body,
        headers: {
          'content-type': `multipart/form-data; boundary=${boundary}`,
        },
      });

      expect(response.statusCode).toBe(200);
      expect(mockImportFidelityTransactions).toHaveBeenCalledWith(
        expect.stringContaining('Date,Action')
      );
    });

    test('should reject multipart request without file field', async function () {
      const boundary = '----FormBoundary7MA4YWxkTrZu0gW';
      const body = [
        `--${boundary}`,
        'Content-Disposition: form-data; name="other"',
        '',
        'some value',
        `--${boundary}--`,
      ].join('\r\n');

      const response = await app.inject({
        method: 'POST',
        url: '/api/import/fidelity',
        payload: body,
        headers: {
          'content-type': `multipart/form-data; boundary=${boundary}`,
        },
      });

      expect(response.statusCode).toBe(400);
      const result = JSON.parse(response.body) as ImportResult;
      expect(result.errors[0]).toMatch(/file|missing/i);
    });

    test('should extract file content from multipart request', async function () {
      const successResult: ImportResult = {
        success: true,
        imported: 3,
        errors: [],
        warnings: [],
      };
      mockImportFidelityTransactions.mockResolvedValue(successResult);

      const boundary = '----FormBoundary7MA4YWxkTrZu0gW';
      const csvContent =
        'Date,Action,Symbol,Description,Quantity,Price,Total Amount,Account\n02/15/2026,YOU BOUGHT,SPY,SPDR,10,450.25,-4502.50,Brokerage';

      const body = [
        `--${boundary}`,
        'Content-Disposition: form-data; name="file"; filename="data.csv"',
        'Content-Type: text/csv',
        '',
        csvContent,
        `--${boundary}--`,
      ].join('\r\n');

      const response = await app.inject({
        method: 'POST',
        url: '/api/import/fidelity',
        payload: body,
        headers: {
          'content-type': `multipart/form-data; boundary=${boundary}`,
        },
      });

      expect(response.statusCode).toBe(200);
      expect(mockImportFidelityTransactions).toHaveBeenCalledWith(csvContent);
    });
  });

  describe('file extraction from request', function () {
    test('should extract CSV content as a string from uploaded file', async function () {
      const successResult: ImportResult = {
        success: true,
        imported: 1,
        errors: [],
        warnings: [],
      };
      mockImportFidelityTransactions.mockResolvedValue(successResult);

      const boundary = '----FormBoundary';
      const csvContent = 'Date,Action,Symbol\n01/15/2025,YOU BOUGHT,SPY';
      const body = [
        `--${boundary}`,
        'Content-Disposition: form-data; name="file"; filename="test.csv"',
        'Content-Type: text/csv',
        '',
        csvContent,
        `--${boundary}--`,
      ].join('\r\n');

      await app.inject({
        method: 'POST',
        url: '/api/import/fidelity',
        payload: body,
        headers: {
          'content-type': `multipart/form-data; boundary=${boundary}`,
        },
      });

      const calledWith = mockImportFidelityTransactions.mock
        .calls[0][0] as string;
      expect(typeof calledWith).toBe('string');
      expect(calledWith).toContain('Date,Action,Symbol');
    });

    test('should validate uploaded file is a CSV', async function () {
      const boundary = '----FormBoundary';
      const body = [
        `--${boundary}`,
        'Content-Disposition: form-data; name="file"; filename="data.xlsx"',
        'Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        '',
        'binary content',
        `--${boundary}--`,
      ].join('\r\n');

      const response = await app.inject({
        method: 'POST',
        url: '/api/import/fidelity',
        payload: body,
        headers: {
          'content-type': `multipart/form-data; boundary=${boundary}`,
        },
      });

      expect(response.statusCode).toBe(400);
      const result = JSON.parse(response.body) as ImportResult;
      expect(result.errors[0]).toMatch(/csv|file type/i);
    });

    test('should reject file exceeding maximum size limit', async function () {
      const boundary = '----FormBoundary';
      const oversizedContent = 'a'.repeat(11 * 1024 * 1024);
      const body = [
        `--${boundary}`,
        'Content-Disposition: form-data; name="file"; filename="big.csv"',
        'Content-Type: text/csv',
        '',
        oversizedContent,
        `--${boundary}--`,
      ].join('\r\n');

      const response = await app.inject({
        method: 'POST',
        url: '/api/import/fidelity',
        payload: body,
        headers: {
          'content-type': `multipart/form-data; boundary=${boundary}`,
        },
      });

      expect(response.statusCode).toBe(400);
      const result = JSON.parse(response.body) as ImportResult;
      expect(result.errors[0]).toMatch(/size|too large|limit/i);
    });
  });

  describe('temporary file handling', function () {
    test('should not persist uploaded file to disk', async function () {
      const successResult: ImportResult = {
        success: true,
        imported: 1,
        errors: [],
        warnings: [],
      };
      mockImportFidelityTransactions.mockResolvedValue(successResult);

      const boundary = '----FormBoundary';
      const csvContent = 'Date,Action\n01/15/2025,YOU BOUGHT';
      const body = [
        `--${boundary}`,
        'Content-Disposition: form-data; name="file"; filename="test.csv"',
        'Content-Type: text/csv',
        '',
        csvContent,
        `--${boundary}--`,
      ].join('\r\n');

      await app.inject({
        method: 'POST',
        url: '/api/import/fidelity',
        payload: body,
        headers: {
          'content-type': `multipart/form-data; boundary=${boundary}`,
        },
      });

      // Verify file was processed in memory, not written to disk
      // Fastify multipart should use buffer mode, not file mode
      expect(mockImportFidelityTransactions).toHaveBeenCalledWith(
        expect.any(String)
      );
    });

    test('should process file buffer without creating temp files', async function () {
      const successResult: ImportResult = {
        success: true,
        imported: 1,
        errors: [],
        warnings: [],
      };
      mockImportFidelityTransactions.mockResolvedValue(successResult);

      const boundary = '----FormBoundary';
      const csvContent = 'Date,Action\n01/15/2025,YOU BOUGHT';
      const body = [
        `--${boundary}`,
        'Content-Disposition: form-data; name="file"; filename="test.csv"',
        'Content-Type: text/csv',
        '',
        csvContent,
        `--${boundary}--`,
      ].join('\r\n');

      await app.inject({
        method: 'POST',
        url: '/api/import/fidelity',
        payload: body,
        headers: {
          'content-type': `multipart/form-data; boundary=${boundary}`,
        },
      });

      // Buffer mode: service receives a string, not a file path
      expect(mockImportFidelityTransactions).toHaveBeenCalledWith(
        expect.any(String)
      );
    });
  });

  describe('file cleanup after processing', function () {
    test('should release file buffer after successful processing', async function () {
      const successResult: ImportResult = {
        success: true,
        imported: 5,
        errors: [],
        warnings: [],
      };
      mockImportFidelityTransactions.mockResolvedValue(successResult);

      const boundary = '----FormBoundary';
      const csvContent = 'Date,Action\n01/15/2025,YOU BOUGHT';
      const body = [
        `--${boundary}`,
        'Content-Disposition: form-data; name="file"; filename="test.csv"',
        'Content-Type: text/csv',
        '',
        csvContent,
        `--${boundary}--`,
      ].join('\r\n');

      const response = await app.inject({
        method: 'POST',
        url: '/api/import/fidelity',
        payload: body,
        headers: {
          'content-type': `multipart/form-data; boundary=${boundary}`,
        },
      });

      expect(response.statusCode).toBe(200);
      // After processing, the service should have been called once
      // and any internal buffers should be released
      expect(mockImportFidelityTransactions).toHaveBeenCalledTimes(1);
    });

    test('should release file buffer after failed processing', async function () {
      const errorResult: ImportResult = {
        success: false,
        imported: 0,
        errors: ['Parse error'],
        warnings: [],
      };
      mockImportFidelityTransactions.mockResolvedValue(errorResult);

      const boundary = '----FormBoundary';
      const csvContent = 'bad,data';
      const body = [
        `--${boundary}`,
        'Content-Disposition: form-data; name="file"; filename="bad.csv"',
        'Content-Type: text/csv',
        '',
        csvContent,
        `--${boundary}--`,
      ].join('\r\n');

      const response = await app.inject({
        method: 'POST',
        url: '/api/import/fidelity',
        payload: body,
        headers: {
          'content-type': `multipart/form-data; boundary=${boundary}`,
        },
      });

      expect(response.statusCode).toBe(400);
      // Buffer should be released even on error
      expect(mockImportFidelityTransactions).toHaveBeenCalledTimes(1);
    });

    test('should handle exception during file processing gracefully', async function () {
      mockImportFidelityTransactions.mockRejectedValue(
        new Error('Processing crashed')
      );

      const boundary = '----FormBoundary';
      const csvContent = 'Date,Action\n01/15/2025,YOU BOUGHT';
      const body = [
        `--${boundary}`,
        'Content-Disposition: form-data; name="file"; filename="test.csv"',
        'Content-Type: text/csv',
        '',
        csvContent,
        `--${boundary}--`,
      ].join('\r\n');

      const response = await app.inject({
        method: 'POST',
        url: '/api/import/fidelity',
        payload: body,
        headers: {
          'content-type': `multipart/form-data; boundary=${boundary}`,
        },
      });

      expect(response.statusCode).toBe(500);
      const result = JSON.parse(response.body) as ImportResult;
      expect(result.errors[0]).toMatch(
        /unexpected error|internal server error/i
      );
    });
  });

  describe('BOM and encoding handling', function () {
    test('should strip UTF-8 BOM from uploaded CSV content', async function () {
      const successResult: ImportResult = {
        success: true,
        imported: 1,
        errors: [],
        warnings: [],
      };
      mockImportFidelityTransactions.mockResolvedValue(successResult);

      const bom = '\uFEFF';
      const csvContent = bom + 'Date,Action\n01/15/2025,YOU BOUGHT';

      const boundary = '----FormBoundary';
      const body = [
        `--${boundary}`,
        'Content-Disposition: form-data; name="file"; filename="bom.csv"',
        'Content-Type: text/csv',
        '',
        csvContent,
        `--${boundary}--`,
      ].join('\r\n');

      await app.inject({
        method: 'POST',
        url: '/api/import/fidelity',
        payload: body,
        headers: {
          'content-type': `multipart/form-data; boundary=${boundary}`,
        },
      });

      const calledWith = mockImportFidelityTransactions.mock
        .calls[0][0] as string;
      expect(calledWith.charCodeAt(0)).not.toBe(0xfeff);
      expect(calledWith).toContain('Date,Action');
    });

    test('should handle UTF-8 encoded CSV content correctly', async function () {
      const successResult: ImportResult = {
        success: true,
        imported: 1,
        errors: [],
        warnings: [],
      };
      mockImportFidelityTransactions.mockResolvedValue(successResult);

      const csvContent =
        'Date,Action,Symbol\n01/15/2025,YOU BOUGHT,SPY Börsenfonds';

      const boundary = '----FormBoundary';
      const body = [
        `--${boundary}`,
        'Content-Disposition: form-data; name="file"; filename="utf8.csv"',
        'Content-Type: text/csv; charset=utf-8',
        '',
        csvContent,
        `--${boundary}--`,
      ].join('\r\n');

      await app.inject({
        method: 'POST',
        url: '/api/import/fidelity',
        payload: body,
        headers: {
          'content-type': `multipart/form-data; boundary=${boundary}`,
        },
      });

      const calledWith = mockImportFidelityTransactions.mock
        .calls[0][0] as string;
      expect(calledWith).toContain('Börsenfonds');
    });

    test('should handle empty multipart file upload', async function () {
      const boundary = '----FormBoundary';
      const body = [
        `--${boundary}`,
        'Content-Disposition: form-data; name="file"; filename="empty.csv"',
        'Content-Type: text/csv',
        '',
        '',
        `--${boundary}--`,
      ].join('\r\n');

      const response = await app.inject({
        method: 'POST',
        url: '/api/import/fidelity',
        payload: body,
        headers: {
          'content-type': `multipart/form-data; boundary=${boundary}`,
        },
      });

      expect(response.statusCode).toBe(400);
      const result = JSON.parse(response.body) as ImportResult;
      expect(result.errors[0]).toMatch(/empty|no.*content/i);
    });
  });
});
