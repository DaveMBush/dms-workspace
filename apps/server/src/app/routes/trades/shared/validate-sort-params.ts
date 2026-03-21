/* eslint-disable @smarttools/one-exported-item-per-file -- Shared utility exports function and related types together */
import type { FastifyReply } from 'fastify';

interface SortQuerystring {
  sortBy?: string;
  sortOrder?: string;
}

interface ValidatedSortParams<T extends string> {
  effectiveSortBy: T;
  effectiveSortOrder: 'asc' | 'desc';
}

/**
 * Validates sort parameters from query string and returns normalized values.
 * Sends 400 error response and returns null if validation fails.
 *
 * @param query - The query string parameters
 * @param reply - The Fastify reply object for sending error responses
 * @param validFields - Array of valid sort field names
 * @param defaultSortBy - Default sort field if none specified
 * @returns Validated sort parameters or null if validation fails
 */
function validateSortParams<T extends string>(
  query: SortQuerystring,
  reply: FastifyReply,
  validFields: readonly T[],
  defaultSortBy: T
): ValidatedSortParams<T> | null {
  const { sortBy, sortOrder } = query;

  if (
    sortBy !== undefined &&
    (sortBy === '' || !validFields.includes(sortBy as T))
  ) {
    reply.status(400).send({
      error: `Invalid sort field: ${sortBy}. Valid fields: ${validFields.join(
        ', '
      )}`,
    });
    return null;
  }

  const effectiveSortBy: T =
    sortBy !== undefined && validFields.includes(sortBy as T)
      ? (sortBy as T)
      : defaultSortBy;
  const effectiveSortOrder: 'asc' | 'desc' =
    sortOrder === 'desc' ? 'desc' : 'asc';

  return { effectiveSortBy, effectiveSortOrder };
}

export { validateSortParams };
export type { SortQuerystring, ValidatedSortParams };
