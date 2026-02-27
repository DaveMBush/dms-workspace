import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { SummaryService } from './summary.service';

describe('SummaryService', () => {
  let service: SummaryService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        SummaryService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(SummaryService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeDefined();
  });

  describe('getSummary', () => {
    it('should fetch summary data from /api/summary with month parameter', () => {
      const mockResponse = {
        deposits: 100000,
        dividends: 2500,
        capitalGains: 5000,
        equities: 50000,
        income: 30000,
        tax_free_income: 20000,
      };

      service.fetchSummary('2025-03');

      const req = httpMock.expectOne(
        (request) =>
          request.url === '/api/summary' &&
          request.params.get('month') === '2025-03'
      );
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);

      expect(service.summary()).toEqual(mockResponse);
    });

    it('should return default summary when no data loaded', () => {
      const summary = service.summary();
      expect(summary.deposits).toBe(0);
      expect(summary.dividends).toBe(0);
      expect(summary.capitalGains).toBe(0);
      expect(summary.equities).toBe(0);
      expect(summary.income).toBe(0);
      expect(summary.tax_free_income).toBe(0);
    });

    it('should update summary signal after successful API call', () => {
      service.fetchSummary('2025-03');

      const req = httpMock.expectOne(
        (request) => request.url === '/api/summary'
      );
      req.flush({
        deposits: 200000,
        dividends: 8000,
        capitalGains: 15000,
        equities: 80000,
        income: 60000,
        tax_free_income: 60000,
      });

      expect(service.summary().deposits).toBe(200000);
      expect(service.summary().capitalGains).toBe(15000);
    });
  });

  describe('getGraph', () => {
    it('should fetch graph data from /api/summary/graph', () => {
      service.fetchGraph();

      const req = httpMock.expectOne(
        (request) => request.url === '/api/summary/graph'
      );
      expect(req.request.method).toBe('GET');
      expect(req.request.params.has('year')).toBe(true);
      expect(req.request.params.get('time_period')).toBe('year');

      req.flush([
        {
          month: '01-2025',
          deposits: 40000,
          dividends: 50,
          capitalGains: 0,
        },
      ]);
    });

    it('should return empty array when no graph data loaded', () => {
      expect(service.graph()).toEqual([]);
    });

    it('should update graph signal after successful API call', () => {
      const mockGraph = [
        {
          month: '01-2025',
          deposits: 40000,
          dividends: 50,
          capitalGains: 0,
        },
        {
          month: '02-2025',
          deposits: 40200,
          dividends: 100,
          capitalGains: 100,
        },
      ];

      service.fetchGraph();

      const req = httpMock.expectOne(
        (request) => request.url === '/api/summary/graph'
      );
      req.flush(mockGraph);

      expect(service.graph().length).toBe(2);
      expect(service.graph()[0].month).toBe('01-2025');
    });
  });

  describe('getAvailableMonths', () => {
    it('should fetch available months from /api/summary/months', () => {
      service.fetchMonths();

      const req = httpMock.expectOne('/api/summary/months');
      expect(req.request.method).toBe('GET');

      req.flush([
        { month: '2025-01', label: '01/2025' },
        { month: '2025-02', label: '02/2025' },
      ]);
    });

    it('should return empty array when no months loaded', () => {
      expect(service.months()).toEqual([]);
    });

    it('should transform months to label/value format', () => {
      service.fetchMonths();

      const req = httpMock.expectOne('/api/summary/months');
      req.flush([
        { month: '2025-01', label: '01/2025' },
        { month: '2025-02', label: '02/2025' },
        { month: '2025-03', label: '03/2025' },
      ]);

      const months = service.months();
      expect(months.length).toBe(3);
      expect(months[0]).toEqual({ label: '01/2025', value: '2025-01' });
      expect(months[1]).toEqual({ label: '02/2025', value: '2025-02' });
    });
  });

  describe('error handling', () => {
    it('should handle HTTP errors on summary fetch', () => {
      service.fetchSummary('2025-03');

      const req = httpMock.expectOne(
        (request) => request.url === '/api/summary'
      );
      req.flush('Error', { status: 500, statusText: 'Server Error' });

      expect(service.error()).toBeTruthy();
    });

    it('should handle HTTP errors on graph fetch', () => {
      service.fetchGraph();

      const req = httpMock.expectOne(
        (request) => request.url === '/api/summary/graph'
      );
      req.flush('Error', { status: 500, statusText: 'Server Error' });

      expect(service.error()).toBeTruthy();
    });

    it('should handle HTTP errors on months fetch', () => {
      service.fetchMonths();

      const req = httpMock.expectOne('/api/summary/months');
      req.flush('Error', { status: 500, statusText: 'Server Error' });

      expect(service.error()).toBeTruthy();
    });

    it('should clear error on successful subsequent request', () => {
      // First request fails
      service.fetchSummary('2025-03');
      const req1 = httpMock.expectOne(
        (request) => request.url === '/api/summary'
      );
      req1.flush('Error', { status: 500, statusText: 'Server Error' });

      expect(service.error()).toBeTruthy();

      // Second request succeeds
      service.fetchSummary('2025-03');
      const req2 = httpMock.expectOne(
        (request) => request.url === '/api/summary'
      );
      req2.flush({
        deposits: 100000,
        dividends: 2500,
        capitalGains: 5000,
        equities: 50000,
        income: 30000,
        tax_free_income: 20000,
      });

      expect(service.error()).toBeNull();
    });
  });

  describe('loading state', () => {
    it('should set loading to true during summary fetch', () => {
      expect(service.loading()).toBe(false);

      service.fetchSummary('2025-03');

      expect(service.loading()).toBe(true);

      const req = httpMock.expectOne(
        (request) => request.url === '/api/summary'
      );
      req.flush({
        deposits: 0,
        dividends: 0,
        capitalGains: 0,
        equities: 0,
        income: 0,
        tax_free_income: 0,
      });

      expect(service.loading()).toBe(false);
    });

    it('should set loading to false after error', () => {
      service.fetchSummary('2025-03');

      expect(service.loading()).toBe(true);

      const req = httpMock.expectOne(
        (request) => request.url === '/api/summary'
      );
      req.flush('Error', { status: 500, statusText: 'Server Error' });

      expect(service.loading()).toBe(false);
    });
  });

  describe('Month Caching', () => {
    it('should cache months data after first fetch', () => {
      service.fetchMonths();

      const req = httpMock.expectOne('/api/summary/months');
      req.flush([
        { month: '2025-01', label: '01/2025' },
        { month: '2025-02', label: '02/2025' },
      ]);

      // Second fetch should not make a new HTTP request
      service.fetchMonths();
      httpMock.expectNone('/api/summary/months');

      expect(service.months().length).toBe(2);
    });

    it('should refresh months cache when invalidateMonthsCache is called', () => {
      service.fetchMonths();

      const req1 = httpMock.expectOne('/api/summary/months');
      req1.flush([{ month: '2025-01', label: '01/2025' }]);

      // Invalidate cache
      service.invalidateMonthsCache();

      // Next fetch should make a new HTTP request
      service.fetchMonths();
      const req2 = httpMock.expectOne('/api/summary/months');
      req2.flush([
        { month: '2025-01', label: '01/2025' },
        { month: '2025-02', label: '02/2025' },
      ]);

      expect(service.months().length).toBe(2);
    });

    it('should set loading during months fetch', () => {
      expect(service.loading()).toBe(false);

      service.fetchMonths();

      expect(service.loading()).toBe(true);

      const req = httpMock.expectOne('/api/summary/months');
      req.flush([{ month: '2025-01', label: '01/2025' }]);

      expect(service.loading()).toBe(false);
    });
  });
});
