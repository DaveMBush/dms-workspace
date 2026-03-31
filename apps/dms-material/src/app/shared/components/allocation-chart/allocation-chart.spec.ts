import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ChartData } from 'chart.js';

import { AllocationChartComponent } from './allocation-chart';

function makeEmptyPieData(): ChartData<'pie'> {
  return {
    labels: ['Equities', 'Income', 'Tax Free'],
    datasets: [{ data: [0, 0, 0] }],
  };
}

describe('AllocationChartComponent', () => {
  let component: AllocationChartComponent;
  let fixture: ComponentFixture<AllocationChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AllocationChartComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AllocationChartComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('allocationData$', makeEmptyPieData());
    fixture.componentRef.setInput('hasAllocationData$', false);
    fixture.componentRef.setInput('pieChartOptions$', {});
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show no-data-message when hasAllocationData$ is false', () => {
    fixture.detectChanges();
    const msg = fixture.nativeElement.querySelector('.no-data-message');
    expect(msg).toBeTruthy();
  });

  it('should hide no-data-message when hasAllocationData$ is true', () => {
    fixture.componentRef.setInput('hasAllocationData$', true);
    fixture.detectChanges();
    const msg = fixture.nativeElement.querySelector('.no-data-message');
    expect(msg).toBeNull();
  });
});
