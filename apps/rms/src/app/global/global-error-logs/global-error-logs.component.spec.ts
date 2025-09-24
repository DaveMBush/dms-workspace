import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { GlobalErrorLogsComponent } from './global-error-logs.component';
import { GlobalErrorLogsService } from './global-error-logs.service';

describe('GlobalErrorLogsComponent', () => {
  let component: GlobalErrorLogsComponent;
  let fixture: ComponentFixture<GlobalErrorLogsComponent>;
  let mockService: any;

  beforeEach(async () => {
    mockService = {
      logs: signal({
        logs: [],
        totalCount: 0,
        currentPage: 1,
        totalPages: 0,
      }),
      logFiles: signal([]),
      isLoading: signal(false),
      isLoadingFiles: signal(false),
      error: signal(null),
      currentFilters: signal({
        level: null,
        dateFrom: null,
        dateTo: null,
        search: '',
        selectedFile: null,
      }),
      getErrorLogs: vi.fn().mockReturnValue(
        of({
          logs: [],
          totalCount: 0,
          currentPage: 1,
          totalPages: 0,
        })
      ),
      getLogFiles: vi.fn().mockReturnValue(of({ files: [] })),
      deleteLogFile: vi
        .fn()
        .mockReturnValue(of({ success: true, message: 'File deleted' })),
      refreshLogs: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [GlobalErrorLogsComponent, NoopAnimationsModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: GlobalErrorLogsService, useValue: mockService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(GlobalErrorLogsComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load logs on init', () => {
    const loadLogsSpy = vi.spyOn(component, 'loadLogs');
    component.ngOnInit();
    expect(loadLogsSpy).toHaveBeenCalled();
  });

  it('should format timestamp correctly', () => {
    const timestamp = '2025-09-23T12:00:00.000Z';
    const formatted = component.formatTimestamp(timestamp);
    expect(formatted).toContain('2025');
  });

  it('should get correct severity for log levels', () => {
    expect(component.getLevelSeverity('error')).toBe('error');
    expect(component.getLevelSeverity('warning')).toBe('warn');
    expect(component.getLevelSeverity('info')).toBe('info');
    expect(component.getLevelSeverity('debug')).toBe('secondary');
  });

  it('should clear filters', () => {
    component.filters.set({
      level: 'error',
      dateFrom: new Date(),
      dateTo: new Date(),
      search: 'test',
      selectedFile: 'test.log',
    });

    const onFilterChangeSpy = vi.spyOn(component, 'onFilterChange');
    component.clearFilters();

    const filters = component.filters();
    expect(filters.level).toBeNull();
    expect(filters.dateFrom).toBeNull();
    expect(filters.dateTo).toBeNull();
    expect(filters.search).toBe('');
    expect(filters.selectedFile).toBeNull();
    expect(onFilterChangeSpy).toHaveBeenCalled();
  });

  it('should handle page change', () => {
    const loadLogsSpy = vi.spyOn(component, 'loadLogs');

    component.onPageChange({ page: 2, rows: 25 });

    expect(component.currentPage()).toBe(3); // page is 0-indexed
    expect(component.pageSize()).toBe(25);
    expect(loadLogsSpy).toHaveBeenCalled();
  });

  it('should clean up interval on destroy', () => {
    const clearIntervalSpy = vi.spyOn(window, 'clearInterval');
    component.refreshInterval = 123 as unknown as number;

    component.ngOnDestroy();

    expect(clearIntervalSpy).toHaveBeenCalledWith(123);
  });
});
