import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideSmartNgRX } from '@smarttools/smart-signals';

// Mock upstream selectors BEFORE anything else
vi.mock('../store/top/selectors/select-top-entities.function', () => ({
  selectTopEntities: vi.fn().mockReturnValue(signal({})),
}));

vi.mock('../store/accounts/selectors/select-top-accounts.function', () => ({
  selectTopAccounts: vi.fn().mockReturnValue(signal([])),
}));

vi.mock('../store/accounts/selectors/select-accounts.function', () => ({
  selectAccounts: signal([]),
}));

import { GlobalSummary } from './global-summary';
import { SummaryService } from './services/summary.service';
import { topEffectsServiceToken } from '../store/top/top-effect-service-token';

describe('GlobalSummary', () => {
  let component: GlobalSummary;
  let fixture: ComponentFixture<GlobalSummary>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GlobalSummary],
      providers: [
        provideSmartNgRX(),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: topEffectsServiceToken, useValue: {} },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(GlobalSummary);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should compute allocation chart data', () => {
    fixture.detectChanges();
    const chartData = component.allocationChartData();
    expect(chartData.labels).toBeDefined();
    expect(chartData.datasets.length).toBeGreaterThan(0);
  });

  it('should compute performance chart data', () => {
    fixture.detectChanges();
    const chartData = component.performanceChartData();
    expect(chartData.labels).toBeDefined();
    expect(chartData.datasets.length).toBeGreaterThan(0);
  });

  it('should have correct allocation labels', () => {
    fixture.detectChanges();
    const chartData = component.allocationChartData();
    expect(chartData.labels).toContain('Equities');
    expect(chartData.labels).toContain('Income');
    expect(chartData.labels).toContain('Tax Free');
  });

  it('should render summary display components', () => {
    fixture.detectChanges();
    const charts = fixture.nativeElement.querySelectorAll(
      'dms-summary-display'
    );
    expect(charts.length).toBe(2); // pie and line
  });
});

