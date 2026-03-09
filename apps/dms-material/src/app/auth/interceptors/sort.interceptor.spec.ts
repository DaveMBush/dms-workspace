import { HttpRequest, HttpResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { SortStateService } from '../../shared/services/sort-state.service';
import { sortInterceptor } from './sort.interceptor';

describe('sortInterceptor', () => {
  let mockSortStateService: {
    loadSortState: ReturnType<typeof vi.fn>;
  };
  let mockNext: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockSortStateService = {
      loadSortState: vi.fn(),
    };

    mockNext = vi.fn().mockReturnValue(of(new HttpResponse({ status: 200 })));

    TestBed.configureTestingModule({
      providers: [
        { provide: SortStateService, useValue: mockSortStateService },
      ],
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe.skip('universe endpoint sort headers', () => {
    it('should add X-Sort-Field header to universe requests', () => {
      mockSortStateService.loadSortState.mockReturnValue({
        field: 'name',
        order: 'asc',
      });

      const req = new HttpRequest('GET', '/api/universe');

      TestBed.runInInjectionContext(() => {
        sortInterceptor(req, mockNext);
      });

      const interceptedReq = mockNext.mock.calls[0][0] as HttpRequest<unknown>;
      expect(interceptedReq.headers.get('X-Sort-Field')).toBe('name');
    });

    it('should add X-Sort-Order header to universe requests', () => {
      mockSortStateService.loadSortState.mockReturnValue({
        field: 'name',
        order: 'asc',
      });

      const req = new HttpRequest('GET', '/api/universe');

      TestBed.runInInjectionContext(() => {
        sortInterceptor(req, mockNext);
      });

      const interceptedReq = mockNext.mock.calls[0][0] as HttpRequest<unknown>;
      expect(interceptedReq.headers.get('X-Sort-Order')).toBe('asc');
    });

    it('should read sort state from SortStateService for universes', () => {
      mockSortStateService.loadSortState.mockReturnValue({
        field: 'value',
        order: 'desc',
      });

      const req = new HttpRequest('GET', '/api/universe');

      TestBed.runInInjectionContext(() => {
        sortInterceptor(req, mockNext);
      });

      expect(mockSortStateService.loadSortState).toHaveBeenCalledWith(
        'universes'
      );
    });
  });

  describe.skip('trades endpoint sort headers', () => {
    it('should add sort headers to trades/open requests', () => {
      mockSortStateService.loadSortState.mockReturnValue({
        field: 'openDate',
        order: 'desc',
      });

      const req = new HttpRequest('GET', '/api/trades/open');

      TestBed.runInInjectionContext(() => {
        sortInterceptor(req, mockNext);
      });

      const interceptedReq = mockNext.mock.calls[0][0] as HttpRequest<unknown>;
      expect(interceptedReq.headers.get('X-Sort-Field')).toBe('openDate');
      expect(interceptedReq.headers.get('X-Sort-Order')).toBe('desc');
    });

    it('should add sort headers to trades/closed requests', () => {
      mockSortStateService.loadSortState.mockReturnValue({
        field: 'closeDate',
        order: 'desc',
      });

      const req = new HttpRequest('GET', '/api/trades/closed');

      TestBed.runInInjectionContext(() => {
        sortInterceptor(req, mockNext);
      });

      const interceptedReq = mockNext.mock.calls[0][0] as HttpRequest<unknown>;
      expect(interceptedReq.headers.get('X-Sort-Field')).toBe('closeDate');
      expect(interceptedReq.headers.get('X-Sort-Order')).toBe('desc');
    });

    it('should read sort state from SortStateService for trades-open', () => {
      mockSortStateService.loadSortState.mockReturnValue({
        field: 'openDate',
        order: 'desc',
      });

      const req = new HttpRequest('GET', '/api/trades/open');

      TestBed.runInInjectionContext(() => {
        sortInterceptor(req, mockNext);
      });

      expect(mockSortStateService.loadSortState).toHaveBeenCalledWith(
        'trades-open'
      );
    });

    it('should read sort state from SortStateService for trades-closed', () => {
      mockSortStateService.loadSortState.mockReturnValue({
        field: 'closeDate',
        order: 'desc',
      });

      const req = new HttpRequest('GET', '/api/trades/closed');

      TestBed.runInInjectionContext(() => {
        sortInterceptor(req, mockNext);
      });

      expect(mockSortStateService.loadSortState).toHaveBeenCalledWith(
        'trades-closed'
      );
    });
  });

  describe.skip('non-sortable endpoints', () => {
    it('should not add headers to auth endpoints', () => {
      const req = new HttpRequest('GET', '/api/auth/login');

      TestBed.runInInjectionContext(() => {
        sortInterceptor(req, mockNext);
      });

      const interceptedReq = mockNext.mock.calls[0][0] as HttpRequest<unknown>;
      expect(interceptedReq.headers.has('X-Sort-Field')).toBe(false);
      expect(interceptedReq.headers.has('X-Sort-Order')).toBe(false);
    });

    it('should not add headers to health endpoints', () => {
      const req = new HttpRequest('GET', '/health');

      TestBed.runInInjectionContext(() => {
        sortInterceptor(req, mockNext);
      });

      const interceptedReq = mockNext.mock.calls[0][0] as HttpRequest<unknown>;
      expect(interceptedReq.headers.has('X-Sort-Field')).toBe(false);
      expect(interceptedReq.headers.has('X-Sort-Order')).toBe(false);
    });

    it('should not add headers to unknown API endpoints', () => {
      const req = new HttpRequest('GET', '/api/other/endpoint');

      TestBed.runInInjectionContext(() => {
        sortInterceptor(req, mockNext);
      });

      const interceptedReq = mockNext.mock.calls[0][0] as HttpRequest<unknown>;
      expect(interceptedReq.headers.has('X-Sort-Field')).toBe(false);
      expect(interceptedReq.headers.has('X-Sort-Order')).toBe(false);
    });
  });

  describe.skip('backend default ordering fallback', () => {
    it('should not add sort headers when no state exists for universes', () => {
      mockSortStateService.loadSortState.mockReturnValue(null);

      const req = new HttpRequest('GET', '/api/universe');

      TestBed.runInInjectionContext(() => {
        sortInterceptor(req, mockNext);
      });

      const interceptedReq = mockNext.mock.calls[0][0] as HttpRequest<unknown>;
      expect(interceptedReq.headers.has('X-Sort-Field')).toBe(false);
      expect(interceptedReq.headers.has('X-Sort-Order')).toBe(false);
    });

    it('should not add sort headers when no state exists for trades', () => {
      mockSortStateService.loadSortState.mockReturnValue(null);

      const req = new HttpRequest('GET', '/api/trades/open');

      TestBed.runInInjectionContext(() => {
        sortInterceptor(req, mockNext);
      });

      const interceptedReq = mockNext.mock.calls[0][0] as HttpRequest<unknown>;
      expect(interceptedReq.headers.has('X-Sort-Field')).toBe(false);
      expect(interceptedReq.headers.has('X-Sort-Order')).toBe(false);
    });
  });
});
