import { HttpRequest, HttpResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { SortFilterStateService } from '../../shared/services/sort-filter-state.service';
import { sortInterceptor } from './sort.interceptor';

describe('sortInterceptor', () => {
  let mockSortFilterStateService: {
    loadAllSortFilterState: ReturnType<typeof vi.fn>;
  };
  let mockNext: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockSortFilterStateService = {
      loadAllSortFilterState: vi.fn().mockReturnValue({}),
    };

    mockNext = vi.fn().mockReturnValue(of(new HttpResponse({ status: 200 })));

    TestBed.configureTestingModule({
      providers: [
        {
          provide: SortFilterStateService,
          useValue: mockSortFilterStateService,
        },
      ],
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('sends all state as JSON header', () => {
    it('should add X-Sort-Filter-State header with all table states', () => {
      mockSortFilterStateService.loadAllSortFilterState.mockReturnValue({
        universes: { sort: { field: 'symbol', order: 'asc' } },
        'trades-open': { sort: { field: 'buyDate', order: 'desc' } },
      });

      const req = new HttpRequest('GET', '/api/universe');

      TestBed.runInInjectionContext(() => {
        sortInterceptor(req, mockNext);
      });

      const interceptedReq = mockNext.mock.calls[0][0] as HttpRequest<unknown>;
      const headerValue = interceptedReq.headers.get('X-Sort-Filter-State');
      expect(headerValue).not.toBeNull();
      const parsed = JSON.parse(headerValue!);
      expect(parsed.universes.sort).toEqual({
        field: 'symbol',
        order: 'asc',
      });
      expect(parsed['trades-open'].sort).toEqual({
        field: 'openDate',
        order: 'desc',
      });
    });

    it('should include filter state in the header', () => {
      mockSortFilterStateService.loadAllSortFilterState.mockReturnValue({
        universes: {
          sort: { field: 'symbol', order: 'asc' },
          filters: { symbol: 'AAPL' },
        },
      });

      const req = new HttpRequest('GET', '/api/universe');

      TestBed.runInInjectionContext(() => {
        sortInterceptor(req, mockNext);
      });

      const interceptedReq = mockNext.mock.calls[0][0] as HttpRequest<unknown>;
      const parsed = JSON.parse(
        interceptedReq.headers.get('X-Sort-Filter-State')!
      );
      expect(parsed.universes.filters).toEqual({ symbol: 'AAPL' });
    });

    it('should send state on any GET request regardless of endpoint', () => {
      mockSortFilterStateService.loadAllSortFilterState.mockReturnValue({
        universes: { sort: { field: 'symbol', order: 'asc' } },
      });

      const req = new HttpRequest('GET', '/api/other/endpoint');

      TestBed.runInInjectionContext(() => {
        sortInterceptor(req, mockNext);
      });

      const interceptedReq = mockNext.mock.calls[0][0] as HttpRequest<unknown>;
      expect(interceptedReq.headers.has('X-Sort-Filter-State')).toBe(true);
    });
  });

  describe('field name mapping', () => {
    it('should pass through risk_group field for universes', () => {
      mockSortFilterStateService.loadAllSortFilterState.mockReturnValue({
        universes: { sort: { field: 'risk_group', order: 'asc' } },
      });

      const req = new HttpRequest('GET', '/api/universe');

      TestBed.runInInjectionContext(() => {
        sortInterceptor(req, mockNext);
      });

      const interceptedReq = mockNext.mock.calls[0][0] as HttpRequest<unknown>;
      const parsed = JSON.parse(
        interceptedReq.headers.get('X-Sort-Filter-State')!
      );
      expect(parsed.universes.sort.field).toBe('risk_group');
    });

    it('should map buyDate to openDate for trades-open', () => {
      mockSortFilterStateService.loadAllSortFilterState.mockReturnValue({
        'trades-open': { sort: { field: 'buyDate', order: 'desc' } },
      });

      const req = new HttpRequest('GET', '/api/trades/open');

      TestBed.runInInjectionContext(() => {
        sortInterceptor(req, mockNext);
      });

      const interceptedReq = mockNext.mock.calls[0][0] as HttpRequest<unknown>;
      const parsed = JSON.parse(
        interceptedReq.headers.get('X-Sort-Filter-State')!
      );
      expect(parsed['trades-open'].sort.field).toBe('openDate');
    });

    it('should map sell_date to closeDate for trades-closed', () => {
      mockSortFilterStateService.loadAllSortFilterState.mockReturnValue({
        'trades-closed': { sort: { field: 'sell_date', order: 'desc' } },
      });

      const req = new HttpRequest('GET', '/api/trades/closed');

      TestBed.runInInjectionContext(() => {
        sortInterceptor(req, mockNext);
      });

      const interceptedReq = mockNext.mock.calls[0][0] as HttpRequest<unknown>;
      const parsed = JSON.parse(
        interceptedReq.headers.get('X-Sort-Filter-State')!
      );
      expect(parsed['trades-closed'].sort.field).toBe('closeDate');
    });

    it('should pass through unmapped sort fields for known tables', () => {
      mockSortFilterStateService.loadAllSortFilterState.mockReturnValue({
        universes: { sort: { field: 'yield_percent', order: 'asc' } },
      });

      const req = new HttpRequest('GET', '/api/universe');

      TestBed.runInInjectionContext(() => {
        sortInterceptor(req, mockNext);
      });

      const interceptedReq = mockNext.mock.calls[0][0] as HttpRequest<unknown>;
      expect(interceptedReq.headers.has('X-Sort-Filter-State')).toBe(true);
      const parsed = JSON.parse(
        interceptedReq.headers.get('X-Sort-Filter-State')!
      );
      expect(parsed.universes.sort.field).toBe('yield_percent');
    });

    it('should pass through fields for tables without a field map', () => {
      mockSortFilterStateService.loadAllSortFilterState.mockReturnValue({
        'other-table': { sort: { field: 'name', order: 'asc' } },
      });

      const req = new HttpRequest('GET', '/api/other');

      TestBed.runInInjectionContext(() => {
        sortInterceptor(req, mockNext);
      });

      const interceptedReq = mockNext.mock.calls[0][0] as HttpRequest<unknown>;
      const parsed = JSON.parse(
        interceptedReq.headers.get('X-Sort-Filter-State')!
      );
      expect(parsed['other-table'].sort.field).toBe('name');
    });
  });

  describe('non-GET requests', () => {
    it('should add headers to POST requests', () => {
      mockSortFilterStateService.loadAllSortFilterState.mockReturnValue({
        universes: { sort: { field: 'symbol', order: 'asc' } },
      });

      const req = new HttpRequest('POST', '/api/universe', {});

      TestBed.runInInjectionContext(() => {
        sortInterceptor(req, mockNext);
      });

      const interceptedReq = mockNext.mock.calls[0][0] as HttpRequest<unknown>;
      expect(interceptedReq.headers.has('X-Sort-Filter-State')).toBe(true);
    });
  });

  describe('empty state', () => {
    it('should not add header when no state exists', () => {
      mockSortFilterStateService.loadAllSortFilterState.mockReturnValue({});

      const req = new HttpRequest('GET', '/api/universe');

      TestBed.runInInjectionContext(() => {
        sortInterceptor(req, mockNext);
      });

      const interceptedReq = mockNext.mock.calls[0][0] as HttpRequest<unknown>;
      expect(interceptedReq.headers.has('X-Sort-Filter-State')).toBe(false);
    });
  });
});
