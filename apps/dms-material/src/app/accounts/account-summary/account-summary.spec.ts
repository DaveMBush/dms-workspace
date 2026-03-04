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

function flushPendingRequests(httpMock: HttpTestingController): void {
  const pending = httpMock.match(() => true);
  for (const req of pending) {
    const url = req.request.url;
    if (url.includes('/api/summary/graph')) {
      req.flush([]);
    } else if (url.includes('/api/summary/months')) {
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

      expect(component.monthOptions()).toHaveLength(2);
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

  describe.skip('Month/Year Selectors', function monthYearSelectorsTests() {
    it('should populate month selector from available months', function populateMonthSelector() {
      component['accountId'] = '123';
      component.ngOnInit();

      const req = httpMock.expectOne('/api/summary/months?accountId=123');
      req.flush([
        { month: '2025-01', label: 'January 2025' },
        { month: '2025-02', label: 'February 2025' },
        { month: '2025-03', label: 'March 2025' },
      ]);

      const options = component.monthOptions();
      expect(options).toHaveLength(3);
      expect(options[0].value).toBe('2025-01');
      expect(options[0].label).toBe('January 2025');
    });

    it('should populate year selector from service', function populateYearSelector() {
      component['accountId'] = '123';
      component.ngOnInit();

      const yearsReq = httpMock.expectOne('/api/summary/years');
      yearsReq.flush([2025, 2024, 2023]);

      const years = component.yearOptions();
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

      const options = component.monthOptions();
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

      const options = component.monthOptions();
      expect(options).toHaveLength(0);
    });

    it('should handle empty year options gracefully', function emptyYearOptions() {
      component['accountId'] = '123';
      component.ngOnInit();

      const yearsReq = httpMock.expectOne('/api/summary/years');
      yearsReq.flush([]);

      const years = component.yearOptions();
      expect(years).toHaveLength(0);
    });
  });
});
