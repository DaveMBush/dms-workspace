import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import { importFidelityTransactions } from './fidelity-import-service.function';
import { ImportResult } from './import-result.interface';

/**
 * Handles POST /api/import/fidelity
 * Accepts CSV content as the request body text and imports Fidelity transactions.
 */
async function handleFidelityImport(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const csvContent = extractCsvContent(request);
    if (csvContent === null) {
      reply.status(400).send({
        success: false,
        imported: 0,
        errors: ['No file content provided'],
        warnings: [],
      } satisfies ImportResult);
      return;
    }

    const result = await importFidelityTransactions(csvContent);
    const statusCode = result.success ? 200 : 400;
    reply.status(statusCode).send(result);
  } catch (error) {
    request.log.error(error, 'Fidelity import failed');
    reply.status(500).send({
      success: false,
      imported: 0,
      errors: [
        error instanceof Error ? error.message : 'Unexpected server error',
      ],
      warnings: [],
    } satisfies ImportResult);
  }
}

/**
 * Extracts CSV content from the request body.
 * Expects plain text body (Fastify parses text/plain natively).
 */
function extractCsvContent(request: FastifyRequest): string | null {
  const body: unknown = request.body;
  if (typeof body === 'string') {
    return body.trim().length > 0 ? body : null;
  }
  return null;
}

export default function registerImportRoutes(fastify: FastifyInstance): void {
  fastify.post('/fidelity', handleFidelityImport);
}
