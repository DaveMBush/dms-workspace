import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ChartData } from 'chart.js';

import { PerformanceChartComponent } from './performance-chart';

function makeEmptyLineData(): ChartData<'line'> {
  return {
    labels: [],
    datasets: [{ data: [] }],
  };
}

describe('PerformanceChartComponent', () => {
  let component: PerformanceChartComponent;
  let fixture: ComponentFixture<PerformanceChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PerformanceChartComponent, NoopAnimationsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(PerformanceChartComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('performanceData$', makeEmptyLineData());
    fixture.componentRef.setInput(
      'selectedYear$',
      new FormControl(new Date().getFullYear())
    );
    fixture.componentRef.setInput('yearOptions$', [2023, 2024, 2025]);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render the year selector', () => {
    fixture.detectChanges();
    const selector = fixture.nativeElement.querySelector(
      '[data-testid="year-selector"]'
    );
    expect(selector).toBeTruthy();
  });

  it('should render the performance chart', () => {
    fixture.detectChanges();
    const chart = fixture.nativeElement.querySelector(
      '[data-testid="performance-chart"]'
    );
    expect(chart).toBeTruthy();
  });
});
