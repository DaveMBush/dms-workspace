import { describe, it, expect } from 'vitest';
import { FastifyRequest } from 'fastify';

import { parseSortFilterHeader } from './parse-sort-filter-header.function';

function createRequest(headerValue: string | undefined): FastifyRequest {
  return {
    headers: {
      ...(headerValue !== undefined
        ? { 'x-sort-filter-state': headerValue }
        : {}),
    },
  } as unknown as FastifyRequest;
}

describe('parseSortFilterHeader', () => {
  describe('basic parsing', () => {
    it('should return empty object when header is missing', () => {
      const result = parseSortFilterHeader(createRequest(undefined));

      expect(result).toEqual({});
    });

    it('should return empty object for empty string', () => {
      const result = parseSortFilterHeader(createRequest(''));

      expect(result).toEqual({});
    });

    it('should return empty object for invalid JSON', () => {
      const result = parseSortFilterHeader(createRequest('not-json'));

      expect(result).toEqual({});
    });

    it('should return empty object for JSON array', () => {
      const result = parseSortFilterHeader(createRequest('[]'));

      expect(result).toEqual({});
    });

    it('should return empty object for JSON null', () => {
      const result = parseSortFilterHeader(createRequest('null'));

      expect(result).toEqual({});
    });

    it('should parse valid table state with sort', () => {
      const header = JSON.stringify({
        universes: { sort: { field: 'symbol', order: 'asc' } },
      });

      const result = parseSortFilterHeader(createRequest(header));

      expect(result).toEqual({
        universes: { sort: { field: 'symbol', order: 'asc' } },
      });
    });

    it('should parse valid table state with filters', () => {
      const header = JSON.stringify({
        universes: { filters: { expired: false } },
      });

      const result = parseSortFilterHeader(createRequest(header));

      expect(result).toEqual({
        universes: { filters: { expired: false } },
      });
    });
  });

  describe('sortColumns validation', () => {
    it('should accept valid sortColumns', () => {
      const header = JSON.stringify({
        universes: {
          sortColumns: [
            { column: 'symbol', direction: 'asc' },
            { column: 'last_price', direction: 'desc' },
          ],
        },
      });

      const result = parseSortFilterHeader(createRequest(header));

      expect(result).toEqual({
        universes: {
          sortColumns: [
            { column: 'symbol', direction: 'asc' },
            { column: 'last_price', direction: 'desc' },
          ],
        },
      });
    });

    it('should accept empty sortColumns array', () => {
      const header = JSON.stringify({
        universes: { sortColumns: [] },
      });

      const result = parseSortFilterHeader(createRequest(header));

      expect(result).toEqual({
        universes: { sortColumns: [] },
      });
    });

    it('should accept sortColumns with sort and filters together', () => {
      const header = JSON.stringify({
        universes: {
          sort: { field: 'symbol', order: 'asc' },
          sortColumns: [{ column: 'symbol', direction: 'asc' }],
          filters: { expired: false },
        },
      });

      const result = parseSortFilterHeader(createRequest(header));

      expect(result).toEqual({
        universes: {
          sort: { field: 'symbol', order: 'asc' },
          sortColumns: [{ column: 'symbol', direction: 'asc' }],
          filters: { expired: false },
        },
      });
    });

    it('should reject non-array sortColumns', () => {
      const header = JSON.stringify({
        universes: { sortColumns: 'invalid' },
      });

      const result = parseSortFilterHeader(createRequest(header));

      expect(result).toEqual({});
    });

    it('should reject sortColumns with non-object items', () => {
      const header = JSON.stringify({
        universes: { sortColumns: ['invalid'] },
      });

      const result = parseSortFilterHeader(createRequest(header));

      expect(result).toEqual({});
    });

    it('should reject sortColumns with missing column', () => {
      const header = JSON.stringify({
        universes: {
          sortColumns: [{ direction: 'asc' }],
        },
      });

      const result = parseSortFilterHeader(createRequest(header));

      expect(result).toEqual({});
    });

    it('should reject sortColumns with missing direction', () => {
      const header = JSON.stringify({
        universes: {
          sortColumns: [{ column: 'symbol' }],
        },
      });

      const result = parseSortFilterHeader(createRequest(header));

      expect(result).toEqual({});
    });

    it('should reject sortColumns with invalid direction value', () => {
      const header = JSON.stringify({
        universes: {
          sortColumns: [{ column: 'symbol', direction: 'up' }],
        },
      });

      const result = parseSortFilterHeader(createRequest(header));

      expect(result).toEqual({});
    });

    it('should reject sortColumns with null item', () => {
      const header = JSON.stringify({
        universes: { sortColumns: [null] },
      });

      const result = parseSortFilterHeader(createRequest(header));

      expect(result).toEqual({});
    });

    it('should reject sortColumns with numeric column', () => {
      const header = JSON.stringify({
        universes: {
          sortColumns: [{ column: 123, direction: 'asc' }],
        },
      });

      const result = parseSortFilterHeader(createRequest(header));

      expect(result).toEqual({});
    });
  });

  describe('prototype pollution protection', () => {
    it('should skip __proto__ keys', () => {
      const header = JSON.stringify({
        __proto__: { sort: { field: 'symbol', order: 'asc' } },
        universes: { sort: { field: 'symbol', order: 'asc' } },
      });

      const result = parseSortFilterHeader(createRequest(header));

      expect(result).toEqual({
        universes: { sort: { field: 'symbol', order: 'asc' } },
      });
      expect(Object.keys(result)).not.toContain('__proto__');
    });

    it('should skip constructor key', () => {
      const header = JSON.stringify({
        constructor: { sort: { field: 'symbol', order: 'asc' } },
        universes: { sort: { field: 'symbol', order: 'asc' } },
      });

      const result = parseSortFilterHeader(createRequest(header));

      expect(result).toEqual({
        universes: { sort: { field: 'symbol', order: 'asc' } },
      });
    });
  });

  describe('unknown keys rejection', () => {
    it('should reject table state with unknown keys', () => {
      const header = JSON.stringify({
        universes: {
          sort: { field: 'symbol', order: 'asc' },
          unknown: 'value',
        },
      });

      const result = parseSortFilterHeader(createRequest(header));

      expect(result).toEqual({});
    });
  });

  describe('invalid sort rejection', () => {
    it('should reject when sort is a string', () => {
      const header = JSON.stringify({
        universes: { sort: 'invalid' },
      });

      const result = parseSortFilterHeader(createRequest(header));

      expect(result).toEqual({});
    });

    it('should reject when sort is null', () => {
      const header = JSON.stringify({
        universes: { sort: null },
      });

      const result = parseSortFilterHeader(createRequest(header));

      expect(result).toEqual({});
    });
  });

  describe('invalid filters rejection', () => {
    it('should reject when filters is a string', () => {
      const header = JSON.stringify({
        universes: { filters: 'invalid' },
      });

      const result = parseSortFilterHeader(createRequest(header));

      expect(result).toEqual({});
    });

    it('should reject when filters is an array', () => {
      const header = JSON.stringify({
        universes: { filters: ['a', 'b'] },
      });

      const result = parseSortFilterHeader(createRequest(header));

      expect(result).toEqual({});
    });
  });

  describe('invalid table state value', () => {
    it('should skip non-object table state values', () => {
      const header = JSON.stringify({
        universes: 'not-an-object',
        screens: { sort: { field: 'symbol', order: 'asc' } },
      });

      const result = parseSortFilterHeader(createRequest(header));

      expect(result).toEqual({
        screens: { sort: { field: 'symbol', order: 'asc' } },
      });
    });

    it('should skip array table state values', () => {
      const header = JSON.stringify({
        universes: [1, 2, 3],
      });

      const result = parseSortFilterHeader(createRequest(header));

      expect(result).toEqual({});
    });

    it('should skip null table state values', () => {
      const header = JSON.stringify({
        universes: null,
      });

      const result = parseSortFilterHeader(createRequest(header));

      expect(result).toEqual({});
    });
  });
});
