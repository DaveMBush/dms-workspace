import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

// Commented out until implementation - uncomment in AI.2
// import { ScreenerService } from './screener.service';

// Stub class for skipped tests - remove when implementing
class ScreenerService {
  loading = () => false;
  error = () => null;
  errorSignal$ = {
    set: (value: string) => {
      return value; /* stub */
    },
  };

  refresh = () => ({
    subscribe: () => {
      /* stub */
    },
  });
}

// DISABLE TESTS FOR CI - Will be enabled in implementation story
describe.skip('ScreenerService', () => {
  let service: ScreenerService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        ScreenerService,
      ],
    });

    service = TestBed.inject(ScreenerService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeDefined();
  });

  it('should have loading signal initialized to false', () => {
    expect(service.loading()).toBe(false);
  });

  it('should have error signal initialized to null', () => {
    expect(service.error()).toBe(null);
  });

  it('should call GET /api/screener on refresh()', () => {
    service.refresh();

    const req = httpMock.expectOne('/api/screener');
    expect(req.request.method).toBe('GET');

    req.flush({ success: true, count: 100 });
  });

  it('should set loading to true during refresh', () => {
    service.refresh();

    expect(service.loading()).toBe(true);

    const req = httpMock.expectOne('/api/screener');
    req.flush({ success: true });
  });

  it('should set loading to false after successful refresh', () => {
    service.refresh();

    const req = httpMock.expectOne('/api/screener');
    req.flush({ success: true });

    expect(service.loading()).toBe(false);
  });

  it('should clear error on successful refresh', () => {
    // Set initial error
    service.errorSignal$.set('Previous error');

    service.refresh();

    const req = httpMock.expectOne('/api/screener');
    req.flush({ success: true });

    expect(service.error()).toBe(null);
  });

  it('should handle HTTP error responses', () => {
    service.refresh();

    const req = httpMock.expectOne('/api/screener');
    req.flush('Error message', { status: 500, statusText: 'Server Error' });

    expect(service.loading()).toBe(false);
    expect(service.error()).toBeTruthy();
  });

  it('should set error message on failure', () => {
    service.refresh();

    const req = httpMock.expectOne('/api/screener');
    req.flush(
      { message: 'Scraper failed' },
      { status: 500, statusText: 'Server Error' }
    );

    expect(service.error()).toContain('failed');
  });

  it('should return observable from refresh()', () => {
    const result = service.refresh();
    expect(result).toBeDefined();
    expect(typeof result.subscribe).toBe('function');

    const req = httpMock.expectOne('/api/screener');
    req.flush({ success: true });
  });

  it('should handle network errors', () => {
    service.refresh();

    const req = httpMock.expectOne('/api/screener');
    req.error(new ProgressEvent('error'));

    expect(service.loading()).toBe(false);
    expect(service.error()).toBeTruthy();
  });
});
