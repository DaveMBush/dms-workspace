import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { PaginatorModule } from 'primeng/paginator';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { ToolbarModule } from 'primeng/toolbar';

import { GlobalErrorLogsService } from './global-error-logs.service';
import { LogFileInfo } from './log-file-info.interface';
import { LogFilters } from './log-filters.interface';

@Component({
  selector: 'dms-global-error-logs',
  standalone: true,
  imports: [
    FormsModule,
    TableModule,
    PaginatorModule,
    ToolbarModule,
    ButtonModule,
    InputTextModule,
    SelectModule,
    MessageModule,
  ],
  templateUrl: './global-error-logs.component.html',
  styleUrl: './global-error-logs.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GlobalErrorLogsComponent implements OnInit, OnDestroy {
  private errorLogsService = inject(GlobalErrorLogsService);
  private refreshInterval?: number;

  logs = this.errorLogsService.logs;
  logFiles = this.errorLogsService.logFiles;
  isLoading = this.errorLogsService.isLoading;
  isLoadingFiles = this.errorLogsService.isLoadingFiles;
  error = this.errorLogsService.error;

  filters = signal<LogFilters>({
    level: null,
    dateFrom: null,
    dateTo: null,
    search: '',
    selectedFile: null,
  });

  pageSize = signal(50);
  currentPage = signal(1);

  // eslint-disable-next-line @smarttools/no-anonymous-functions -- Computed signals require lexical this binding
  paginatorFirst = computed(() => (this.currentPage() - 1) * this.pageSize());

  // eslint-disable-next-line @smarttools/no-anonymous-functions -- Computed signals require lexical this binding
  errorMessage = computed(() => this.error());

  isLoadingWithoutLogs = computed(
    // eslint-disable-next-line @smarttools/no-anonymous-functions -- Computed signals require lexical this binding
    () => this.isLoading() && this.logs().logs.length === 0
  );

  shouldShowTable = computed(
    // eslint-disable-next-line @smarttools/no-anonymous-functions -- Computed signals require lexical this binding
    () => !this.isLoading() || this.logs().logs.length > 0
  );

  // eslint-disable-next-line @smarttools/no-anonymous-functions -- Computed signals require lexical this binding
  shouldShowPaginator = computed(() => this.logs().totalPages > 1);

  // eslint-disable-next-line @smarttools/no-anonymous-functions -- Computed signals require lexical this binding
  hasError = computed(() => {
    const error = this.error();
    return error !== null && error !== undefined && error !== '';
  });

  // eslint-disable-next-line @smarttools/no-anonymous-functions -- Computed signals require lexical this binding
  totalRecords = computed(() => this.logs().totalCount);

  // eslint-disable-next-line @smarttools/no-anonymous-functions -- Computed signals require lexical this binding
  currentLogs = computed(() => this.logs().logs);

  // eslint-disable-next-line @smarttools/no-anonymous-functions -- Computed signals require lexical this binding
  isCurrentlyLoading = computed(() => this.isLoading());

  // eslint-disable-next-line @smarttools/no-anonymous-functions -- Computed signals require lexical this binding
  filterLevel = computed(() => this.filters().level);

  // eslint-disable-next-line @smarttools/no-anonymous-functions -- Computed signals require lexical this binding
  filterDateFrom = computed(() => this.filters().dateFrom);

  // eslint-disable-next-line @smarttools/no-anonymous-functions -- Computed signals require lexical this binding
  filterDateTo = computed(() => this.filters().dateTo);

  // eslint-disable-next-line @smarttools/no-anonymous-functions -- Computed signals require lexical this binding
  filterSearch = computed(() => this.filters().search);

  // eslint-disable-next-line @smarttools/no-anonymous-functions -- Computed signals require lexical this binding
  selectedFileName = computed(() => this.filters().selectedFile);

  // eslint-disable-next-line @smarttools/no-anonymous-functions -- Computed signals require lexical this binding
  fileOptions = computed(() => {
    const files = this.logFiles();
    const options = files.map(function mapToOption(file: LogFileInfo) {
      return {
        label: file.displayName,
        value: file.filename,
      };
    });
    // Add "All Files" option at the beginning
    return [{ label: 'All Files', value: null }, ...options];
  });

  levelOptions = [
    { label: 'All Levels', value: null },
    { label: 'Error', value: 'error' },
    { label: 'Warning', value: 'warning' },
    { label: 'Info', value: 'info' },
    { label: 'Debug', value: 'debug' },
  ];

  ngOnInit(): void {
    this.loadLogFiles();
    this.loadLogs();
    this.startPeriodicRefresh();
  }

  ngOnDestroy(): void {
    if (this.refreshInterval !== undefined) {
      clearInterval(this.refreshInterval);
    }
  }

  loadLogFiles(): void {
    this.errorLogsService.getLogFiles().subscribe();
  }

  loadLogs(): void {
    this.errorLogsService
      .getErrorLogs(this.currentPage(), this.pageSize(), this.filters())
      .subscribe();
  }

  onPageChange(event: { page?: number; rows?: number }): void {
    const page = event.page ?? 0;
    const rows = event.rows ?? 50;
    this.currentPage.set(page + 1);
    this.pageSize.set(rows);
    this.loadLogs();
  }

  onFilterChange(): void {
    this.currentPage.set(1);
    this.loadLogs();
  }

  onLevelChange(level: string | null): void {
    // eslint-disable-next-line @smarttools/no-anonymous-functions -- Signal update requires lexical scope access
    this.filters.update((current) => ({ ...current, level }));
    this.onFilterChange();
  }

  onDateFromChange(dateFrom: Date | null): void {
    // eslint-disable-next-line @smarttools/no-anonymous-functions -- Signal update requires lexical scope access
    this.filters.update((current) => ({ ...current, dateFrom }));
    this.onFilterChange();
  }

  onDateToChange(dateTo: Date | null): void {
    // eslint-disable-next-line @smarttools/no-anonymous-functions -- Signal update requires lexical scope access
    this.filters.update((current) => ({ ...current, dateTo }));
    this.onFilterChange();
  }

  onSearchChange(search: string): void {
    // eslint-disable-next-line @smarttools/no-anonymous-functions -- Signal update requires lexical scope access
    this.filters.update((current) => ({ ...current, search }));
    this.onFilterChange();
  }

  onFileChange(selectedFile: string | null): void {
    // eslint-disable-next-line @smarttools/no-anonymous-functions -- Signal update requires lexical scope access
    this.filters.update((current) => ({ ...current, selectedFile }));
    this.onFilterChange();
  }

  deleteLogFile(filename: string): void {
    if (
      confirm(`Are you sure you want to delete the log file "${filename}"?`)
    ) {
      this.errorLogsService.deleteLogFile(filename).subscribe();
    }
  }

  clearFilters(): void {
    this.filters.set({
      level: null,
      dateFrom: null,
      dateTo: null,
      search: '',
      selectedFile: null,
    });
    this.onFilterChange();
  }

  refreshLogs(): void {
    this.loadLogFiles();
    this.errorLogsService.refreshLogs();
  }

  formatTimestamp(timestamp: string): string {
    return new Date(timestamp).toLocaleString();
  }

  getLevelSeverity(level: string): string {
    switch (level) {
      case 'error':
        return 'error';
      case 'warning':
        return 'warn';
      case 'info':
        return 'info';
      case 'debug':
        return 'secondary';
      default:
        return 'secondary';
    }
  }

  formatContext(context?: Record<string, unknown>): string {
    if (!context) {
      return '';
    }
    return JSON.stringify(context, null, 2);
  }

  getFormattedTimestamp(timestamp: string): string {
    return this.formatTimestamp(timestamp);
  }

  getLevelSeverityClass(level: string): string {
    const severity = this.getLevelSeverity(level);
    return `bg-${severity}-100 text-${severity}-800`;
  }

  getFormattedContext(context?: Record<string, unknown>): string {
    return this.formatContext(context);
  }

  getUpperCaseLevel(level: string): string {
    return level.toUpperCase();
  }

  private startPeriodicRefresh(): void {
    const context = this;
    this.refreshInterval = setInterval(function refreshLogsInterval() {
      context.refreshLogs();
    }, 30000) as unknown as number;
  }
}
