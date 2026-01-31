import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { SymbolSearchService } from './symbol-search.service';
import { SymbolOption } from '../../components/symbol-autocomplete/symbol-option.interface';

describe('SymbolSearchService', () => {
  let service: SymbolSearchService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        SymbolSearchService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(SymbolSearchService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('searchSymbols', () => {
    it('should call Yahoo Finance search API with correct query', async () => {
      const query = 'AAPL';
      const mockResponse: SymbolOption[] = [
        { symbol: 'AAPL', name: 'Apple Inc.' },
        { symbol: 'AAPLW', name: 'Apple Inc. Warrants' },
      ];

      const resultPromise = new Promise<SymbolOption[]>((resolve) => {
        service.searchSymbols(query).subscribe((results) => {
          resolve(results);
        });
      });

      const req = httpMock.expectOne(
        (request) =>
          request.url.includes('/api/symbol/search') &&
          request.params.get('query') === query
      );
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);

      const results = await resultPromise;
      expect(results).toEqual(mockResponse);
      expect(results.length).toBe(2);
      expect(results[0].symbol).toBe('AAPL');
    });

    it('should return array of symbol results with correct structure', async () => {
      const query = 'MSFT';
      const mockResponse: SymbolOption[] = [
        { symbol: 'MSFT', name: 'Microsoft Corporation' },
      ];

      const resultPromise = new Promise<SymbolOption[]>((resolve) => {
        service.searchSymbols(query).subscribe((results) => {
          resolve(results);
        });
      });

      const req = httpMock.expectOne((request) =>
        request.url.includes('/api/symbol/search')
      );
      req.flush(mockResponse);

      const results = await resultPromise;
      expect(results[0]).toHaveProperty('symbol');
      expect(results[0]).toHaveProperty('name');
      expect(typeof results[0].symbol).toBe('string');
      expect(typeof results[0].name).toBe('string');
    });

    it('should handle empty results', async () => {
      const query = 'NONEXISTENT';
      const mockResponse: SymbolOption[] = [];

      const resultPromise = new Promise<SymbolOption[]>((resolve) => {
        service.searchSymbols(query).subscribe((results) => {
          resolve(results);
        });
      });

      const req = httpMock.expectOne((request) =>
        request.url.includes('/api/symbol/search')
      );
      req.flush(mockResponse);

      const results = await resultPromise;
      expect(results).toEqual([]);
      expect(results.length).toBe(0);
    });

    it('should handle API errors gracefully', async () => {
      const query = 'TEST';

      const errorPromise = new Promise<unknown>((_, reject) => {
        service.searchSymbols(query).subscribe({
          next: () => {
            throw new Error('Should have failed');
          },
          error: (error: unknown) => reject(error),
        });
      });

      const req = httpMock.expectOne((request) =>
        request.url.includes('/api/symbol/search')
      );
      req.flush('API Error', { status: 500, statusText: 'Server Error' });

      try {
        await errorPromise;
        throw new Error('Should have thrown an error');
      } catch (error: unknown) {
        expect((error as { status: number }).status).toBe(500);
      }
    });

    it('should handle network errors', async () => {
      const query = 'TEST';

      const errorPromise = new Promise<unknown>((_, reject) => {
        service.searchSymbols(query).subscribe({
          next: () => {
            throw new Error('Should have failed');
          },
          error: (error: unknown) => reject(error),
        });
      });

      const req = httpMock.expectOne((request) =>
        request.url.includes('/api/symbol/search')
      );
      req.error(new ProgressEvent('Network error'));

      try {
        await errorPromise;
        throw new Error('Should have thrown an error');
      } catch (error: unknown) {
        expect((error as { status: number }).status).toBe(0);
        expect((error as { error: unknown }).error).toBeInstanceOf(
          ProgressEvent
        );
      }
    });

    it.skip('should filter out invalid results', async () => {
      const query = 'AAPL';
      const mockResponse = [
        { symbol: 'AAPL', name: 'Apple Inc.' },
        { symbol: '', name: 'Invalid Entry' }, // Should be filtered out
        { symbol: 'AAPLW', name: 'Apple Warrants' },
      ];

      const resultPromise = new Promise<SymbolOption[]>((resolve) => {
        service.searchSymbols(query).subscribe((results) => {
          resolve(results);
        });
      });

      const req = httpMock.expectOne((request) =>
        request.url.includes('/api/symbol/search')
      );
      req.flush(mockResponse);

      const results = await resultPromise;
      expect(results.length).toBe(2);
      expect(results.every((r) => r.symbol.length > 0)).toBe(true);
    });

    it.skip('should limit results to maximum of 10 items', async () => {
      const query = 'A';
      const mockResponse: SymbolOption[] = Array.from(
        { length: 20 },
        (_, i) => ({
          symbol: `A${i}`,
          name: `Company ${i}`,
        })
      );

      const resultPromise = new Promise<SymbolOption[]>((resolve) => {
        service.searchSymbols(query).subscribe((results) => {
          resolve(results);
        });
      });

      const req = httpMock.expectOne((request) =>
        request.url.includes('/api/symbol/search')
      );
      req.flush(mockResponse);

      const results = await resultPromise;
      expect(results.length).toBeLessThanOrEqual(10);
    });
  });

  describe('debouncing', () => {
    it.skip('should debounce search requests by 300ms', fakeAsync(() => {
      const query1 = 'AA';
      const query2 = 'AAP';
      const query3 = 'AAPL';
      const mockResponse: SymbolOption[] = [
        { symbol: 'AAPL', name: 'Apple Inc.' },
      ];

      // Make three rapid calls
      service.searchSymbols(query1).subscribe();
      tick(100);
      service.searchSymbols(query2).subscribe();
      tick(100);
      service.searchSymbols(query3).subscribe();
      tick(300);

      // Only the last request should be made
      const requests = httpMock.match((request) =>
        request.url.includes('/api/symbol/search')
      );
      expect(requests.length).toBe(1);
      expect(requests[0].request.params.get('query')).toBe(query3);

      requests[0].flush(mockResponse);
    }));

    it.skip('should not debounce separate search sessions', fakeAsync(() => {
      const query1 = 'AAPL';
      const query2 = 'MSFT';
      const mockResponse: SymbolOption[] = [];

      // First search
      service.searchSymbols(query1).subscribe();
      tick(300);

      // Flush first request
      const req1 = httpMock.expectOne((request) =>
        request.url.includes('/api/symbol/search')
      );
      req1.flush(mockResponse);

      // Second search after debounce period
      service.searchSymbols(query2).subscribe();
      tick(300);

      // Both requests should have been made
      const req2 = httpMock.expectOne((request) =>
        request.url.includes('/api/symbol/search')
      );
      req2.flush(mockResponse);

      // Verify two separate requests were made
      expect(req1.request.params.get('query')).toBe(query1);
      expect(req2.request.params.get('query')).toBe(query2);
    }));
  });

  describe('result transformation', () => {
    it.skip('should transform API response to SymbolOption format', async () => {
      const query = 'AAPL';
      const apiResponse = {
        results: [
          { ticker: 'AAPL', company_name: 'Apple Inc.' },
          { ticker: 'AAPLW', company_name: 'Apple Warrants' },
        ],
      };

      const resultPromise = new Promise<SymbolOption[]>((resolve) => {
        service.searchSymbols(query).subscribe((results) => {
          resolve(results);
        });
      });

      const req = httpMock.expectOne((request) =>
        request.url.includes('/api/symbol/search')
      );
      req.flush(apiResponse);

      const results = await resultPromise;
      expect(results[0]).toHaveProperty('symbol');
      expect(results[0]).toHaveProperty('name');
      expect(results[0].symbol).toBe('AAPL');
      expect(results[0].name).toBe('Apple Inc.');
    });

    it.skip('should handle missing name field gracefully', async () => {
      const query = 'TEST';
      const apiResponse = {
        results: [{ ticker: 'TEST', company_name: null }],
      };

      const resultPromise = new Promise<SymbolOption[]>((resolve) => {
        service.searchSymbols(query).subscribe((results) => {
          resolve(results);
        });
      });

      const req = httpMock.expectOne((request) =>
        request.url.includes('/api/symbol/search')
      );
      req.flush(apiResponse);

      const results = await resultPromise;
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].symbol).toBe('TEST');
      expect(typeof results[0].name).toBe('string');
    });
  });

  describe('caching', () => {
    it.skip('should cache search results for identical queries', async () => {
      const query = 'AAPL';
      const mockResponse: SymbolOption[] = [
        { symbol: 'AAPL', name: 'Apple Inc.' },
      ];

      // First call
      const promise1 = new Promise<SymbolOption[]>((resolve) => {
        service.searchSymbols(query).subscribe((results) => {
          resolve(results);
        });
      });

      const req1 = httpMock.expectOne((request) =>
        request.url.includes('/api/symbol/search')
      );
      req1.flush(mockResponse);
      await promise1;

      // Second call with same query - should use cache
      const promise2 = new Promise<SymbolOption[]>((resolve) => {
        service.searchSymbols(query).subscribe((results) => {
          resolve(results);
        });
      });

      // Should not make another HTTP request
      httpMock.expectNone((request) =>
        request.url.includes('/api/symbol/search')
      );

      const results2 = await promise2;
      expect(results2).toEqual(mockResponse);
    });

    it.skip('should clear cache after 5 minutes', fakeAsync(() => {
      const query = 'AAPL';
      const mockResponse: SymbolOption[] = [
        { symbol: 'AAPL', name: 'Apple Inc.' },
      ];

      // First call
      service.searchSymbols(query).subscribe();
      const req1 = httpMock.expectOne((request) =>
        request.url.includes('/api/symbol/search')
      );
      req1.flush(mockResponse);

      // Wait 5 minutes
      tick(5 * 60 * 1000);

      // Second call should make new request
      service.searchSymbols(query).subscribe();
      const req2 = httpMock.expectOne((request) =>
        request.url.includes('/api/symbol/search')
      );
      req2.flush(mockResponse);

      // Should have made two separate requests
      expect(req1).toBeTruthy();
      expect(req2).toBeTruthy();
    }));
  });
});
