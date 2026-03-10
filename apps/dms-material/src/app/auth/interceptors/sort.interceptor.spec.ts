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

  describe('universe endpoint sort params', () => {
    it('should add sortBy query param for universe symbol field', () => {
      mockSortStateService.loadSortState.mockReturnValue({
        field: 'symbol',
        order: 'asc',
      });

      const req = new HttpRequest('GET', '/api/universe');

      TestBed.runInInjectionContext(() => {
        sortInterceptor(req, mockNext);
      });

      const interceptedReq = mockNext.mock.calls[0][0] as HttpRequest<unknown>;
      expect(interceptedReq.params.get('sortBy')).toBe('symbol');
    });

    it('should add sortOrder query param for universe requests', () => {
      mockSortStateService.loadSortState.mockReturnValue({
        field: 'symbol',
        order: 'desc',
      });

      const req = new HttpRequest('GET', '/api/universe');

      TestBed.runInInjectionContext(() => {
        sortInterceptor(req, mockNext);
      });

      const interceptedReq = mockNext.mock.calls[0][0] as HttpRequest<unknown>;
      expect(interceptedReq.params.get('sortOrder')).toBe('desc');
    });

    it('should map risk_group field to name for universe requests', () => {
      mockSortStateService.loadSortState.mockReturnValue({
        field: 'risk_group',
        order: 'asc',
      });

      const req = new HttpRequest('GET', '/api/universe');

      TestBed.runInInjectionContext(() => {
        sortInterceptor(req, mockNext);
      });

      const interceptedReq = mockNext.mock.calls[0][0] as HttpRequest<unknown>;
      expect(interceptedReq.params.get('sortBy')).toBe('name');
    });

    it('should read sort state from SortStateService for universes', () => {
      mockSortStateService.loadSortState.mockReturnValue({
        field: 'symbol',
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

  describe('trades endpoint sort params', () => {
    it('should map buyDate to openDate for trades/open requests', () => {
      mockSortStateService.loadSortState.mockReturnValue({
        field: 'buyDate',
        order: 'desc',
      });

      const req = new HttpRequest('GET', '/api/trades/open');

      TestBed.runInInjectionContext(() => {
        sortInterceptor(req, mockNext);
      });

      const interceptedReq = mockNext.mock.calls[0][0] as HttpRequest<unknown>;
      expect(interceptedReq.params.get('sortBy')).toBe('openDate');
      expect(interceptedReq.params.get('sortOrder')).toBe('desc');
    });

    it('should pass symbol unchanged for trades/open requests', () => {
      mockSortStateService.loadSortState.mockReturnValue({
        field: 'symbol',
        order: 'desc',
      });

      const req = new HttpRequest('GET', '/api/trades/open');

      TestBed.runInInjectionContext(() => {
        sortInterceptor(req, mockNext);
      });

      const interceptedReq = mockNext.mock.calls[0][0] as HttpRequest<unknown>;
      expect(interceptedReq.params.get('sortBy')).toBe('symbol');
      expect(interceptedReq.params.get('sortOrder')).toBe('desc');
    });

    it('should pass symbol unchanged for trades/closed requests', () => {
      mockSortStateService.loadSortState.mockReturnValue({
        field: 'symbol',
        order: 'asc',
      });

      const req = new HttpRequest('GET', '/api/trades/closed');

      TestBed.runInInjectionContext(() => {
        sortInterceptor(req, mockNext);
      });

      const interceptedReq = mockNext.mock.calls[0][0] as HttpRequest<unknown>;
      expect(interceptedReq.params.get('sortBy')).toBe('symbol');
      expect(interceptedReq.params.get('sortOrder')).toBe('asc');
    });

    it('should pass unrealizedGain unchanged for trades/open requests', () => {
      mockSortStateService.loadSortState.mockReturnValue({
        field: 'unrealizedGain',
        order: 'asc',
      });

      const req = new HttpRequest('GET', '/api/trades/open');

      TestBed.runInInjectionContext(() => {
        sortInterceptor(req, mockNext);
      });

      const interceptedReq = mockNext.mock.calls[0][0] as HttpRequest<unknown>;
      expect(interceptedReq.params.get('sortBy')).toBe('unrealizedGain');
    });

    it('should map sell_date to closeDate for trades/closed requests', () => {
      mockSortStateService.loadSortState.mockReturnValue({
        field: 'sell_date',
        order: 'desc',
      });

      const req = new HttpRequest('GET', '/api/trades/closed');

      TestBed.runInInjectionContext(() => {
        sortInterceptor(req, mockNext);
      });

      const interceptedReq = mockNext.mock.calls[0][0] as HttpRequest<unknown>;
      expect(interceptedReq.params.get('sortBy')).toBe('closeDate');
      expect(interceptedReq.params.get('sortOrder')).toBe('desc');
    });

    it('should read sort state from SortStateService for trades-open', () => {
      mockSortStateService.loadSortState.mockReturnValue({
        field: 'buyDate',
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
        field: 'sell_date',
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

  describe('unmapped field names', () => {
    it('should skip sort params for unmapped universe fields', () => {
      mockSortStateService.loadSortState.mockReturnValue({
        field: 'yield_percent',
        order: 'asc',
      });

      const req = new HttpRequest('GET', '/api/universe');

      TestBed.runInInjectionContext(() => {
        sortInterceptor(req, mockNext);
      });

      const interceptedReq = mockNext.mock.calls[0][0] as HttpRequest<unknown>;
      expect(interceptedReq.params.has('sortBy')).toBe(false);
      expect(interceptedReq.params.has('sortOrder')).toBe(false);
    });

    it('should skip sort params for unmapped open trades fields', () => {
      mockSortStateService.loadSortState.mockReturnValue({
        field: 'unrealizedGainPercent',
        order: 'desc',
      });

      const req = new HttpRequest('GET', '/api/trades/open');

      TestBed.runInInjectionContext(() => {
        sortInterceptor(req, mockNext);
      });

      const interceptedReq = mockNext.mock.calls[0][0] as HttpRequest<unknown>;
      expect(interceptedReq.params.has('sortBy')).toBe(false);
    });
  });

  describe('non-sortable endpoints', () => {
    it('should not add params to auth endpoints', () => {
      const req = new HttpRequest('GET', '/api/auth/login');

      TestBed.runInInjectionContext(() => {
        sortInterceptor(req, mockNext);
      });

      expect(mockSortStateService.loadSortState).not.toHaveBeenCalled();
      const interceptedReq = mockNext.mock.calls[0][0] as HttpRequest<unknown>;
      expect(interceptedReq.params.has('sortBy')).toBe(false);
      expect(interceptedReq.params.has('sortOrder')).toBe(false);
    });

    it('should not add params to health endpoints', () => {
      const req = new HttpRequest('GET', '/health');

      TestBed.runInInjectionContext(() => {
        sortInterceptor(req, mockNext);
      });

      expect(mockSortStateService.loadSortState).not.toHaveBeenCalled();
      const interceptedReq = mockNext.mock.calls[0][0] as HttpRequest<unknown>;
      expect(interceptedReq.params.has('sortBy')).toBe(false);
    });

    it('should not add params to unknown API endpoints', () => {
      const req = new HttpRequest('GET', '/api/other/endpoint');

      TestBed.runInInjectionContext(() => {
        sortInterceptor(req, mockNext);
      });

      expect(mockSortStateService.loadSortState).not.toHaveBeenCalled();
      const interceptedReq = mockNext.mock.calls[0][0] as HttpRequest<unknown>;
      expect(interceptedReq.params.has('sortBy')).toBe(false);
    });
  });

  describe('backend default ordering fallback', () => {
    it('should not add sort params when no state exists for universes', () => {
      mockSortStateService.loadSortState.mockReturnValue(null);

      const req = new HttpRequest('GET', '/api/universe');

      TestBed.runInInjectionContext(() => {
        sortInterceptor(req, mockNext);
      });

      const interceptedReq = mockNext.mock.calls[0][0] as HttpRequest<unknown>;
      expect(interceptedReq.params.has('sortBy')).toBe(false);
      expect(interceptedReq.params.has('sortOrder')).toBe(false);
    });

    it('should not add sort params when no state exists for trades', () => {
      mockSortStateService.loadSortState.mockReturnValue(null);

      const req = new HttpRequest('GET', '/api/trades/open');

      TestBed.runInInjectionContext(() => {
        sortInterceptor(req, mockNext);
      });

      const interceptedReq = mockNext.mock.calls[0][0] as HttpRequest<unknown>;
      expect(interceptedReq.params.has('sortBy')).toBe(false);
      expect(interceptedReq.params.has('sortOrder')).toBe(false);
    });
  });
});
