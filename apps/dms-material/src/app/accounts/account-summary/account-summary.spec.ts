/* eslint-disable @typescript-eslint/dot-notation -- TDD RED phase: bracket notation needed for not-yet-implemented private members */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  provideHttpClientTesting,
  HttpTestingController,
} from '@angular/common/http/testing';
import {
  ActivatedRoute,
  convertToParamMap,
  provideRouter,
} from '@angular/router';
import { of } from 'rxjs';

import { AccountSummary } from './account-summary';

describe('AccountSummary - Service Integration', () => {
  let component: AccountSummary;
  let fixture: ComponentFixture<AccountSummary>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AccountSummary],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([
          {
            path: 'accounts/:id',
            component: AccountSummary,
          },
        ]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: convertToParamMap({ id: '123' }) },
            paramMap: of(convertToParamMap({ id: '123' })),
            params: of({ id: '123' }),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AccountSummary);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  describe.skip('Account Summary Service Integration', () => {
    it('should inject summary service on initialization', () => {
      expect(component['summaryService']).toBeDefined();
    });

    it('should call /api/summary with accountId parameter on init', () => {
      // Set mock accountId
      component['accountId'] = '123';
      component.ngOnInit();

      const req = httpMock.expectOne('/api/summary?accountId=123');
      expect(req.request.method).toBe('GET');

      req.flush({
        deposits: 100000,
        dividends: 2500,
        capitalGains: 5000,
        equities: 50000,
        income: 30000,
        tax_free_income: 20000,
      });
    });

    it('should get accountId from route parameter', () => {
      // Act
      component.ngOnInit();
      // Assert
      expect(component['accountId']).toBe('123');
    });

    it('should transform API response to allocation chart data', () => {
      component['accountId'] = '123';
      component.ngOnInit();

      const req = httpMock.expectOne('/api/summary?accountId=123');
      req.flush({
        deposits: 100000,
        dividends: 2500,
        capitalGains: 5000,
        equities: 50000,
        income: 30000,
        tax_free_income: 20000,
      });

      const chartData = component.allocationChartData();
      expect(chartData.labels).toEqual(['Equities', 'Income', 'Tax Free']);
      expect(chartData.datasets[0].data).toEqual([50000, 30000, 20000]);
    });

    it('should display loading state while fetching data', () => {
      component['accountId'] = '123';
      expect(component.loading()).toBe(false);

      component.ngOnInit();
      expect(component.loading()).toBe(true);

      const req = httpMock.expectOne('/api/summary?accountId=123');
      req.flush({
        deposits: 100000,
        dividends: 2500,
        capitalGains: 5000,
        equities: 50000,
        income: 30000,
        tax_free_income: 20000,
      });

      expect(component.loading()).toBe(false);
    });

    it('should handle API errors gracefully', () => {
      component['accountId'] = '123';
      component.ngOnInit();

      const req = httpMock.expectOne('/api/summary?accountId=123');
      req.error(new ProgressEvent('error'), { status: 500 });

      expect(component.error()).toBeTruthy();
      expect(component.loading()).toBe(false);
    });
  });

  describe.skip('Graph Integration', () => {
    it('should call /api/summary/graph with accountId', () => {
      component['accountId'] = '123';
      component['selectedMonth'].setValue('2025-03');
      component.ngOnInit();

      const req = httpMock.expectOne(
        '/api/summary/graph?month=2025-03&accountId=123'
      );
      expect(req.request.method).toBe('GET');
      req.flush([
        {
          month: '2025-01',
          deposits: 10000,
          dividends: 100,
          capitalGains: 200,
        },
        {
          month: '2025-02',
          deposits: 20000,
          dividends: 150,
          capitalGains: 300,
        },
        {
          month: '2025-03',
          deposits: 30000,
          dividends: 200,
          capitalGains: 400,
        },
      ]);
    });

    it('should transform graph data for performance chart', () => {
      component['accountId'] = '123';
      component['selectedMonth'].setValue('2025-03');
      component.ngOnInit();

      const req = httpMock.expectOne(
        '/api/summary/graph?month=2025-03&accountId=123'
      );
      req.flush([
        {
          month: '2025-01',
          deposits: 10000,
          dividends: 100,
          capitalGains: 200,
        },
        {
          month: '2025-02',
          deposits: 20000,
          dividends: 150,
          capitalGains: 300,
        },
        {
          month: '2025-03',
          deposits: 30000,
          dividends: 200,
          capitalGains: 400,
        },
      ]);

      const chartData = component.performanceChartData();
      expect(chartData.labels).toHaveLength(3);
      expect(chartData.datasets).toHaveLength(3);
    });
  });

  describe.skip('Available Months', () => {
    it('should fetch available months with accountId', () => {
      component['accountId'] = '123';
      component.ngOnInit();

      const req = httpMock.expectOne('/api/summary/months?accountId=123');
      expect(req.request.method).toBe('GET');
      req.flush([
        { month: '2025-01', label: 'January 2025' },
        { month: '2025-02', label: 'February 2025' },
        { month: '2025-03', label: 'March 2025' },
      ]);
    });

    it('should populate month selector options', () => {
      component['accountId'] = '123';
      component.ngOnInit();

      const req = httpMock.expectOne('/api/summary/months?accountId=123');
      req.flush([
        { month: '2025-01', label: 'January 2025' },
        { month: '2025-02', label: 'February 2025' },
      ]);

      expect(component.monthOptions()).toHaveLength(2);
    });
  });

  describe.skip('Error Handling', () => {
    it('should handle summary fetch errors', () => {
      component['accountId'] = '123';
      component.ngOnInit();

      const req = httpMock.expectOne('/api/summary?accountId=123');
      req.error(new ProgressEvent('error'));

      expect(component.error()).toBeTruthy();
    });

    it('should handle graph fetch errors', () => {
      component['accountId'] = '123';
      component['selectedMonth'].setValue('2025-03');
      component.ngOnInit();

      const req = httpMock.expectOne(
        '/api/summary/graph?month=2025-03&accountId=123'
      );
      req.error(new ProgressEvent('error'));

      expect(component.error()).toBeTruthy();
    });

    it('should handle months fetch errors', () => {
      component['accountId'] = '123';
      component.ngOnInit();

      const req = httpMock.expectOne('/api/summary/months?accountId=123');
      req.error(new ProgressEvent('error'));

      expect(component.error()).toBeTruthy();
    });

    it('should display default data on error', () => {
      component['accountId'] = '123';
      component.ngOnInit();

      const req = httpMock.expectOne('/api/summary?accountId=123');
      req.error(new ProgressEvent('error'));

      const chartData = component.allocationChartData();
      expect(chartData.datasets[0].data).toEqual([0, 0, 0]);
    });
  });
});
