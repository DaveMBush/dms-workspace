import { FastifyRequest } from 'fastify';

import { TableState } from './table-state.interface';

export function parseSortFilterHeader(
  request: FastifyRequest
): Record<string, TableState> {
  const headerValue = request.headers['x-sort-filter-state'];
  if (typeof headerValue !== 'string' || headerValue === '') {
    return {};
  }
  try {
    return JSON.parse(headerValue) as Record<string, TableState>;
  } catch {
    return {};
  }
}
