import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SummaryComponent } from './summary.component';

// Mock the entire selectTrades module to avoid SmartNgRX initialization
vi.mock('../../store/trades/selectors/select-trades.function', () => ({
  selectTrades: vi.fn().mockReturnValue([]),
}));

describe('SummaryComponent', () => {
  let component: SummaryComponent;
  let fixture: ComponentFixture<SummaryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SummaryComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SummaryComponent);
    component = fixture.componentInstance;
  });

  it('should compute allocation data', () => {
    fixture.detectChanges();
    const data = component.allocationData;
    expect(data.labels).toBeDefined();
    expect(data.datasets.length).toBeGreaterThan(0);
  });

  it('should compute performance data', () => {
    fixture.detectChanges();
    const data = component.performanceData;
    expect(data.labels).toBeDefined();
    expect(data.datasets.length).toBeGreaterThan(0);
  });

  it('should compute total value', () => {
    fixture.detectChanges();
    expect(component.totalValue).toBeDefined();
  });

  it('should compute total gain', () => {
    fixture.detectChanges();
    expect(component.totalGain).toBeDefined();
  });

  it('should compute gain percent', () => {
    fixture.detectChanges();
    expect(component.gainPercent).toBeDefined();
  });

  it('should render summary display components', () => {
    fixture.detectChanges();
    const charts = fixture.nativeElement.querySelectorAll(
      'dms-summary-display'
    );
    expect(charts.length).toBeGreaterThan(0);
  });
});
