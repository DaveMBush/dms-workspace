import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GlobalErrorLogs } from './global-error-logs';

describe('GlobalErrorLogs', () => {
  let component: GlobalErrorLogs;
  let fixture: ComponentFixture<GlobalErrorLogs>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GlobalErrorLogs],
    }).compileComponents();

    fixture = TestBed.createComponent(GlobalErrorLogs);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should define displayed columns', () => {
    expect(component.displayedColumns).toContain('timestamp');
    expect(component.displayedColumns).toContain('level');
    expect(component.displayedColumns).toContain('message');
    expect(component.displayedColumns).toContain('requestId');
    expect(component.displayedColumns).toContain('userId');
    expect(component.displayedColumns).toContain('context');
  });

  it('should initialize with default pagination', () => {
    expect(component.pageSize$()).toBe(50);
    expect(component.pageIndex$()).toBe(0);
  });

  it('should update pagination on page change', () => {
    component.onPageChange({ pageIndex: 2, pageSize: 50, length: 100 });
    expect(component.pageIndex$()).toBe(2);
    expect(component.pageSize$()).toBe(50);
  });

  it('should reset page on file filter', () => {
    component.pageIndex$.set(5);
    component.onFileFilter('API');
    expect(component.selectedFile$()).toBe('API');
    expect(component.pageIndex$()).toBe(0);
  });

  it('should reset page on level filter', () => {
    component.pageIndex$.set(5);
    component.onLevelFilter('ERROR');
    expect(component.selectedLevel$()).toBe('ERROR');
    expect(component.pageIndex$()).toBe(0);
  });

  it('should have filter options defined', () => {
    expect(component.fileTypes.length).toBeGreaterThan(0);
    expect(component.fileTypes).toContain('All Files');
    expect(component.levels.length).toBeGreaterThan(0);
    expect(component.levels).toContain('All Levels');
  });

  it('should set loading state during fetch', () => {
    component.loadErrorLogs();
    expect(component.isLoading$()).toBe(true);
  });

  it('should handle date filter changes', () => {
    const testDate = new Date('2025-01-01');
    component.onStartDateChange(testDate);
    expect(component.startDate$()).toEqual(testDate);

    component.onEndDateChange(testDate);
    expect(component.endDate$()).toEqual(testDate);
  });

  it('should have search message property', () => {
    expect(component.searchMessage).toBeDefined();
    component.searchMessage = 'test error message';
    expect(component.searchMessage).toBe('test error message');
  });
});