describe('GlobalSummary - Service Integration', () => {
  let component: GlobalSummary;
  let fixture: ComponentFixture<GlobalSummary>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GlobalSummary],
      providers: [
        provideSmartNgRX(),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: topEffectsServiceToken, useValue: {} },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(GlobalSummary);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    // Discard outstanding requests from concurrent init fetch operations
    httpMock.match((req) => req.url.includes('/api/summary'));
    httpMock.verify();
  });

  it('should inject summary service on initialization', () => {
    const service = TestBed.inject(SummaryService);
    expect(service).toBeDefined();
  });

  it('should call /api/summary endpoint with selected month', () => {
    fixture.detectChanges();

    const req = httpMock.expectOne(
      (request) => request.url === '/api/summary' && request.params.has('month')
    );
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

  it('should transform API response to allocation chart data', () => {
    fixture.detectChanges();

    const req = httpMock.expectOne((request) => request.url === '/api/summary');
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

  it('should update basis signal from API deposits field', () => {
    fixture.detectChanges();

    const req = httpMock.expectOne((request) => request.url === '/api/summary');
    req.flush({
      deposits: 150000,
      dividends: 5000,
      capitalGains: 10000,
      equities: 60000,
      income: 40000,
      tax_free_income: 50000,
    });

    expect(component.basis$()).toBe(150000);
  });

  it('should update capital gains signal from API response', () => {
    fixture.detectChanges();

    const req = httpMock.expectOne((request) => request.url === '/api/summary');
    req.flush({
      deposits: 150000,
      dividends: 5000,
      capitalGains: 10000,
      equities: 60000,
      income: 40000,
      tax_free_income: 50000,
    });

    expect(component.capitalGain$()).toBe(10000);
  });

  it('should update dividends signal from API response', () => {
    fixture.detectChanges();

    const req = httpMock.expectOne((request) => request.url === '/api/summary');
    req.flush({
      deposits: 150000,
      dividends: 5000,
      capitalGains: 10000,
      equities: 60000,
      income: 40000,
      tax_free_income: 50000,
    });

    expect(component.dividends$()).toBe(5000);
  });

  it('should calculate percent increase correctly from API data', () => {
    fixture.detectChanges();

    const req = httpMock.expectOne((request) => request.url === '/api/summary');
    req.flush({
      deposits: 100000,
      dividends: 2500,
      capitalGains: 5000,
      equities: 50000,
      income: 30000,
      tax_free_income: 20000,
    });

    // (12 * (5000 + 2500)) / 100000 = 0.9
    expect(component.percentIncrease$()).toBeCloseTo(0.9, 2);
  });

  it('should update data when selected month changes', () => {
    fixture.detectChanges();

    const req1 = httpMock.expectOne(
      (request) => request.url === '/api/summary'
    );
    req1.flush({
      deposits: 100000,
      dividends: 2500,
      capitalGains: 5000,
      equities: 50000,
      income: 30000,
      tax_free_income: 20000,
    });

    component.selectedMonth.setValue('2025-06');

    const req2 = httpMock.expectOne(
      (request) =>
        request.url === '/api/summary' &&
        request.params.get('month') === '2025-06'
    );
    req2.flush({
      deposits: 120000,
      dividends: 3000,
      capitalGains: 6000,
      equities: 55000,
      income: 35000,
      tax_free_income: 30000,
    });

    expect(component.basis$()).toBe(120000);
  });
});

describe('GlobalSummary - Graph Integration', () => {
  let component: GlobalSummary;
  let fixture: ComponentFixture<GlobalSummary>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GlobalSummary],
      providers: [
        provideSmartNgRX(),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: topEffectsServiceToken, useValue: {} },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(GlobalSummary);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    // Discard outstanding requests from concurrent init fetch operations
    httpMock.match((req) => req.url.includes('/api/summary'));
    httpMock.verify();
  });

  it('should call /api/summary/graph endpoint for line chart data', () => {
    fixture.detectChanges();

    const req = httpMock.expectOne(
      (request) => request.url === '/api/summary/graph'
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.has('year')).toBe(true);

    req.flush([
      { month: '01-2025', deposits: 40000, dividends: 50, capitalGains: 0 },
      { month: '02-2025', deposits: 40200, dividends: 100, capitalGains: 100 },
    ]);
  });

  it('should transform graph API response to line chart data', () => {
    fixture.detectChanges();

    const req = httpMock.expectOne(
      (request) => request.url === '/api/summary/graph'
    );
    req.flush([
      { month: '01-2025', deposits: 40000, dividends: 50, capitalGains: 0 },
      { month: '02-2025', deposits: 40200, dividends: 100, capitalGains: 100 },
      { month: '03-2025', deposits: 40500, dividends: 150, capitalGains: 300 },
    ]);

    fixture.detectChanges();

    const chartData = component.performanceChartData();
    expect(chartData.labels).toEqual(['01-2025', '02-2025', '03-2025']);
    expect(chartData.datasets.length).toBe(3); // Base, Capital Gains, Dividends
  });

  it('should map graph deposits to Base dataset', () => {
    fixture.detectChanges();

    const req = httpMock.expectOne(
      (request) => request.url === '/api/summary/graph'
    );
    req.flush([
      { month: '01-2025', deposits: 40000, dividends: 50, capitalGains: 0 },
      { month: '02-2025', deposits: 40200, dividends: 100, capitalGains: 100 },
    ]);

    fixture.detectChanges();

    const chartData = component.performanceChartData();
    const baseDataset = chartData.datasets.find((ds) => ds.label === 'Base');
    expect(baseDataset).toBeDefined();
    expect(baseDataset!.data).toEqual([40000, 40200]);
  });

  it('should map graph capitalGains to Capital Gains dataset', () => {
    fixture.detectChanges();

    const req = httpMock.expectOne(
      (request) => request.url === '/api/summary/graph'
    );
    req.flush([
      { month: '01-2025', deposits: 40000, dividends: 50, capitalGains: 0 },
      { month: '02-2025', deposits: 40200, dividends: 100, capitalGains: 100 },
    ]);

    fixture.detectChanges();

    const chartData = component.performanceChartData();
    const gainsDataset = chartData.datasets.find(
      (ds) => ds.label === 'Capital Gains'
    );
    expect(gainsDataset).toBeDefined();
    expect(gainsDataset!.data).toEqual([0, 100]);
  });

  it('should map graph dividends to Dividends dataset', () => {
    fixture.detectChanges();

    const req = httpMock.expectOne(
      (request) => request.url === '/api/summary/graph'
    );
    req.flush([
      { month: '01-2025', deposits: 40000, dividends: 50, capitalGains: 0 },
      { month: '02-2025', deposits: 40200, dividends: 100, capitalGains: 100 },
    ]);

    fixture.detectChanges();

    const chartData = component.performanceChartData();
    const divDataset = chartData.datasets.find(
      (ds) => ds.label === 'Dividends'
    );
    expect(divDataset).toBeDefined();
    expect(divDataset!.data).toEqual([50, 100]);
  });
});

