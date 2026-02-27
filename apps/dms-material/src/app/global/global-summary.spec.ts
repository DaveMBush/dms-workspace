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

describe.skip('GlobalSummary - Service Integration', () => {
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

    fixture.detectChanges();

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

    fixture.detectChanges();

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

    fixture.detectChanges();

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

    fixture.detectChanges();

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

    fixture.detectChanges();

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
    fixture.detectChanges();

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

    fixture.detectChanges();

    expect(component.basis$()).toBe(120000);
  });
});

describe.skip('GlobalSummary - Graph Integration', () => {
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

describe.skip('GlobalSummary - Available Months', () => {
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

describe.skip('GlobalSummary - Error Handling', () => {
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
