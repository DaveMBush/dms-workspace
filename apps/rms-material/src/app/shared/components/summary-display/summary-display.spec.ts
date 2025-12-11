import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChartData } from 'chart.js';

import { SummaryDisplayComponent } from './summary-display';

describe('SummaryDisplayComponent', () => {
  let component: SummaryDisplayComponent;
  let fixture: ComponentFixture<SummaryDisplayComponent>;

  const mockPieData: ChartData<'pie'> = {
    labels: ['A', 'B'],
    datasets: [{ data: [50, 50] }],
  };

  const mockLineData: ChartData<'line'> = {
    labels: ['Jan', 'Feb', 'Mar'],
    datasets: [
      {
        label: 'Portfolio Value',
        data: [10000, 10500, 11000],
        borderColor: '#3B82F6',
      },
    ],
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SummaryDisplayComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SummaryDisplayComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('data$', mockPieData);
  });

  describe('Basic Rendering', () => {
    it('should create', () => {
      fixture.detectChanges();
      expect(component).toBeTruthy();
    });

    it('should render chart container', () => {
      fixture.detectChanges();
      const container = fixture.nativeElement.querySelector('.chart-container');
      expect(container).toBeTruthy();
    });

    it('should render canvas element', () => {
      fixture.detectChanges();
      const canvas = fixture.nativeElement.querySelector('canvas');
      expect(canvas).toBeTruthy();
    });
  });

  describe('Height Configuration', () => {
    it('should apply default height of 300px', () => {
      fixture.detectChanges();
      const container = fixture.nativeElement.querySelector('.chart-container');
      expect(container.style.height).toBe('300px');
    });

    it('should apply custom height', () => {
      fixture.componentRef.setInput('height$', '400px');
      fixture.detectChanges();
      const container = fixture.nativeElement.querySelector('.chart-container');
      expect(container.style.height).toBe('400px');
    });
  });

  describe('Chart Data', () => {
    it('should compute chart data from input', () => {
      fixture.detectChanges();
      expect(component.chartData$()).toEqual(mockPieData);
    });

    it('should update chart data when input changes', () => {
      // Test the signal computation directly without fixture.detectChanges()
      // to avoid Chart.js lifecycle issues in test environment
      expect(component.chartData$()).toEqual(mockPieData);

      fixture.componentRef.setInput('data$', mockLineData);
      expect(component.chartData$()).toEqual(mockLineData);
    });
  });

  describe('Chart Options', () => {
    it('should have responsive option enabled by default', () => {
      fixture.detectChanges();
      expect(component.chartOptions$().responsive).toBe(true);
    });

    it('should have maintainAspectRatio disabled by default', () => {
      fixture.detectChanges();
      expect(component.chartOptions$().maintainAspectRatio).toBe(false);
    });

    it('should have legend enabled by default', () => {
      fixture.detectChanges();
      expect(component.chartOptions$().plugins?.legend?.display).toBe(true);
    });

    it('should have tooltip enabled by default', () => {
      fixture.detectChanges();
      expect(component.chartOptions$().plugins?.tooltip?.enabled).toBe(true);
    });

    it('should merge default options with provided options', () => {
      fixture.componentRef.setInput('options$', {
        plugins: { legend: { position: 'top' as const } },
      });
      fixture.detectChanges();
      expect(component.chartOptions$().plugins?.legend?.position).toBe('top');
    });

    it('should preserve default responsive when merging options', () => {
      fixture.componentRef.setInput('options$', {
        plugins: { legend: { position: 'top' as const } },
      });
      fixture.detectChanges();
      expect(component.chartOptions$().responsive).toBe(true);
    });
  });

  describe('Chart Type', () => {
    it('should default to pie chart type', () => {
      expect(component.chartType$()).toBe('pie');
    });

    it('should allow line chart type', () => {
      fixture.componentRef.setInput('chartType$', 'line');
      expect(component.chartType$()).toBe('line');
    });

    it('should allow bar chart type', () => {
      fixture.componentRef.setInput('chartType$', 'bar');
      expect(component.chartType$()).toBe('bar');
    });

    it('should allow doughnut chart type', () => {
      fixture.componentRef.setInput('chartType$', 'doughnut');
      expect(component.chartType$()).toBe('doughnut');
    });
  });

  describe('Chart Title', () => {
    it('should not show title by default', () => {
      fixture.detectChanges();
      expect(component.chartOptions$().plugins?.title?.display).toBeFalsy();
    });

    it('should show title when provided', () => {
      fixture.componentRef.setInput('title$', 'Portfolio Allocation');
      fixture.detectChanges();
      expect(component.chartOptions$().plugins?.title?.display).toBe(true);
      expect(component.chartOptions$().plugins?.title?.text).toBe(
        'Portfolio Allocation'
      );
    });
  });

  describe('Legend Position', () => {
    it('should default legend position to bottom', () => {
      fixture.detectChanges();
      expect(component.chartOptions$().plugins?.legend?.position).toBe(
        'bottom'
      );
    });

    it('should allow custom legend position', () => {
      fixture.componentRef.setInput('legendPosition$', 'right');
      fixture.detectChanges();
      expect(component.chartOptions$().plugins?.legend?.position).toBe('right');
    });
  });

  describe('Show Legend', () => {
    it('should show legend by default', () => {
      fixture.detectChanges();
      expect(component.chartOptions$().plugins?.legend?.display).toBe(true);
    });

    it('should hide legend when showLegend is false', () => {
      fixture.componentRef.setInput('showLegend$', false);
      fixture.detectChanges();
      expect(component.chartOptions$().plugins?.legend?.display).toBe(false);
    });
  });

  describe('Empty Data Handling', () => {
    it('should show no data message when data is empty', () => {
      const emptyData: ChartData<'pie'> = {
        labels: [],
        datasets: [{ data: [] }],
      };
      fixture.componentRef.setInput('data$', emptyData);
      fixture.detectChanges();

      const noDataMessage =
        fixture.nativeElement.querySelector('.no-data-message');
      expect(noDataMessage).toBeTruthy();
      expect(noDataMessage.textContent).toContain('No data available');
    });

    it('should hide chart when data is empty', () => {
      const emptyData: ChartData<'pie'> = {
        labels: [],
        datasets: [{ data: [] }],
      };
      fixture.componentRef.setInput('data$', emptyData);
      fixture.detectChanges();

      const canvas = fixture.nativeElement.querySelector('canvas');
      expect(canvas).toBeFalsy();
    });

    it('should show chart when data has values', () => {
      fixture.detectChanges();
      const canvas = fixture.nativeElement.querySelector('canvas');
      expect(canvas).toBeTruthy();
    });
  });

  describe('Refresh Method', () => {
    it('should have a refresh method', () => {
      expect(typeof component.refresh).toBe('function');
    });
  });

  describe('Line Chart Specific', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('chartType$', 'line');
      fixture.componentRef.setInput('data$', mockLineData);
    });

    it('should render line chart with data', () => {
      fixture.detectChanges();
      expect(component.chartType$()).toBe('line');
      expect(component.chartData$()).toEqual(mockLineData);
    });
  });

  describe('Pie Chart Specific', () => {
    it('should render pie chart with data', () => {
      fixture.detectChanges();
      expect(component.chartType$()).toBe('pie');
      expect(component.chartData$()).toEqual(mockPieData);
    });
  });
});