describe('GlobalSummary - Available Months', () => {
  let component: GlobalSummary;
  let fixture: ComponentFixture<GlobalSummary>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GlobalSummary],
      providers: [
        provideSmartNgRX(),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: topEffectsServiceToken, useValue: {} },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(GlobalSummary);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    // Discard outstanding requests from concurrent init fetch operations
    httpMock.match((req) => req.url.includes('/api/summary'));
    httpMock.verify();
  });

  it('should call /api/summary/months endpoint for month options', () => {
    fixture.detectChanges();

    const req = httpMock.expectOne('/api/summary/months');
    expect(req.request.method).toBe('GET');

    req.flush([
      { month: '2025-01', label: '01/2025' },
      { month: '2025-02', label: '02/2025' },
      { month: '2025-03', label: '03/2025' },
    ]);
  });

  it('should transform months API response to month options', () => {
    fixture.detectChanges();

    const req = httpMock.expectOne('/api/summary/months');
    req.flush([
      { month: '2025-01', label: '01/2025' },
      { month: '2025-02', label: '02/2025' },
      { month: '2025-03', label: '03/2025' },
    ]);

    fixture.detectChanges();

    const options = component.monthOptions;
    expect(options.length).toBe(3);
    expect(options[0]).toEqual({ label: '01/2025', value: '2025-01' });
  });

  it('should auto-select first available month when months load', () => {
    fixture.detectChanges();

    const req = httpMock.expectOne('/api/summary/months');
    req.flush([
      { month: '2025-01', label: '01/2025' },
      { month: '2025-02', label: '02/2025' },
    ]);

    fixture.detectChanges();

    expect(component.selectedMonth.value).toBe('2025-01');
  });
});

describe('GlobalSummary - Error Handling', () => {
  let component: GlobalSummary;
  let fixture: ComponentFixture<GlobalSummary>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GlobalSummary],
      providers: [
        provideSmartNgRX(),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: topEffectsServiceToken, useValue: {} },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(GlobalSummary);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    // Discard outstanding requests from concurrent init fetch operations
    httpMock.match((req) => req.url.includes('/api/summary'));
    httpMock.verify();
  });

  it('should handle summary API error gracefully', () => {
    fixture.detectChanges();

    const req = httpMock.expectOne((request) => request.url === '/api/summary');
    req.error(new ProgressEvent('error'));

    fixture.detectChanges();

    // Component should still render without crashing
    expect(component).toBeTruthy();
  });

  it('should handle graph API error gracefully', () => {
    fixture.detectChanges();

    const req = httpMock.expectOne(
      (request) => request.url === '/api/summary/graph'
    );
    req.error(new ProgressEvent('error'));

    fixture.detectChanges();

    expect(component).toBeTruthy();
  });

  it('should handle months API error gracefully', () => {
    fixture.detectChanges();

    const req = httpMock.expectOne('/api/summary/months');
    req.error(new ProgressEvent('error'));

    fixture.detectChanges();

    expect(component).toBeTruthy();
  });

  it('should use default values when summary API fails', () => {
    fixture.detectChanges();

    const req = httpMock.expectOne((request) => request.url === '/api/summary');
    req.error(new ProgressEvent('error'));

    fixture.detectChanges();

    expect(component.basis$()).toBe(0);
    expect(component.capitalGain$()).toBe(0);
    expect(component.dividends$()).toBe(0);
  });

  it('should use empty chart data when graph API fails', () => {
    fixture.detectChanges();

    const req = httpMock.expectOne(
      (request) => request.url === '/api/summary/graph'
    );
    req.error(new ProgressEvent('error'));

    fixture.detectChanges();

    const chartData = component.performanceChartData();
    expect(chartData.datasets[0].data).toEqual([]);
  });
});

