import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { CusipCacheAdminService } from './cusip-cache-admin.service';

describe('CusipCacheAdminService', function describeService() {
  let service: CusipCacheAdminService;
  let httpMock: HttpTestingController;

  beforeEach(function setup() {
    TestBed.configureTestingModule({
      providers: [
        CusipCacheAdminService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(CusipCacheAdminService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(function verifyHttp() {
    httpMock.verify();
  });

  it('should be created', function shouldBeCreated() {
    expect(service).toBeDefined();
  });

  describe('fetchStats', function describeFetchStats() {
    it('should fetch stats and update signal', function shouldFetch() {
      const mockStats = {
        totalEntries: 42,
        entriesBySource: { OPENFIGI: 30, YAHOO_FINANCE: 12 },
        oldestEntry: '2024-01-01',
        newestEntry: '2025-03-01',
        recentlyAdded: [
          {
            cusip: '037833100',
            symbol: 'AAPL',
            source: 'OPENFIGI',
            resolvedAt: '2025-03-01',
          },
        ],
        timestamp: '2025-03-06T12:00:00Z',
      };

      service.fetchStats();
      expect(service.loading()).toBe(true);

      const req = httpMock.expectOne('/api/admin/cusip-cache/stats');
      expect(req.request.method).toBe('GET');
      req.flush(mockStats);

      expect(service.stats()).toEqual(mockStats);
      expect(service.loading()).toBe(false);
      expect(service.error()).toBeNull();
    });

    it('should handle error on fetch stats', function shouldHandleError() {
      service.fetchStats();

      const req = httpMock.expectOne('/api/admin/cusip-cache/stats');
      req.flush('Error', { status: 500, statusText: 'Server Error' });

      expect(service.stats()).toBeNull();
      expect(service.loading()).toBe(false);
      expect(service.error()).toBeTruthy();
    });

    it('should clear error on new request', function shouldClearError() {
      service.fetchStats();
      const req1 = httpMock.expectOne('/api/admin/cusip-cache/stats');
      req1.flush('Error', { status: 500, statusText: 'Server Error' });
      expect(service.error()).toBeTruthy();

      service.fetchStats();
      expect(service.error()).toBeNull();
      const req2 = httpMock.expectOne('/api/admin/cusip-cache/stats');
      req2.flush({
        totalEntries: 0,
        entriesBySource: {},
        oldestEntry: null,
        newestEntry: null,
        recentlyAdded: [],
        timestamp: '2025-03-06T12:00:00Z',
      });
    });
  });

  describe('search', function describeSearch() {
    it('should search by cusip', function shouldSearchByCusip() {
      service.search('037833100');

      const req = httpMock.expectOne(function matchCusip(r) {
        return (
          r.url === '/api/admin/cusip-cache/search' &&
          r.params.get('cusip') === '037833100'
        );
      });
      expect(req.request.method).toBe('GET');
      req.flush({
        entries: [
          {
            id: '1',
            cusip: '037833100',
            symbol: 'AAPL',
            source: 'OPENFIGI',
            resolvedAt: null,
            lastUsedAt: null,
            createdAt: '2025-01-01',
            updatedAt: '2025-01-01',
          },
        ],
        count: 1,
      });

      expect(service.searchResults().length).toBe(1);
      expect(service.searchResults()[0].cusip).toBe('037833100');
    });

    it('should search by symbol', function shouldSearchBySymbol() {
      service.search(undefined, 'AAPL');

      const req = httpMock.expectOne(function matchSymbol(r) {
        return (
          r.url === '/api/admin/cusip-cache/search' &&
          r.params.get('symbol') === 'AAPL'
        );
      });
      req.flush({ entries: [], count: 0 });

      expect(service.searchResults().length).toBe(0);
    });

    it('should handle search errors', function shouldHandleSearchError() {
      service.search('invalid');

      const req = httpMock.expectOne(function matchSearch(r) {
        return r.url === '/api/admin/cusip-cache/search';
      });
      req.flush(
        { error: 'Not found' },
        { status: 404, statusText: 'Not Found' }
      );

      expect(service.error()).toBeTruthy();
      expect(service.loading()).toBe(false);
    });
  });

  describe('clearSearch', function describeClearSearch() {
    it('should clear search results', function shouldClear() {
      service.search('037833100');
      const req = httpMock.expectOne(function matchUrl(r) {
        return r.url === '/api/admin/cusip-cache/search';
      });
      req.flush({
        entries: [
          {
            id: '1',
            cusip: '037833100',
            symbol: 'AAPL',
            source: 'OPENFIGI',
            resolvedAt: null,
            lastUsedAt: null,
            createdAt: '2025-01-01',
            updatedAt: '2025-01-01',
          },
        ],
        count: 1,
      });
      expect(service.searchResults().length).toBe(1);

      service.clearSearch();
      expect(service.searchResults().length).toBe(0);
    });
  });

  describe('addMapping', function describeAddMapping() {
    it('should post a new mapping', function shouldAdd() {
      service
        .addMapping('037833100', 'AAPL', 'OPENFIGI', 'test reason')
        .subscribe();

      const req = httpMock.expectOne('/api/admin/cusip-cache/add');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        cusip: '037833100',
        symbol: 'AAPL',
        source: 'OPENFIGI',
        reason: 'test reason',
      });
      req.flush({
        id: '1',
        cusip: '037833100',
        symbol: 'AAPL',
        source: 'OPENFIGI',
      });

      expect(service.loading()).toBe(false);
    });

    it('should handle add error', function shouldHandleAddError() {
      service.addMapping('invalid', 'X', 'OPENFIGI').subscribe({
        error: function noop() {
          // expected
        },
      });

      const req = httpMock.expectOne('/api/admin/cusip-cache/add');
      req.flush(
        { error: 'Invalid CUSIP' },
        { status: 400, statusText: 'Bad Request' }
      );

      expect(service.error()).toBeTruthy();
      expect(service.loading()).toBe(false);
    });
  });

  describe('deleteMapping', function describeDeleteMapping() {
    it('should delete a mapping', function shouldDelete() {
      service.deleteMapping('abc-123').subscribe();

      const req = httpMock.expectOne('/api/admin/cusip-cache/abc-123');
      expect(req.request.method).toBe('DELETE');
      req.flush({});

      expect(service.loading()).toBe(false);
    });

    it('should handle delete error', function shouldHandleDeleteError() {
      service.deleteMapping('nonexistent').subscribe({
        error: function noop() {
          // expected
        },
      });

      const req = httpMock.expectOne('/api/admin/cusip-cache/nonexistent');
      req.flush(
        { error: 'Not found' },
        { status: 404, statusText: 'Not Found' }
      );

      expect(service.error()).toBeTruthy();
    });
  });

  describe('fetchAuditLog', function describeFetchAudit() {
    it('should fetch audit log with default limit', function shouldFetchAudit() {
      service.fetchAuditLog();

      const req = httpMock.expectOne(function matchAudit(r) {
        return (
          r.url === '/api/admin/cusip-cache/audit' &&
          r.params.get('limit') === '20'
        );
      });
      expect(req.request.method).toBe('GET');
      req.flush({
        entries: [
          {
            id: '1',
            cusip: '037833100',
            symbol: 'AAPL',
            action: 'CREATE',
            source: 'MANUAL',
            userId: null,
            reason: null,
            createdAt: '2025-03-06',
          },
        ],
        total: 1,
      });

      expect(service.auditEntries().entries.length).toBe(1);
      expect(service.auditEntries().total).toBe(1);
    });

    it('should fetch audit log with custom limit', function shouldFetchWithLimit() {
      service.fetchAuditLog(50);

      const req = httpMock.expectOne(function matchLimit(r) {
        return (
          r.url === '/api/admin/cusip-cache/audit' &&
          r.params.get('limit') === '50'
        );
      });
      expect(req.request.method).toBe('GET');
      req.flush({ entries: [], total: 0 });
    });

    it('should handle audit log error', function shouldHandleAuditError() {
      service.fetchAuditLog();

      const req = httpMock.expectOne(function matchUrl(r) {
        return r.url === '/api/admin/cusip-cache/audit';
      });
      req.flush('Error', { status: 500, statusText: 'Server Error' });

      expect(service.error()).toBeTruthy();
      expect(service.loading()).toBe(false);
    });
  });

  describe('loading state', function describeLoading() {
    it('should toggle loading correctly', function shouldToggleLoading() {
      expect(service.loading()).toBe(false);

      service.fetchStats();
      expect(service.loading()).toBe(true);

      const req = httpMock.expectOne('/api/admin/cusip-cache/stats');
      req.flush({
        totalEntries: 0,
        entriesBySource: {},
        oldestEntry: null,
        newestEntry: null,
        recentlyAdded: [],
        timestamp: '2025-03-06T12:00:00Z',
      });

      expect(service.loading()).toBe(false);
    });

    it('should set loading false on error', function shouldLoadingFalseOnError() {
      service.fetchStats();
      expect(service.loading()).toBe(true);

      const req = httpMock.expectOne('/api/admin/cusip-cache/stats');
      req.flush('Error', { status: 500, statusText: 'Server Error' });

      expect(service.loading()).toBe(false);
    });
  });
});
