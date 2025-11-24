/* eslint-disable @typescript-eslint/unbound-method -- Required for Vitest mocking in tests */
import {
  HttpClient,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { PerformanceLoggingService } from '../../shared/services/performance-logging.service';
import { performanceInterceptor } from './performance.interceptor';

describe('PerformanceInterceptor', () => {
  let httpClient: HttpClient;
  let httpTestingController: HttpTestingController;
  let mockPerformanceLogging: PerformanceLoggingService;

  beforeEach(() => {
    mockPerformanceLogging = {
      logPerformanceMetric: vi.fn(),
    } as unknown as PerformanceLoggingService;

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([performanceInterceptor])),
        provideHttpClientTesting(),
        {
          provide: PerformanceLoggingService,
          useValue: mockPerformanceLogging,
        },
      ],
    });

    httpClient = TestBed.inject(HttpClient);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
    vi.clearAllMocks();
  });

  describe('request timing', () => {
    it('should measure successful request performance', () => {
      const testUrl = '/api/auth/login';
      const testData = { username: 'test' };

      httpClient.post(testUrl, testData).subscribe();

      const req = httpTestingController.expectOne(testUrl);
      expect(req.request.method).toBe('POST');

      // Respond with success
      req.flush({ token: 'test-token' }, { status: 200, statusText: 'OK' });

      expect(mockPerformanceLogging.logPerformanceMetric).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'auth-login',
          success: true,
          statusCode: 200,
          url: testUrl,
          method: 'POST',
          duration: expect.any(Number),
          startTime: expect.any(Number),
          endTime: expect.any(Number),
        })
      );
    });

    it('should measure failed request performance', () => {
      const testUrl = '/api/data';

      httpClient.get(testUrl).subscribe({
        error: () => {
          // Expected error
        },
      });

      const req = httpTestingController.expectOne(testUrl);

      // Respond with error
      req.flush(
        { error: 'Server Error' },
        { status: 500, statusText: 'Internal Server Error' }
      );

      expect(mockPerformanceLogging.logPerformanceMetric).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'api-get',
          success: false,
          statusCode: 500,
          url: testUrl,
          method: 'GET',
        })
      );
    });
  });

  describe('operation detection', () => {
    it('should detect auth login operation', () => {
      httpClient.post('/api/auth/login', {}).subscribe();

      const req = httpTestingController.expectOne('/api/auth/login');
      req.flush({});

      expect(mockPerformanceLogging.logPerformanceMetric).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'auth-login',
        })
      );
    });

    it('should detect auth refresh operation', () => {
      httpClient.post('/api/auth/refresh', {}).subscribe();

      const req = httpTestingController.expectOne('/api/auth/refresh');
      req.flush({});

      expect(mockPerformanceLogging.logPerformanceMetric).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'auth-refresh',
        })
      );
    });

    it('should detect auth logout operation', () => {
      httpClient.post('/api/auth/logout', {}).subscribe();

      const req = httpTestingController.expectOne('/api/auth/logout');
      req.flush({});

      expect(mockPerformanceLogging.logPerformanceMetric).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'auth-logout',
        })
      );
    });

    it('should detect general auth operations', () => {
      httpClient.get('/api/auth/profile').subscribe();

      const req = httpTestingController.expectOne('/api/auth/profile');
      req.flush({});

      expect(mockPerformanceLogging.logPerformanceMetric).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'auth-general',
        })
      );
    });

    it('should detect API operations by method', () => {
      const testCases = [
        { method: 'GET', expected: 'api-get' },
        { method: 'POST', expected: 'api-post' },
        { method: 'PUT', expected: 'api-put' },
        { method: 'DELETE', expected: 'api-delete' },
      ];

      testCases.forEach(({ method, expected }) => {
        const url = '/api/data';

        if (method === 'GET') {
          httpClient.get(url).subscribe();
        } else if (method === 'POST') {
          httpClient.post(url, {}).subscribe();
        } else if (method === 'PUT') {
          httpClient.put(url, {}).subscribe();
        } else if (method === 'DELETE') {
          httpClient.delete(url).subscribe();
        }

        const req = httpTestingController.expectOne(url);
        req.flush({});

        expect(
          mockPerformanceLogging.logPerformanceMetric
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            operation: expected,
          })
        );
      });
    });

    it('should detect non-API operations', () => {
      httpClient.get('/some-other-endpoint').subscribe();

      const req = httpTestingController.expectOne('/some-other-endpoint');
      req.flush({});

      expect(mockPerformanceLogging.logPerformanceMetric).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'get-request',
        })
      );
    });
  });

  describe('request ID handling', () => {
    it('should use existing X-Request-ID header', () => {
      const testRequestId = 'existing-request-id-123';

      const request = httpClient.get('/api/test', {
        headers: { 'X-Request-ID': testRequestId },
      });
      request.subscribe();

      const req = httpTestingController.expectOne('/api/test');
      req.flush({});

      expect(mockPerformanceLogging.logPerformanceMetric).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: testRequestId,
        })
      );
    });

    it('should generate fallback request ID when none exists', () => {
      httpClient.get('/api/test').subscribe();

      const req = httpTestingController.expectOne('/api/test');
      req.flush({});

      expect(mockPerformanceLogging.logPerformanceMetric).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: expect.stringMatching(
            /^perf-[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/
          ),
        })
      );
    });
  });

  describe('cache hit detection', () => {
    it('should detect cache hit from response headers', () => {
      httpClient.get('/api/cached-data').subscribe();

      const req = httpTestingController.expectOne('/api/cached-data');
      req.flush(
        { data: 'cached' },
        {
          status: 200,
          statusText: 'OK',
          headers: { 'X-Cache-Status': 'HIT' },
        }
      );

      expect(mockPerformanceLogging.logPerformanceMetric).toHaveBeenCalledWith(
        expect.objectContaining({
          cacheHit: true,
        })
      );
    });

    it('should detect cache miss from response headers', () => {
      httpClient.get('/api/fresh-data').subscribe();

      const req = httpTestingController.expectOne('/api/fresh-data');
      req.flush(
        { data: 'fresh' },
        {
          status: 200,
          statusText: 'OK',
          headers: { 'X-Cache-Status': 'MISS' },
        }
      );

      expect(mockPerformanceLogging.logPerformanceMetric).toHaveBeenCalledWith(
        expect.objectContaining({
          cacheHit: false,
        })
      );
    });

    it('should handle undefined cache status', () => {
      httpClient.get('/api/no-cache-header').subscribe();

      const req = httpTestingController.expectOne('/api/no-cache-header');
      req.flush({ data: 'no cache info' });

      expect(mockPerformanceLogging.logPerformanceMetric).toHaveBeenCalledWith(
        expect.objectContaining({
          cacheHit: undefined,
        })
      );
    });
  });

  describe('timing accuracy', () => {
    it('should record meaningful duration', async () => {
      httpClient.get('/api/slow-endpoint').subscribe();

      const req = httpTestingController.expectOne('/api/slow-endpoint');

      // Simulate some processing time
      await new Promise((resolve) => setTimeout(resolve, 10));

      req.flush({ data: 'response' });

      expect(mockPerformanceLogging.logPerformanceMetric).toHaveBeenCalledWith(
        expect.objectContaining({
          duration: expect.any(Number),
          startTime: expect.any(Number),
          endTime: expect.any(Number),
        })
      );

      const call = mockPerformanceLogging.logPerformanceMetric.mock.calls[0][0];
      expect(call.endTime).toBeGreaterThan(call.startTime);
      expect(call.duration).toBe(call.endTime - call.startTime);
      expect(call.duration).toBeGreaterThan(0);
    });
  });

  describe('error scenarios', () => {
    it('should handle network errors', () => {
      httpClient.get('/api/network-error').subscribe({
        error: () => {
          // Expected error
        },
      });

      const req = httpTestingController.expectOne('/api/network-error');

      // Simulate network error
      req.error(new ProgressEvent('Network Error'));

      expect(mockPerformanceLogging.logPerformanceMetric).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          statusCode: 0,
        })
      );
    });

    it('should handle timeout errors', () => {
      httpClient.get('/api/timeout').subscribe({
        error: () => {
          // Expected error
        },
      });

      const req = httpTestingController.expectOne('/api/timeout');

      // Simulate timeout
      req.error(new ProgressEvent('Timeout'), {
        status: 0,
        statusText: 'Unknown Error',
      });

      expect(mockPerformanceLogging.logPerformanceMetric).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          statusCode: 0,
        })
      );
    });
  });
});