describe('Pie Chart Display', () => {
  let component: GlobalSummary;
  let fixture: ComponentFixture<GlobalSummary>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GlobalSummary],
      providers: [
        provideSmartNgRX(),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: topEffectsServiceToken, useValue: {} },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(GlobalSummary);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    // Discard outstanding requests from concurrent init fetch operations
    httpMock.match((req) => req.url.includes('/api/summary'));
    httpMock.verify();
  });

  it('should render pie chart component with real data', () => {
    fixture.detectChanges();

    const pieCharts = fixture.nativeElement.querySelectorAll(
      'dms-summary-display'
    );
    expect(pieCharts.length).toBe(2);
  });

  it('should pass correct labels to pie chart', () => {
    fixture.detectChanges();

    const summaryReq = httpMock.expectOne(
      (req) => req.url === '/api/summary' && req.params.has('month')
    );
    summaryReq.flush({
      deposits: 100000,
      dividends: 2500,
      capitalGains: 5000,
      equities: 50000,
      income: 30000,
      tax_free_income: 20000,
    });

    const chartData = component.allocationData;
    expect(chartData.labels).toEqual(['Equities', 'Income', 'Tax Free']);
  });

  it('should pass correct data values to pie chart', () => {
    fixture.detectChanges();

    const summaryReq = httpMock.expectOne(
      (req) => req.url === '/api/summary' && req.params.has('month')
    );
    summaryReq.flush({
      deposits: 100000,
      dividends: 2500,
      capitalGains: 5000,
      equities: 50000,
      income: 30000,
      tax_free_income: 20000,
    });

    const chartData = component.allocationData;
    expect(chartData.datasets[0].data).toEqual([50000, 30000, 20000]);
  });

  it('should apply correct colors to pie chart segments', () => {
    fixture.detectChanges();

    const summaryReq = httpMock.expectOne(
      (req) => req.url === '/api/summary' && req.params.has('month')
    );
    summaryReq.flush({
      deposits: 100000,
      dividends: 2500,
      capitalGains: 5000,
      equities: 50000,
      income: 30000,
      tax_free_income: 20000,
    });

    const chartData = component.allocationData;
    expect(chartData.datasets[0].backgroundColor).toBeDefined();
    expect((chartData.datasets[0].backgroundColor as string[]).length).toBe(3);
  });

  it('should handle empty/zero allocation data gracefully', () => {
    // Default state is all zeros — no-data-message should be visible
    fixture.detectChanges();

    const noDataMessage =
      fixture.nativeElement.querySelector('.no-data-message');
    expect(noDataMessage).not.toBeNull();
    expect(noDataMessage.textContent).toContain('No data available');
  });

  it('should display pie chart title', () => {
    fixture.detectChanges();

    const title = fixture.nativeElement.querySelector('.chart-title');
    expect(title).not.toBeNull();
    expect(title.textContent).toContain('Allocation');
  });

  it('should configure chart with responsive options', () => {
    fixture.detectChanges();

    expect(component.pieChartOptions).toBeDefined();
    expect(component.pieChartOptions.responsive).toBe(true);
    expect(component.pieChartOptions.maintainAspectRatio).toBe(true);
  });

  it('should configure legend position at bottom', () => {
    fixture.detectChanges();

    const options = component.pieChartOptions;
    expect(options.plugins).toBeDefined();
    expect(options.plugins!.legend).toBeDefined();
    expect(options.plugins!.legend!.position).toBe('bottom');
  });

  it('should format tooltip with currency amount and percentage', () => {
    fixture.detectChanges();

    const summaryReq = httpMock.expectOne(
      (req) => req.url === '/api/summary' && req.params.has('month')
    );
    summaryReq.flush({
      deposits: 100000,
      dividends: 2500,
      capitalGains: 5000,
      equities: 50000,
      income: 30000,
      tax_free_income: 20000,
    });

    const options = component.pieChartOptions;
    const tooltipCallback = options.plugins!.tooltip!.callbacks!.label;
    expect(tooltipCallback).toBeDefined();

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

  it('should use consistent colors for same categories across data refreshes', () => {
    fixture.detectChanges();

    const summaryReq = httpMock.expectOne(
      (req) => req.url === '/api/summary' && req.params.has('month')
    );
    summaryReq.flush({
      deposits: 100000,
      dividends: 2500,
      capitalGains: 5000,
      equities: 50000,
      income: 30000,
      tax_free_income: 20000,
    });

    const colors1 = component.allocationData.datasets[0].backgroundColor;

    // Trigger a new fetch with different values
    component.selectedMonth.setValue('2025-04');
    const summaryReq2 = httpMock.expectOne(
      (req) =>
        req.url === '/api/summary' && req.params.get('month') === '2025-04'
    );
    summaryReq2.flush({
      deposits: 80000,
      dividends: 3000,
      capitalGains: 4000,
      equities: 60000,
      income: 10000,
      tax_free_income: 10000,
    });

    const colors2 = component.allocationData.datasets[0].backgroundColor;
    expect(colors1).toEqual(colors2);
  });

  it('should pass allocation data to summary display component input', () => {
    fixture.detectChanges();

    const displays = fixture.nativeElement.querySelectorAll(
      'dms-summary-display'
    );
    // Should have at least one summary display (pie chart)
    expect(displays.length).toBeGreaterThanOrEqual(1);
  });

  it('should display percentages in chart data', () => {
    fixture.detectChanges();

    const summaryReq = httpMock.expectOne(
      (req) => req.url === '/api/summary' && req.params.has('month')
    );
    summaryReq.flush({
      deposits: 100000,
      dividends: 2500,
      capitalGains: 5000,
      equities: 50000,
      income: 30000,
      tax_free_income: 20000,
    });

    const chartData = component.allocationData;
    // All data values should sum to total and reflect proportions
    const total = chartData.datasets[0].data.reduce(function sum(
      a: number,
      b: number
    ): number {
      return a + b;
    },
    0);
    expect(total).toBe(100000);
  });
});

