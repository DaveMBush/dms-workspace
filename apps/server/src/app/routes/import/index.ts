import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import { importFidelityTransactions } from './fidelity-import-service.function';
import { ImportResult } from './import-result.interface';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = [
  'text/csv',
  'application/csv',
  'application/vnd.ms-excel',
];

/**
 * Strips UTF-8 BOM (Byte Order Mark) from the beginning of a string.
 */
function stripBom(content: string): string {
  if (content.charCodeAt(0) === 0xfeff) {
    return content.slice(1);
  }
  return content;
}

/**
 * Checks whether the content type indicates a multipart request.
 */
function isMultipartRequest(request: FastifyRequest): boolean {
  const contentType = request.headers['content-type'] ?? '';
  return contentType.includes('multipart/form-data');
}

/**
 * Validates that the uploaded file is a CSV based on filename or MIME type.
 */
function isValidCsvFile(filename: string, mimetype: string): boolean {
  const hasValidExtension = filename.toLowerCase().endsWith('.csv');
  const hasValidMime = ALLOWED_MIME_TYPES.includes(mimetype);
  return hasValidExtension || hasValidMime;
}

/**
 * Creates a 400 error with a custom message.
 */
function createValidationError(message: string): Error {
  return Object.assign(new Error(message), { statusCode: 400 });
}

/**
 * Validates multipart file fields (type, size, content).
 */
function validateFileBuffer(
  buffer: Buffer,
  filename: string,
  mimetype: string
): void {
  if (!isValidCsvFile(filename, mimetype)) {
    throw createValidationError(
      'Invalid file type. Only CSV files are accepted.'
    );
  }

  if (buffer.length > MAX_FILE_SIZE) {
    throw createValidationError('File size exceeds the maximum limit of 10MB.');
  }
}

/**
 * Extracts CSV content from a multipart file upload request.
 * Validates file presence, type, size, and content.
 */
async function extractMultipartCsvContent(
  request: FastifyRequest
): Promise<string | null> {
  const file = await request.file();
  if (!file) {
    return null;
  }

  const buffer = await file.toBuffer();
  validateFileBuffer(buffer, file.filename, file.mimetype);

  const content = stripBom(buffer.toString('utf-8'));
  if (content.trim().length === 0) {
    throw createValidationError('File is empty. No content to import.');
  }

  return content;
}

/**
 * Extracts CSV content from a plain text request body.
 */
function extractPlainTextCsvContent(request: FastifyRequest): string | null {
  const body: unknown = request.body;
  if (typeof body === 'string') {
    const content = stripBom(body);
    if (Buffer.byteLength(content, 'utf-8') > MAX_FILE_SIZE) {
      throw createValidationError(
        'File size exceeds the maximum limit of 10MB.',
      );
    }
    return content.trim().length > 0 ? content : null;
  }
  return null;
}

/**
 * Extracts CSV content from the request, handling both multipart and text/plain.
 */
async function extractCsvContent(
  request: FastifyRequest
): Promise<string | null> {
  if (isMultipartRequest(request)) {
    return extractMultipartCsvContent(request);
  }
  return extractPlainTextCsvContent(request);
}

/**
 * Returns the missing-content error message based on request type.
 */
function getMissingContentMessage(request: FastifyRequest): string {
  if (isMultipartRequest(request)) {
    return 'No file uploaded. Please select a CSV file.';
  }
  return 'No file content provided';
}

/**
 * Builds an error message for the given error and status code.
 */
function buildErrorMessage(error: unknown, statusCode: number): string {
  if (statusCode >= 500) {
    return 'Internal server error';
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Unexpected server error';
}

/**
 * Sends an error ImportResult response.
 */
function sendErrorResponse(
  reply: FastifyReply,
  statusCode: number,
  message: string
): void {
  reply.status(statusCode).send({
    success: false,
    imported: 0,
    errors: [message],
    warnings: [],
  } satisfies ImportResult);
}

/**
 * Handles POST /api/import/fidelity
 * Accepts CSV content as multipart/form-data file upload or plain text body.
 */
async function handleFidelityImport(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const csvContent = await extractCsvContent(request);
    if (csvContent === null) {
      sendErrorResponse(reply, 400, getMissingContentMessage(request));
      return;
    }

    const result = await importFidelityTransactions(csvContent);
    const statusCode = result.success ? 200 : 400;
    reply.status(statusCode).send(result);
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode ?? 500;
    if (statusCode >= 500) {
      request.log.error(error, 'Fidelity import failed');
    }
    sendErrorResponse(reply, statusCode, buildErrorMessage(error, statusCode));
  }
}

export default function registerImportRoutes(fastify: FastifyInstance): void {
  fastify.post('/fidelity', handleFidelityImport);
}
