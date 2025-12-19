import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { signal } from '@angular/core';
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
import { topEffectsServiceToken } from '../store/top/top-effect-service-token';

describe('GlobalSummary', () => {
  let component: GlobalSummary;
  let fixture: ComponentFixture<GlobalSummary>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GlobalSummary, NoopAnimationsModule],
      providers: [
        provideSmartNgRX(),
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
    const charts = fixture.nativeElement.querySelectorAll('rms-summary-display');
    expect(charts.length).toBe(2); // pie and line
  });
});