describe('Month/Year Selector', () => {
  let component: GlobalSummary;
  let fixture: ComponentFixture<GlobalSummary>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GlobalSummary],
      providers: [
        provideSmartNgRX(),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: topEffectsServiceToken, useValue: {} },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(GlobalSummary);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    // Discard outstanding requests from concurrent init fetch operations
    httpMock.match((req) => req.url.includes('/api/summary'));
    httpMock.verify();
  });

  it('should fetch available months on init', () => {
    fixture.detectChanges();

    const req = httpMock.expectOne('/api/summary/months');
    expect(req.request.method).toBe('GET');

    req.flush([
      { month: '2025-01', label: '01/2025' },
      { month: '2025-02', label: '02/2025' },
      { month: '2025-03', label: '03/2025' },
    ]);

    expect(component.monthOptions.length).toBe(3);
  });

  it('should display month options in selector', () => {
    fixture.detectChanges();

    const monthsReq = httpMock.expectOne('/api/summary/months');
    monthsReq.flush([
      { month: '2025-01', label: '01/2025' },
      { month: '2025-02', label: '02/2025' },
    ]);

    fixture.detectChanges();

    const options = component.monthOptions;
    expect(options[0].label).toBe('01/2025');
    expect(options[0].value).toBe('2025-01');
    expect(options[1].label).toBe('02/2025');
    expect(options[1].value).toBe('2025-02');
  });

  it('should set default month to first available month', () => {
    fixture.detectChanges();

    const monthsReq = httpMock.expectOne('/api/summary/months');
    monthsReq.flush([
      { month: '2025-01', label: '01/2025' },
      { month: '2025-02', label: '02/2025' },
      { month: '2025-03', label: '03/2025' },
    ]);

    fixture.detectChanges();

    expect(component.selectedMonth.value).toBe('2025-01');
  });

  it('should refresh data when month selection changes', () => {
    fixture.detectChanges();

    // Flush initial requests
    const monthsReq = httpMock.expectOne('/api/summary/months');
    monthsReq.flush([
      { month: '2025-01', label: '01/2025' },
      { month: '2025-02', label: '02/2025' },
    ]);

    const initialSummaryReq = httpMock.expectOne(
      (req) => req.url === '/api/summary' && req.params.has('month')
    );
    initialSummaryReq.flush({
      deposits: 50000,
      dividends: 1000,
      capitalGains: 2000,
      equities: 30000,
      income: 10000,
      tax_free_income: 10000,
    });

    // Change month
    component.selectedMonth.setValue('2025-02');

    const refreshReq = httpMock.expectOne(
      (req) =>
        req.url === '/api/summary' && req.params.get('month') === '2025-02'
    );
    refreshReq.flush({
      deposits: 40000,
      dividends: 800,
      capitalGains: 1500,
      equities: 25000,
      income: 8000,
      tax_free_income: 7000,
    });

    expect(component.basis$()).toBe(40000);
  });

  it('should include month parameter in summary API call', () => {
    // selectedMonth FormControl defaults to '2025-03'
    fixture.detectChanges();

    const summaryReq = httpMock.expectOne(
      (req) => req.url === '/api/summary' && req.params.has('month')
    );
    expect(summaryReq.request.params.get('month')).toBe('2025-03');
    summaryReq.flush({
      deposits: 0,
      dividends: 0,
      capitalGains: 0,
      equities: 0,
      income: 0,
      tax_free_income: 0,
    });
  });

  it('should handle month with no data gracefully', () => {
    // Default state has all zeros — no-data-message visible without HTTP flush
    fixture.detectChanges();

    // Should show no-data-message when all allocation values are zero
    const noDataMessage =
      fixture.nativeElement.querySelector('.no-data-message');
    expect(noDataMessage).not.toBeNull();
  });

  it('should show loading spinner while fetching months', () => {
    // Before init, loading should be false
    expect(component.loading$()).toBe(false);

    fixture.detectChanges();

    // During fetch, loading should be true
    expect(component.loading$()).toBe(true);

    const summaryReq = httpMock.expectOne((req) => req.url === '/api/summary');
    summaryReq.flush({
      deposits: 0,
      dividends: 0,
      capitalGains: 0,
      equities: 0,
      income: 0,
      tax_free_income: 0,
    });

    expect(component.loading$()).toBe(false);
  });

  it('should disable month selector while loading data', () => {
    fixture.detectChanges();

    // Flush initial months
    const monthsReq = httpMock.expectOne('/api/summary/months');
    monthsReq.flush([
      { month: '2025-01', label: '01/2025' },
      { month: '2025-02', label: '02/2025' },
    ]);

    const initialReq = httpMock.expectOne((req) => req.url === '/api/summary');
    initialReq.flush({
      deposits: 0,
      dividends: 0,
      capitalGains: 0,
      equities: 0,
      income: 0,
      tax_free_income: 0,
    });

    // Change month - selector should be disabled while loading
    component.selectedMonth.setValue('2025-01');
    expect(component.selectedMonth.disabled).toBe(true);

    const refreshReq = httpMock.expectOne((req) => req.url === '/api/summary');
    refreshReq.flush({
      deposits: 0,
      dividends: 0,
      capitalGains: 0,
      equities: 0,
      income: 0,
      tax_free_income: 0,
    });

    expect(component.selectedMonth.disabled).toBe(false);
  });

  it('should handle error fetching months', () => {
    fixture.detectChanges();

    const monthsReq = httpMock.expectOne('/api/summary/months');
    monthsReq.error(new ProgressEvent('error'));

    fixture.detectChanges();

    expect(component.error$()).toBeTruthy();
    expect(component.monthOptions.length).toBe(0);
  });

  it('should default to first available month when API returns multiple months', () => {
    fixture.detectChanges();

    const monthsReq = httpMock.expectOne('/api/summary/months');
    monthsReq.flush([
      { month: '2025-01', label: '01/2025' },
      { month: '2025-02', label: '02/2025' },
      { month: '2025-03', label: '03/2025' },
    ]);

    fixture.detectChanges();

    // Should default to first month in sorted list (effect sets first)
    expect(component.selectedMonth.value).toBe('2025-01');
  });

  it('should persist selected month when data refreshes', () => {
    fixture.detectChanges();

    // Flush initial months
    const monthsReq = httpMock.expectOne('/api/summary/months');
    monthsReq.flush([
      { month: '2025-01', label: '01/2025' },
      { month: '2025-02', label: '02/2025' },
    ]);

    const initialReq = httpMock.expectOne((req) => req.url === '/api/summary');
    initialReq.flush({
      deposits: 50000,
      dividends: 1000,
      capitalGains: 2000,
      equities: 30000,
      income: 10000,
      tax_free_income: 10000,
    });

    // Change to specific month
    component.selectedMonth.setValue('2025-02');

    const changeReq = httpMock.expectOne(
      (req) =>
        req.url === '/api/summary' && req.params.get('month') === '2025-02'
    );
    changeReq.flush({
      deposits: 40000,
      dividends: 800,
      capitalGains: 1500,
      equities: 25000,
      income: 8000,
      tax_free_income: 7000,
    });

    // Trigger manual refresh
    component.refreshData();

    const refreshReq = httpMock.expectOne(
      (req) =>
        req.url === '/api/summary' && req.params.get('month') === '2025-02'
    );
    refreshReq.flush({
      deposits: 41000,
      dividends: 850,
      capitalGains: 1600,
      equities: 25500,
      income: 8200,
      tax_free_income: 7300,
    });

    // Month should still be 2025-02
    expect(component.selectedMonth.value).toBe('2025-02');
  });
});

