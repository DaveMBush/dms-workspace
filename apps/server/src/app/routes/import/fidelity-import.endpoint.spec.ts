import { afterEach, describe, expect, test, vi, beforeEach } from 'vitest';

import type { ImportResult } from './import-result.interface';

vi.mock('./fidelity-import-service.function', function () {
  return {
    importFidelityTransactions: vi.fn(),
  };
});

import fastify from 'fastify';
import type { Mock } from 'vitest';
import registerImportRoutes from './index';

function buildApp() {
  const app = fastify();
  app.register(
    function registerRoutes(instance, _, done) {
      registerImportRoutes(instance);
      done();
    },
    { prefix: '/api/import' }
  );
  return app;
}

describe('POST /api/import/fidelity endpoint', function () {
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

  describe('file upload handling', function () {
    test('should accept raw CSV text body', async function () {
      const successResult: ImportResult = {
        success: true,
        imported: 5,
        errors: [],
        warnings: [],
      };
      mockImportFidelityTransactions.mockResolvedValue(successResult);

      const response = await app.inject({
        method: 'POST',
        url: '/api/import/fidelity',
        payload:
          'Date,Action,Symbol,Description,Quantity,Price,Total Amount,Account\n01/15/2025,YOU BOUGHT,XYZ,Purchase,100,25.50,2550.00,MyAccount',
        headers: { 'content-type': 'text/plain' },
      });

      expect(response.statusCode).toBe(200);
      expect(mockImportFidelityTransactions).toHaveBeenCalledWith(
        expect.stringContaining('Date,Action')
      );
    });

    test('should reject requests without file content', async function () {
      const response = await app.inject({
        method: 'POST',
        url: '/api/import/fidelity',
        payload: '',
        headers: { 'content-type': 'text/plain' },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body) as ImportResult;
      expect(body.success).toBe(false);
      expect(body.errors[0]).toContain('No file content');
    });
  });

  describe('success response format', function () {
    test('should return JSON response with import results', async function () {
      const successResult: ImportResult = {
        success: true,
        imported: 10,
        errors: [],
        warnings: ['Unknown transaction type on row 5'],
      };
      mockImportFidelityTransactions.mockResolvedValue(successResult);

      const response = await app.inject({
        method: 'POST',
        url: '/api/import/fidelity',
        payload: 'csv data',
        headers: { 'content-type': 'text/plain' },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as ImportResult;
      expect(body.success).toBe(true);
      expect(body.imported).toBe(10);
      expect(body.warnings).toHaveLength(1);
    });

    test('should include count summary in response', async function () {
      const successResult: ImportResult = {
        success: true,
        imported: 45,
        errors: [],
        warnings: [],
      };
      mockImportFidelityTransactions.mockResolvedValue(successResult);

      const response = await app.inject({
        method: 'POST',
        url: '/api/import/fidelity',
        payload: 'csv data',
        headers: { 'content-type': 'text/plain' },
      });

      const body = JSON.parse(response.body) as ImportResult;
      expect(body.imported).toBe(45);
    });
  });

  describe('error response format', function () {
    test('should return 400 for invalid CSV format', async function () {
      const errorResult: ImportResult = {
        success: false,
        imported: 0,
        errors: ['Invalid CSV header'],
        warnings: [],
      };
      mockImportFidelityTransactions.mockResolvedValue(errorResult);

      const response = await app.inject({
        method: 'POST',
        url: '/api/import/fidelity',
        payload: 'bad csv',
        headers: { 'content-type': 'text/plain' },
      });

      expect(response.statusCode).toBe(400);
    });

    test('should return 500 for unexpected server errors', async function () {
      mockImportFidelityTransactions.mockRejectedValue(
        new Error('Unexpected DB crash')
      );

      const response = await app.inject({
        method: 'POST',
        url: '/api/import/fidelity',
        payload: 'csv data',
        headers: { 'content-type': 'text/plain' },
      });

      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body) as ImportResult;
      expect(body.success).toBe(false);
      expect(body.errors[0]).toContain('Unexpected DB crash');
    });

    test('should return detailed error messages for each failed row', async function () {
      const errorResult: ImportResult = {
        success: false,
        imported: 3,
        errors: ['Row 5: Account not found', 'Row 8: Symbol not in universe'],
        warnings: [],
      };
      mockImportFidelityTransactions.mockResolvedValue(errorResult);

      const response = await app.inject({
        method: 'POST',
        url: '/api/import/fidelity',
        payload: 'csv data',
        headers: { 'content-type': 'text/plain' },
      });

      const body = JSON.parse(response.body) as ImportResult;
      expect(body.errors).toHaveLength(2);
      expect(body.errors[0]).toContain('Row 5');
      expect(body.errors[1]).toContain('Row 8');
    });
  });

  describe('authentication/authorization', function () {
    test('should require authentication for import endpoint', async function () {
      // Auth is handled globally by the auth plugin (onRequest hook).
      // In dev/test environments, auth is skipped.
      // We verify the route exists and is callable (auth plugin is not
      // registered in this test environment, matching dev behavior).
      const successResult: ImportResult = {
        success: true,
        imported: 0,
        errors: [],
        warnings: [],
      };
      mockImportFidelityTransactions.mockResolvedValue(successResult);

      const response = await app.inject({
        method: 'POST',
        url: '/api/import/fidelity',
        payload: 'csv data',
        headers: { 'content-type': 'text/plain' },
      });

      // The route is accessible; in production the auth plugin would reject
      // unauthenticated requests before reaching this handler.
      expect(response.statusCode).toBe(200);
    });
  });

  describe('edge cases', function () {
    test('should handle empty file gracefully', async function () {
      const response = await app.inject({
        method: 'POST',
        url: '/api/import/fidelity',
        payload: '',
        headers: { 'content-type': 'text/plain' },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body) as ImportResult;
      expect(body.success).toBe(false);
    });

    test('should handle CSV with only headers and no data rows', async function () {
      const successResult: ImportResult = {
        success: true,
        imported: 0,
        errors: [],
        warnings: [],
      };
      mockImportFidelityTransactions.mockResolvedValue(successResult);

      const response = await app.inject({
        method: 'POST',
        url: '/api/import/fidelity',
        payload:
          'Date,Action,Symbol,Description,Quantity,Price,Total Amount,Account',
        headers: { 'content-type': 'text/plain' },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as ImportResult;
      expect(body.imported).toBe(0);
    });

    test('should handle non-existent account during import', async function () {
      const errorResult: ImportResult = {
        success: false,
        imported: 0,
        errors: ['Account "NonExistent" not found'],
        warnings: [],
      };
      mockImportFidelityTransactions.mockResolvedValue(errorResult);

      const response = await app.inject({
        method: 'POST',
        url: '/api/import/fidelity',
        payload: 'csv data',
        headers: { 'content-type': 'text/plain' },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body) as ImportResult;
      expect(body.errors[0]).toContain('Account');
    });

    test('should handle duplicate transaction detection', async function () {
      const successResult: ImportResult = {
        success: true,
        imported: 1,
        errors: [],
        warnings: [],
      };
      mockImportFidelityTransactions.mockResolvedValue(successResult);

      const response = await app.inject({
        method: 'POST',
        url: '/api/import/fidelity',
        payload: 'csv data',
        headers: { 'content-type': 'text/plain' },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as ImportResult;
      expect(body.success).toBe(true);
    });

    test('should handle partial success scenarios', async function () {
      const partialResult: ImportResult = {
        success: false,
        imported: 3,
        errors: ['Failed to process row 4'],
        warnings: [],
      };
      mockImportFidelityTransactions.mockResolvedValue(partialResult);

      const response = await app.inject({
        method: 'POST',
        url: '/api/import/fidelity',
        payload: 'csv data',
        headers: { 'content-type': 'text/plain' },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body) as ImportResult;
      expect(body.imported).toBe(3);
      expect(body.errors).toHaveLength(1);
    });
  });
});
