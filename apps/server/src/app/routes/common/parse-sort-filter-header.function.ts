import { FastifyRequest } from 'fastify';

import { TableState } from './table-state.interface';

function isValidSortOrder(order: unknown): order is 'asc' | 'desc' {
  return order === 'asc' || order === 'desc';
}

function isNonNullObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isValidSort(sort: unknown): boolean {
  if (!isNonNullObject(sort)) {
    return false;
  }
  return typeof sort['field'] === 'string' && isValidSortOrder(sort['order']);
}

function isValidSortColumn(item: unknown): boolean {
  if (!isNonNullObject(item)) {
    return false;
  }
  return (
    typeof item['column'] === 'string' && isValidSortOrder(item['direction'])
  );
}

function isValidSortColumns(sortColumns: unknown): boolean {
  if (!Array.isArray(sortColumns)) {
    return false;
  }
  for (let i = 0; i < sortColumns.length; i++) {
    if (!isValidSortColumn(sortColumns[i])) {
      return false;
    }
  }
  return true;
}

function isValidFilters(filters: unknown): boolean {
  return (
    typeof filters === 'object' && filters !== null && !Array.isArray(filters)
  );
}

const ALLOWED_TABLE_STATE_KEYS = new Set(['sort', 'sortColumns', 'filters']);

function hasOnlyAllowedKeys(obj: Record<string, unknown>): boolean {
  const keys = Object.keys(obj);
  for (let i = 0; i < keys.length; i++) {
    if (!ALLOWED_TABLE_STATE_KEYS.has(keys[i])) {
      return false;
    }
  }
  return true;
}

function isValidTableState(value: unknown): value is TableState {
  if (!isNonNullObject(value)) {
    return false;
  }
  if (!hasOnlyAllowedKeys(value)) {
    return false;
  }
  if (value['sort'] !== undefined && !isValidSort(value['sort'])) {
    return false;
  }
  if (
    value['sortColumns'] !== undefined &&
    !isValidSortColumns(value['sortColumns'])
  ) {
    return false;
  }
  if (value['filters'] !== undefined && !isValidFilters(value['filters'])) {
    return false;
  }
  return true;
}

const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

function buildValidatedResult(
  parsed: Record<string, unknown>
): Record<string, TableState> {
  const result: Record<string, TableState> = Object.create(null) as Record<
    string,
    TableState
  >;
  const entries = Object.entries(parsed);
  for (let i = 0; i < entries.length; i++) {
    const [key, value] = entries[i];
    if (DANGEROUS_KEYS.has(key)) {
      continue;
    }
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