describe('Branch Coverage - Edge Cases', () => {
  let fixture: ComponentFixture<GlobalSummary>;
  let component: GlobalSummary;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GlobalSummary],
      providers: [
        provideSmartNgRX(),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: topEffectsServiceToken, useValue: {} },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(GlobalSummary);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    // Discard outstanding requests from concurrent init fetch operations
    httpMock.match(function matchSummary(req) {
      return req.url.includes('/api/summary');
    });
    httpMock.verify();
  });

  it('should handle tooltip with undefined label', () => {
    fixture.detectChanges();

    const options = component.pieChartOptions;
    const tooltipCallback = options.plugins!.tooltip!.callbacks!.label;

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
    expect(result).toContain('50%');
    expect(result).toMatch(/^:\s/);
  });

  it('should handle tooltip with undefined raw value', () => {
    fixture.detectChanges();

    const options = component.pieChartOptions;
    const tooltipCallback = options.plugins!.tooltip!.callbacks!.label;

    const tooltipItem = {
      label: 'Equities',
      raw: undefined,
      parsed: 0,
      dataIndex: 0,
      dataset: { data: [0, 30000, 20000] },
    };

    const result = (tooltipCallback as (...args: unknown[]) => string)(
      tooltipItem
    );
    expect(result).toContain('Equities');
    expect(result).toContain('$0');
  });

  it('should handle tooltip when total is zero', () => {
    fixture.detectChanges();

    const options = component.pieChartOptions;
    const tooltipCallback = options.plugins!.tooltip!.callbacks!.label;

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

  it('should handle null month in valueChanges without calling fetchSummary', () => {
    fixture.detectChanges();

    // Flush initial summary request from ngOnInit
    const initialReq = httpMock.expectOne(
      (req) => req.url === '/api/summary' && req.params.has('month')
    );
    initialReq.flush({
      deposits: 0,
      dividends: 0,
      capitalGains: 0,
      equities: 0,
      income: 0,
      tax_free_income: 0,
    });

    // Set null value — should NOT trigger a new fetchSummary
    component.selectedMonth.setValue(null as unknown as string);

    // No additional summary request should be made
    httpMock.expectNone(function matchRefreshSummary(req) {
      return req.url === '/api/summary' && req.params.get('month') === 'null';
    });
  });

  it('should use fallback month when selectedMonth value is null during refreshData', () => {
    fixture.detectChanges();

    // Flush initial request
    const initialReq = httpMock.expectOne(
      (req) => req.url === '/api/summary' && req.params.has('month')
    );
    initialReq.flush({
      deposits: 0,
      dividends: 0,
      capitalGains: 0,
      equities: 0,
      income: 0,
      tax_free_income: 0,
    });

    // Force selectedMonth to null (edge case)
    component.selectedMonth.setValue(null as unknown as string);

    // Call refreshData — should use fallback '2025-03'
    component.refreshData();

    const refreshReq = httpMock.expectOne(function matchRefreshFallback(req) {
      return (
        req.url === '/api/summary' && req.params.get('month') === '2025-03'
      );
    });
    refreshReq.flush({
      deposits: 0,
      dividends: 0,
      capitalGains: 0,
      equities: 0,
      income: 0,
      tax_free_income: 0,
    });

    expect(refreshReq.request.params.get('month')).toBe('2025-03');
  });
});
