import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideSmartNgRX } from '@smarttools/smart-signals';

import { UniverseEffectsService } from './universe-effect.service';
import { Universe } from './universe.interface';

describe('UniverseEffectsService', () => {
  let service: UniverseEffectsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideSmartNgRX(),
        UniverseEffectsService,
      ],
    });

    service = TestBed.inject(UniverseEffectsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('addSymbol', () => {
    it.skip('should call POST /api/universe/add with symbol data', () => {
      const mockSymbol: Partial<Universe> = {
        symbol: 'AAPL',
        risk_group_id: 'rg1',
      };

      service.add(mockSymbol as Universe).subscribe();

      const req = httpMock.expectOne('./api/universe/add');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(mockSymbol);
    });

    it.skip('should return universe entry on success', (done) => {
      const mockSymbol: Partial<Universe> = {
        symbol: 'AAPL',
        risk_group_id: 'rg1',
      };

      const mockResponse: Universe[] = [
        {
          id: 'new-id',
          symbol: 'AAPL',
          risk_group_id: 'rg1',
          distribution: 0,
          distributions_per_year: 0,
          last_price: 150.0,
          most_recent_sell_date: null,
          most_recent_sell_price: null,
          ex_date: '',
          expired: false,
          is_closed_end_fund: false,
          name: 'Apple Inc.',
          position: 0,
        },
      ];

      service.add(mockSymbol as Universe).subscribe((response) => {
        expect(response).toEqual(mockResponse);
        expect(response[0].id).toBe('new-id');
        expect(response[0].symbol).toBe('AAPL');
        done();
      });

      const req = httpMock.expectOne('./api/universe/add');
      req.flush(mockResponse);
    });

    it.skip('should handle 409 conflict error when symbol exists', (done) => {
      const mockSymbol: Partial<Universe> = {
        symbol: 'AAPL',
        risk_group_id: 'rg1',
      };

      service.add(mockSymbol as Universe).subscribe({
        next: () => fail('should have failed with 409 error'),
        error: (error: unknown) => {
          expect((error as { status: number }).status).toBe(409);
          expect(
            (error as { error: { message: string } }).error.message
          ).toContain('already exists');
          done();
        },
      });

      const req = httpMock.expectOne('./api/universe/add');
      req.flush(
        { message: 'Symbol AAPL already exists in universe' },
        { status: 409, statusText: 'Conflict' }
      );
    });

    it.skip('should handle network errors', (done) => {
      const mockSymbol: Partial<Universe> = {
        symbol: 'AAPL',
        risk_group_id: 'rg1',
      };

      service.add(mockSymbol as Universe).subscribe({
        next: () => fail('should have failed with network error'),
        error: (error: unknown) => {
          expect((error as { status: number }).status).toBe(0);
          expect((error as { error: unknown }).error).toBeInstanceOf(
            ProgressEvent
          );
          done();
        },
      });

      const req = httpMock.expectOne('./api/universe/add');
      req.error(new ProgressEvent('Network error'));
    });

    it.skip('should send correct request payload structure', () => {
      const mockSymbol: Partial<Universe> = {
        symbol: 'MSFT',
        risk_group_id: 'rg2',
      };

      service.add(mockSymbol as Universe).subscribe();

      const req = httpMock.expectOne('./api/universe/add');
      const requestBody = req.request.body as Partial<Universe>;
      expect(requestBody.symbol).toBe('MSFT');
      expect(requestBody.risk_group_id).toBe('rg2');
      expect(requestBody).toHaveProperty('symbol');
      expect(requestBody).toHaveProperty('risk_group_id');
    });

    it.skip('should handle 400 validation error', (done) => {
      const mockSymbol: Partial<Universe> = {
        symbol: '', // Invalid empty symbol
        risk_group_id: 'rg1',
      };

      service.add(mockSymbol as Universe).subscribe({
        next: () => fail('should have failed with validation error'),
        error: (error: unknown) => {
          expect((error as { status: number }).status).toBe(400);
          expect(
            (error as { error: { message: string } }).error.message
          ).toContain('validation');
          done();
        },
      });

      const req = httpMock.expectOne('./api/universe/add');
      req.flush(
        { message: 'Symbol validation failed' },
        { status: 400, statusText: 'Bad Request' }
      );
    });

    it.skip('should handle 404 error for invalid risk group', (done) => {
      const mockSymbol: Partial<Universe> = {
        symbol: 'AAPL',
        risk_group_id: 'invalid-rg',
      };

      service.add(mockSymbol as Universe).subscribe({
        next: () => fail('should have failed with 404 error'),
        error: (error: unknown) => {
          expect((error as { status: number }).status).toBe(404);
          expect(
            (error as { error: { message: string } }).error.message
          ).toContain('not found');
          done();
        },
      });

      const req = httpMock.expectOne('./api/universe/add');
      req.flush(
        { message: 'Risk group not found' },
        { status: 404, statusText: 'Not Found' }
      );
    });
  });
});
