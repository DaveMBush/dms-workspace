import { FastifyRequest } from 'fastify';

import { TableState } from './table-state.interface';

function isValidSortOrder(order: unknown): order is 'asc' | 'desc' {
  return order === 'asc' || order === 'desc';
}

function isValidSort(sort: unknown): boolean {
  if (typeof sort !== 'object' || sort === null) {
    return false;
  }
  const s = sort as Record<string, unknown>;
  return typeof s['field'] === 'string' && isValidSortOrder(s['order']);
}

function isValidFilters(filters: unknown): boolean {
  return (
    typeof filters === 'object' && filters !== null && !Array.isArray(filters)
  );
}

function isValidTableState(value: unknown): value is TableState {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const obj = value as Record<string, unknown>;
  if (obj['sort'] !== undefined && !isValidSort(obj['sort'])) {
    return false;
  }
  if (obj['filters'] !== undefined && !isValidFilters(obj['filters'])) {
    return false;
  }
  return true;
}

function buildValidatedResult(
  parsed: Record<string, unknown>
): Record<string, TableState> {
  const result: Record<string, TableState> = {};
  const entries = Object.entries(parsed);
  for (let i = 0; i < entries.length; i++) {
    const [key, value] = entries[i];
    if (isValidTableState(value)) {
      result[key] = value;
    }
  }
  return result;
}

export function parseSortFilterHeader(
  request: FastifyRequest
): Record<string, TableState> {
  const headerValue = request.headers['x-sort-filter-state'];
  if (typeof headerValue !== 'string' || headerValue === '') {
    return {};
  }
  try {
    const parsed: unknown = JSON.parse(headerValue);
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      return {};
    }
    return buildValidatedResult(parsed as Record<string, unknown>);
  } catch {
    return {};
  }
}
