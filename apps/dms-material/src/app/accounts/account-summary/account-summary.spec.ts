/* eslint-disable @typescript-eslint/dot-notation -- bracket notation needed for private members */
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
import type { GraphPoint } from '../../global/services/graph-point.interface';
import type { Summary } from '../../global/services/summary.interface';

function createMockSummary(overrides?: Partial<Summary>): Summary {
  return {
    deposits: 100000,
    dividends: 2500,
    capitalGains: 5000,
    equities: 50000,
    income: 30000,
    tax_free_income: 20000,
    ...(overrides ?? {}),
  };
}

function createMockGraphData(): GraphPoint[] {
  return [
    { month: '2025-01', deposits: 10000, dividends: 100, capitalGains: 200 },
    { month: '2025-02', deposits: 20000, dividends: 150, capitalGains: 300 },
    { month: '2025-03', deposits: 30000, dividends: 200, capitalGains: 400 },
  ];
}

function createMockMonths(): Array<{ month: string; label: string }> {
  return [
    { month: '2025-01', label: 'January 2025' },
    { month: '2025-02', label: 'February 2025' },
    { month: '2025-03', label: 'March 2025' },
  ];
}

function flushPendingRequests(httpMock: HttpTestingController): void {
  const pending = httpMock.match(() => true);
  for (const req of pending) {
    const url = req.request.url;
    if (url.includes('/api/summary/graph')) {
      req.flush([]);
    } else if (url.includes('/api/summary/months')) {
      req.flush([]);
    } else if (url.includes('/api/summary/years')) {
      req.flush([]);
    } else if (url.includes('/api/summary')) {
      req.flush({
        deposits: 0,
        dividends: 0,
        capitalGains: 0,
        equities: 0,
        income: 0,
        tax_free_income: 0,
      });
    }
  }
}

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
    flushPendingRequests(httpMock);
    httpMock.verify();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  describe('Account Summary Service Integration', () => {
    it('should inject summary service on initialization', () => {
      expect(component['summaryService']).toBeDefined();
    });

    it('should call /api/summary with accountId parameter on init', () => {
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

  describe('Graph Integration', () => {
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

  describe('Available Months', () => {
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

      expect(component.monthOptions$()).toHaveLength(2);
    });
  });

  describe('Error Handling', () => {
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

  describe('Account Pie Chart Display', () => {
    it('should configure pie chart with account allocation data', () => {
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

    it('should display three risk group segments', () => {
      component['accountId'] = '123';
      component.ngOnInit();

      const req = httpMock.expectOne('/api/summary?accountId=123');
      req.flush({
        deposits: 100000,
        dividends: 2500,
        capitalGains: 5000,
        equities: 40000,
        income: 35000,
        tax_free_income: 25000,
      });

      const chartData = component.allocationChartData();
      expect(chartData.labels).toHaveLength(3);
      expect(chartData.datasets[0].data).toHaveLength(3);
      expect(chartData.labels).toContain('Equities');
      expect(chartData.labels).toContain('Income');
      expect(chartData.labels).toContain('Tax Free');
    });

    it('should use correct colors for risk group segments', () => {
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
      expect(chartData.datasets[0].backgroundColor).toEqual([
        '#3B82F6', // Blue for Equities
        '#10B981', // Green for Income
        '#F59E0B', // Orange for Tax Free
      ]);
    });

    it('should match global summary chart colors', () => {
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
      const colors = chartData.datasets[0].backgroundColor as string[];
      expect(colors[0]).toBe('#3B82F6');
      expect(colors[1]).toBe('#10B981');
      expect(colors[2]).toBe('#F59E0B');
    });

    it('should handle account with zero values', () => {
      component['accountId'] = '123';
      component.ngOnInit();

      const req = httpMock.expectOne('/api/summary?accountId=123');
      req.flush({
        deposits: 0,
        dividends: 0,
        capitalGains: 0,
        equities: 0,
        income: 0,
        tax_free_income: 0,
      });

      const chartData = component.allocationChartData();
      expect(chartData.datasets[0].data).toEqual([0, 0, 0]);
      expect(component.hasAllocationData$()).toBe(false);
    });

    it('should handle empty data with default values', () => {
      const chartData = component.allocationChartData();
      expect(chartData.labels).toEqual(['Equities', 'Income', 'Tax Free']);
      expect(chartData.datasets[0].data).toEqual([0, 0, 0]);
    });

    it('should indicate when allocation data is available', () => {
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

      expect(component.hasAllocationData$()).toBe(true);
    });

    it('should configure pie chart options with responsive settings', () => {
      const options = component.pieChartOptions;
      expect(options).toBeDefined();
      expect(options!.responsive).toBe(true);
      expect(options!.maintainAspectRatio).toBe(true);
    });

    it('should configure legend display at bottom position', () => {
      const options = component.pieChartOptions;
      expect(options!.plugins).toBeDefined();
      expect(options!.plugins!.legend).toBeDefined();
      expect(options!.plugins!.legend!.display).toBe(true);
      expect(options!.plugins!.legend!.position).toBe('bottom');
    });

    it('should configure tooltip with currency formatting callback', () => {
      const options = component.pieChartOptions;
      expect(options!.plugins!.tooltip).toBeDefined();
      expect(options!.plugins!.tooltip!.callbacks).toBeDefined();
      expect(options!.plugins!.tooltip!.callbacks!.label).toBeDefined();
    });

    it('should format tooltip with currency amount and percentage', () => {
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

      const options = component.pieChartOptions;
      const tooltipCallback = options!.plugins!.tooltip!.callbacks!.label;

      const tooltipItem = {
        label: 'Equities',
        raw: 50000,
        parsed: 50000,
        dataIndex: 0,
        dataset: { data: [50000, 30000, 20000] },
      };

      const result = (tooltipCallback as (...args: unknown[]) => string)(
        tooltipItem
      );
      expect(result).toContain('$50,000');
      expect(result).toContain('50%');
    });

    it('should handle tooltip with undefined label', () => {
      const options = component.pieChartOptions;
      const tooltipCallback = options!.plugins!.tooltip!.callbacks!.label;

      const tooltipItem = {
        label: undefined,
        raw: 50000,
        parsed: 50000,
        dataIndex: 0,
        dataset: { data: [50000, 30000, 20000] },
      };

      const result = (tooltipCallback as (...args: unknown[]) => string)(
        tooltipItem
      );
      expect(result).toContain('$50,000');
    });

    it('should handle tooltip when total is zero', () => {
      const options = component.pieChartOptions;
      const tooltipCallback = options!.plugins!.tooltip!.callbacks!.label;

      const tooltipItem = {
        label: 'Equities',
        raw: 0,
        parsed: 0,
        dataIndex: 0,
        dataset: { data: [0, 0, 0] },
      };

      const result = (tooltipCallback as (...args: unknown[]) => string)(
        tooltipItem
      );
      expect(result).toContain('Equities');
      expect(result).toContain('0%');
    });

    it('should handle single risk group allocation', () => {
      component['accountId'] = '123';
      component.ngOnInit();

      const req = httpMock.expectOne('/api/summary?accountId=123');
      req.flush({
        deposits: 50000,
        dividends: 500,
        capitalGains: 1000,
        equities: 50000,
        income: 0,
        tax_free_income: 0,
      });

      const chartData = component.allocationChartData();
      expect(chartData.datasets[0].data).toEqual([50000, 0, 0]);
      expect(component.hasAllocationData$()).toBe(true);
    });

    it('should provide allocation data through getter', () => {
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

      const allocationData = component.allocationData;
      expect(allocationData.labels).toEqual(['Equities', 'Income', 'Tax Free']);
      expect(allocationData.datasets[0].data).toEqual([50000, 30000, 20000]);
    });
  });

  describe('Month/Year Selectors', function monthYearSelectorsTests() {
    it('should populate month selector from available months', function populateMonthSelector() {
      component['accountId'] = '123';
      component.ngOnInit();

      const req = httpMock.expectOne('/api/summary/months?accountId=123');
      req.flush([
        { month: '2025-01', label: 'January 2025' },
        { month: '2025-02', label: 'February 2025' },
        { month: '2025-03', label: 'March 2025' },
      ]);

      const options = component.monthOptions$();
      expect(options).toHaveLength(3);
      expect(options[0].value).toBe('2025-01');
      expect(options[0].label).toBe('January 2025');
    });

    it('should populate year selector from service', function populateYearSelector() {
      component['accountId'] = '123';
      component.ngOnInit();

      const yearsReq = httpMock.expectOne('/api/summary/years');
      yearsReq.flush([2025, 2024, 2023]);

      const years = component.yearOptions$();
      expect(years).toContain(2025);
      expect(years).toContain(2024);
      expect(years).toContain(2023);
    });

    it('should default selectedMonth to the current month', function defaultMonth() {
      const now = new Date();
      const expectedMonth = `${String(now.getFullYear())}-${String(
        now.getMonth() + 1
      ).padStart(2, '0')}`;
      expect(component.selectedMonth.value).toBe(expectedMonth);
    });

    it('should default selectedYear to the current year', function defaultYear() {
      expect(component.selectedYear.value).toBe(new Date().getFullYear());
    });

    it('should fetch graph data when month selection changes', function monthChangeTriggersGraph() {
      component['accountId'] = '123';
      component.ngOnInit();

      // Flush initial requests
      flushPendingRequests(httpMock);

      component.selectedMonth.setValue('2025-02');

      const req = httpMock.expectOne(
        '/api/summary/graph?month=2025-02&accountId=123'
      );
      expect(req.request.method).toBe('GET');
      req.flush([]);
    });

    it('should fetch available months when year selection changes', function yearChangeTriggersMonthsFetch() {
      component['accountId'] = '123';
      component.ngOnInit();

      // Flush initial requests
      flushPendingRequests(httpMock);

      component.selectedYear.setValue(2024);

      const req = httpMock.expectOne(
        '/api/summary/months?accountId=123&year=2024'
      );
      expect(req.request.method).toBe('GET');
      req.flush([
        { month: '2024-01', label: 'January 2024' },
        { month: '2024-06', label: 'June 2024' },
      ]);
    });

    it('should disable month selector during loading', function monthDisabledDuringLoading() {
      component['accountId'] = '123';
      component.ngOnInit();

      expect(component.selectedMonth.disabled).toBe(true);

      flushPendingRequests(httpMock);

      expect(component.selectedMonth.disabled).toBe(false);
    });

    it('should disable year selector during loading', function yearDisabledDuringLoading() {
      component['accountId'] = '123';
      component.ngOnInit();

      expect(component.selectedYear.disabled).toBe(true);

      flushPendingRequests(httpMock);

      expect(component.selectedYear.disabled).toBe(false);
    });

    it('should update performance chart when month selection changes', function chartUpdatesOnMonthChange() {
      component['accountId'] = '123';
      component.ngOnInit();

      flushPendingRequests(httpMock);

      const initialChart = component.performanceChartData();

      component.selectedMonth.setValue('2025-01');

      const req = httpMock.expectOne(
        '/api/summary/graph?month=2025-01&accountId=123'
      );
      req.flush([
        {
          month: '2025-01',
          deposits: 10000,
          dividends: 100,
          capitalGains: 200,
        },
      ]);

      const updatedChart = component.performanceChartData();
      expect(updatedChart).not.toEqual(initialChart);
    });

    it('should reset month selection when year changes and months reload', function resetMonthOnYearChange() {
      component['accountId'] = '123';
      component.ngOnInit();

      flushPendingRequests(httpMock);

      component.selectedYear.setValue(2024);

      const monthsReq = httpMock.expectOne(
        '/api/summary/months?accountId=123&year=2024'
      );
      monthsReq.flush([
        { month: '2024-06', label: 'June 2024' },
        { month: '2024-12', label: 'December 2024' },
      ]);

      const options = component.monthOptions$();
      expect(options).toHaveLength(2);
      expect(options[0].value).toBe('2024-06');
    });

    it('should re-fetch graph when year selection changes', function graphRefreshOnYearChange() {
      component['accountId'] = '123';
      component.ngOnInit();

      flushPendingRequests(httpMock);

      component.selectedYear.setValue(2024);

      // Year change should trigger months fetch
      const monthsReq = httpMock.expectOne(
        '/api/summary/months?accountId=123&year=2024'
      );
      monthsReq.flush([{ month: '2024-01', label: 'January 2024' }]);
    });

    it('should handle empty month options gracefully', function emptyMonthOptions() {
      component['accountId'] = '123';
      component.ngOnInit();

      const req = httpMock.expectOne('/api/summary/months?accountId=123');
      req.flush([]);

      const options = component.monthOptions$();
      expect(options).toHaveLength(0);
    });

    it('should handle empty year options gracefully', function emptyYearOptions() {
      component['accountId'] = '123';
      component.ngOnInit();

      const yearsReq = httpMock.expectOne('/api/summary/years');
      yearsReq.flush([]);

      const years = component.yearOptions$();
      expect(years).toHaveLength(0);
    });
  });

  describe('Computed Signals', function computedSignalsTests() {
    it('should return deposits value via basis$ signal', function basisSignal() {
      // Arrange
      component['accountId'] = '123';
      component.ngOnInit();

      // Act
      const req = httpMock.expectOne('/api/summary?accountId=123');
      req.flush(createMockSummary({ deposits: 150000 }));

      // Assert
      expect(component.basis$()).toBe(150000);
    });

    it('should return capitalGains via capitalGain$ signal', function capitalGainSignal() {
      component['accountId'] = '123';
      component.ngOnInit();

      const req = httpMock.expectOne('/api/summary?accountId=123');
      req.flush(createMockSummary({ capitalGains: 7500 }));

      expect(component.capitalGain$()).toBe(7500);
    });

    it('should return dividends via dividends$ signal', function dividendsSignal() {
      component['accountId'] = '123';
      component.ngOnInit();

      const req = httpMock.expectOne('/api/summary?accountId=123');
      req.flush(createMockSummary({ dividends: 3200 }));

      expect(component.dividends$()).toBe(3200);
    });

    it('should compute percentIncrease$ correctly with non-zero basis', function percentIncreaseNonZero() {
      component['accountId'] = '123';
      component.ngOnInit();

      const req = httpMock.expectOne('/api/summary?accountId=123');
      req.flush(
        createMockSummary({
          deposits: 100000,
          capitalGains: 5000,
          dividends: 2500,
        })
      );

      // (12 * (5000 + 2500)) / 100000 = 0.9
      expect(component.percentIncrease$()).toBeCloseTo(0.9, 2);
    });

    it('should return 0 for percentIncrease$ when basis is zero', function percentIncreaseZeroBasis() {
      component['accountId'] = '123';
      component.ngOnInit();

      const req = httpMock.expectOne('/api/summary?accountId=123');
      req.flush(
        createMockSummary({
          deposits: 0,
          capitalGains: 5000,
          dividends: 2500,
        })
      );

      expect(component.percentIncrease$()).toBe(0);
    });

    it('should return 0 for percentIncrease$ with default summary', function percentIncreaseDefault() {
      // Before any API call, defaults should give 0
      expect(component.percentIncrease$()).toBe(0);
    });

    it('should update all computed signals when summary data changes', function computedSignalsUpdate() {
      component['accountId'] = '123';
      component.ngOnInit();

      const req = httpMock.expectOne('/api/summary?accountId=123');
      req.flush(
        createMockSummary({
          deposits: 200000,
          capitalGains: 10000,
          dividends: 5000,
        })
      );

      expect(component.basis$()).toBe(200000);
      expect(component.capitalGain$()).toBe(10000);
      expect(component.dividends$()).toBe(5000);
      // (12 * (10000 + 5000)) / 200000 = 0.9
      expect(component.percentIncrease$()).toBeCloseTo(0.9, 2);
    });

    it('should compute hasAllocationData$ as false with partial zeros', function hasAllocationPartialZero() {
      component['accountId'] = '123';
      component.ngOnInit();

      const req = httpMock.expectOne('/api/summary?accountId=123');
      req.flush(
        createMockSummary({
          equities: 0,
          income: 0,
          tax_free_income: 0,
        })
      );

      expect(component.hasAllocationData$()).toBe(false);
    });
  });

  describe('Getters', function gettersTests() {
    it('should return allocationChartData via allocationData getter', function allocationDataGetter() {
      component['accountId'] = '123';
      component.ngOnInit();

      const req = httpMock.expectOne('/api/summary?accountId=123');
      req.flush(createMockSummary());

      expect(component.allocationData).toEqual(component.allocationChartData());
    });

    it('should return performanceChartData via performanceData getter', function performanceDataGetter() {
      component['accountId'] = '123';
      component['selectedMonth'].setValue('2025-03');
      component.ngOnInit();

      const req = httpMock.expectOne(
        '/api/summary/graph?month=2025-03&accountId=123'
      );
      req.flush(createMockGraphData());

      expect(component.performanceData).toEqual(
        component.performanceChartData()
      );
    });
  });

  describe('Edge Cases', function edgeCasesTests() {
    it('should extract accountId from route params on init', function extractAccountId() {
      component.ngOnInit();

      // Route mock provides id: '123'
      expect(component['accountId']).toBe('123');
    });

    it('should handle null summary values with all zeros', function allZeroSummary() {
      component['accountId'] = '123';
      component.ngOnInit();

      const req = httpMock.expectOne('/api/summary?accountId=123');
      req.flush(
        createMockSummary({
          deposits: 0,
          dividends: 0,
          capitalGains: 0,
          equities: 0,
          income: 0,
          tax_free_income: 0,
        })
      );

      expect(component.basis$()).toBe(0);
      expect(component.capitalGain$()).toBe(0);
      expect(component.dividends$()).toBe(0);
      expect(component.percentIncrease$()).toBe(0);
    });

    it('should handle performance chart with empty graph data', function emptyGraphData() {
      const chartData = component.performanceChartData();

      expect(chartData.labels).toHaveLength(0);
      expect(chartData.datasets).toHaveLength(3);
      expect(chartData.datasets[0].data).toHaveLength(0);
    });

    it('should handle performance chart with single data point', function singleGraphPoint() {
      component['accountId'] = '123';
      component['selectedMonth'].setValue('2025-01');
      component.ngOnInit();

      const req = httpMock.expectOne(
        '/api/summary/graph?month=2025-01&accountId=123'
      );
      req.flush([
        {
          month: '2025-01',
          deposits: 10000,
          dividends: 100,
          capitalGains: 200,
        },
      ]);

      const chartData = component.performanceChartData();
      expect(chartData.labels).toHaveLength(1);
      expect(chartData.datasets[0].data).toEqual([10000]);
      // cumCapGains=200, cumDiv=100 → cgLine=10200, divLine=10300
      expect(chartData.datasets[1].data).toEqual([10200]);
      expect(chartData.datasets[2].data).toEqual([10300]);
    });

    it('should accumulate capital gains and dividends across graph points', function cumulativeGraphData() {
      component['accountId'] = '123';
      component['selectedMonth'].setValue('2025-03');
      component.ngOnInit();

      const req = httpMock.expectOne(
        '/api/summary/graph?month=2025-03&accountId=123'
      );
      req.flush(createMockGraphData());

      const chartData = component.performanceChartData();
      // Point 1: base=10000, cumCG=200, cumDiv=100
      //   cgLine=10200, divLine=10300
      // Point 2: base=20000, cumCG=500, cumDiv=250
      //   cgLine=20500, divLine=20750
      // Point 3: base=30000, cumCG=900, cumDiv=450
      //   cgLine=30900, divLine=31350
      expect(chartData.datasets[0].data).toEqual([10000, 20000, 30000]);
      expect(chartData.datasets[1].data).toEqual([10200, 20500, 30900]);
      expect(chartData.datasets[2].data).toEqual([10300, 20750, 31350]);
    });

    it('should have correct dataset labels for performance chart', function performanceChartLabels() {
      component['accountId'] = '123';
      component['selectedMonth'].setValue('2025-03');
      component.ngOnInit();

      const req = httpMock.expectOne(
        '/api/summary/graph?month=2025-03&accountId=123'
      );
      req.flush(createMockGraphData());

      const chartData = component.performanceChartData();
      expect(chartData.datasets[0].label).toBe('Base');
      expect(chartData.datasets[1].label).toBe('Capital Gains');
      expect(chartData.datasets[2].label).toBe('Dividends');
    });

    it('should use correct border colors for performance chart datasets', function performanceChartColors() {
      component['accountId'] = '123';
      component['selectedMonth'].setValue('2025-03');
      component.ngOnInit();

      const req = httpMock.expectOne(
        '/api/summary/graph?month=2025-03&accountId=123'
      );
      req.flush(createMockGraphData());

      const chartData = component.performanceChartData();
      expect(chartData.datasets[0].borderColor).toBe('#3B82F6');
      expect(chartData.datasets[1].borderColor).toBe('#10B981');
      expect(chartData.datasets[2].borderColor).toBe('#F59E0B');
    });

    it('should not fire graph request when month is set to null', function nullMonthNoRequest() {
      component['accountId'] = '123';
      component.ngOnInit();

      flushPendingRequests(httpMock);

      component.selectedMonth.setValue(null);

      // No new graph request should be made
      const pending = httpMock.match(function matchGraph(
        r: import('@angular/common/http').HttpRequest<unknown>
      ): boolean {
        return r.url.includes('/api/summary/graph');
      });
      expect(pending).toHaveLength(0);
    });

    it('should not fire months request when year is set to null', function nullYearNoRequest() {
      component['accountId'] = '123';
      component.ngOnInit();

      flushPendingRequests(httpMock);

      component.selectedYear.setValue(null);

      // No new months request should be made
      const pending = httpMock.match(function matchMonths(
        r: import('@angular/common/http').HttpRequest<unknown>
      ): boolean {
        return r.url.includes('/api/summary/months');
      });
      expect(pending).toHaveLength(0);
    });
  });

  describe('Component Lifecycle', function lifecycleTests() {
    it('should disable month and year selectors on init', function disableSelectorsOnInit() {
      component['accountId'] = '123';
      component.ngOnInit();

      expect(component.selectedMonth.disabled).toBe(true);
      expect(component.selectedYear.disabled).toBe(true);
    });

    it('should enable selectors after summary data loads', function enableSelectorsAfterLoad() {
      component['accountId'] = '123';
      component.ngOnInit();

      flushPendingRequests(httpMock);

      expect(component.selectedMonth.disabled).toBe(false);
      expect(component.selectedYear.disabled).toBe(false);
    });

    it('should clean up subscriptions on component destroy', function cleanupOnDestroy() {
      component['accountId'] = '123';
      component.ngOnInit();
      flushPendingRequests(httpMock);

      // Destroy the component
      fixture.destroy();

      // After destroy, changing selectedMonth should NOT trigger new HTTP requests
      component.selectedMonth.setValue('2025-06');

      const pendingGraph = httpMock.match(function matchGraphAfterDestroy(
        r: import('@angular/common/http').HttpRequest<unknown>
      ): boolean {
        return r.url.includes('/api/summary/graph');
      });
      expect(pendingGraph).toHaveLength(0);
    });

    it('should clean up year subscription on destroy', function cleanupYearOnDestroy() {
      component['accountId'] = '123';
      component.ngOnInit();
      flushPendingRequests(httpMock);

      fixture.destroy();

      component.selectedYear.setValue(2024);

      const pendingMonths = httpMock.match(function matchMonthsAfterDestroy(
        r: import('@angular/common/http').HttpRequest<unknown>
      ): boolean {
        return r.url.includes('/api/summary/months');
      });
      expect(pendingMonths).toHaveLength(0);
    });

    it('should not emit events when disabling selectors on init', function noEmitOnDisable() {
      let monthChanged = false;
      let yearChanged = false;

      const monthSub = component.selectedMonth.valueChanges.subscribe(
        function onMonthChange(): void {
          monthChanged = true;
        }
      );
      const yearSub = component.selectedYear.valueChanges.subscribe(
        function onYearChange(): void {
          yearChanged = true;
        }
      );

      component['accountId'] = '123';
      component.ngOnInit();

      expect(monthChanged).toBe(false);
      expect(yearChanged).toBe(false);

      monthSub.unsubscribe();
      yearSub.unsubscribe();
    });
  });

  describe('Integration Flows', function integrationTests() {
    it('should handle full flow: load -> select month -> select year', function fullUserFlow() {
      // Step 1: Initial load
      component['accountId'] = '123';
      component.ngOnInit();
      flushPendingRequests(httpMock);

      // Step 2: Select a different month
      component.selectedMonth.setValue('2025-02');

      const graphReq = httpMock.expectOne(
        '/api/summary/graph?month=2025-02&accountId=123'
      );
      graphReq.flush(createMockGraphData());

      // Step 3: Select a different year
      component.selectedYear.setValue(2024);

      const monthsReq = httpMock.expectOne(
        '/api/summary/months?accountId=123&year=2024'
      );
      monthsReq.flush([
        { month: '2024-01', label: 'January 2024' },
        { month: '2024-06', label: 'June 2024' },
      ]);

      // Verify final state
      expect(component.monthOptions$()).toHaveLength(2);
    });

    it('should handle rapid month selections', function rapidMonthSelections() {
      component['accountId'] = '123';
      component.ngOnInit();
      flushPendingRequests(httpMock);

      // Rapidly change months
      component.selectedMonth.setValue('2025-01');
      component.selectedMonth.setValue('2025-02');
      component.selectedMonth.setValue('2025-03');

      // Should have multiple graph requests
      const graphReqs = httpMock.match(function matchGraphReqs(
        r: import('@angular/common/http').HttpRequest<unknown>
      ): boolean {
        return r.url.includes('/api/summary/graph');
      });
      expect(graphReqs.length).toBeGreaterThanOrEqual(1);

      for (const req of graphReqs) {
        req.flush(createMockGraphData());
      }
    });

    it('should fetch all required data on initialization', function fetchAllOnInit() {
      component['accountId'] = '123';
      component.ngOnInit();

      const summaryReq = httpMock.expectOne('/api/summary?accountId=123');
      summaryReq.flush(createMockSummary());

      const monthsReq = httpMock.expectOne('/api/summary/months?accountId=123');
      monthsReq.flush(createMockMonths());

      const yearsReq = httpMock.expectOne('/api/summary/years');
      yearsReq.flush([2025, 2024, 2023]);

      expect(component.basis$()).toBe(100000);
      expect(component.monthOptions$()).toHaveLength(3);
      expect(component.yearOptions$()).toHaveLength(3);
    });

    it('should update performance data after month selection', function performanceUpdateAfterMonthSelect() {
      component['accountId'] = '123';
      component.ngOnInit();
      flushPendingRequests(httpMock);

      const initialData = component.performanceChartData();

      component.selectedMonth.setValue('2025-02');

      const req = httpMock.expectOne(
        '/api/summary/graph?month=2025-02&accountId=123'
      );
      req.flush(createMockGraphData());

      const updatedData = component.performanceChartData();
      expect(updatedData.labels!.length).toBeGreaterThan(
        initialData.labels!.length
      );
    });
  });

  describe('Error Recovery', function errorRecoveryTests() {
    it('should recover from summary error on retry', function recoverFromSummaryError() {
      component['accountId'] = '123';
      component.ngOnInit();

      const req1 = httpMock.expectOne('/api/summary?accountId=123');
      req1.error(new ProgressEvent('error'), { status: 500 });

      expect(component.error()).toBeTruthy();

      // Retry by calling ngOnInit again
      component.ngOnInit();

      const req2 = httpMock.expectOne('/api/summary?accountId=123');
      req2.flush(createMockSummary());

      expect(component.error()).toBeNull();
      expect(component.basis$()).toBe(100000);
    });

    it('should recover from graph error when month changes', function recoverFromGraphError() {
      component['accountId'] = '123';
      component['selectedMonth'].setValue('2025-01');
      component.ngOnInit();

      const req1 = httpMock.expectOne(
        '/api/summary/graph?month=2025-01&accountId=123'
      );
      req1.error(new ProgressEvent('error'));

      expect(component.error()).toBeTruthy();

      // Change month to trigger new graph request
      component.selectedMonth.setValue('2025-02');

      const req2 = httpMock.expectOne(
        '/api/summary/graph?month=2025-02&accountId=123'
      );
      req2.flush(createMockGraphData());

      expect(component.performanceChartData().labels!.length).toBeGreaterThan(
        0
      );
    });

    it('should recover from months error on year change', function recoverFromMonthsError() {
      component['accountId'] = '123';
      component.ngOnInit();

      const req1 = httpMock.expectOne('/api/summary/months?accountId=123');
      req1.error(new ProgressEvent('error'));

      expect(component.error()).toBeTruthy();

      // Change year to trigger new months fetch
      component.selectedYear.setValue(2024);

      const req2 = httpMock.expectOne(
        '/api/summary/months?accountId=123&year=2024'
      );
      req2.flush(createMockMonths());

      expect(component.monthOptions$()).toHaveLength(3);
    });

    it('should clear error state before new fetch', function clearErrorBeforeFetch() {
      component['accountId'] = '123';
      component.ngOnInit();

      const req1 = httpMock.expectOne('/api/summary?accountId=123');
      req1.error(new ProgressEvent('error'), { status: 500 });

      expect(component.error()).toBeTruthy();

      // Start new fetch
      component.ngOnInit();

      // Error should be cleared when new fetch starts
      expect(component.loading()).toBe(true);
    });
  });
});
