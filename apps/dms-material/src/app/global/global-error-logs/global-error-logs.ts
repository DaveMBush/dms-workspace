import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatToolbarModule } from '@angular/material/toolbar';

interface ErrorLog {
  id: string;
  timestamp: Date;
  level: string;
  message: string;
  requestId: string;
  userId: string;
  context: string;
}

@Component({
  selector: 'dms-global-error-logs',
  imports: [
    DatePipe,
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatNativeDateModule,
    MatPaginatorModule,
    MatSelectModule,
    MatTableModule,
    MatToolbarModule,
  ],
  templateUrl: './global-error-logs.html',
  styleUrl: './global-error-logs.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GlobalErrorLogs implements OnInit {
  displayedColumns = [
    'timestamp',
    'level',
    'message',
    'requestId',
    'userId',
    'context',
  ];

  pageSizeOptions = [10, 25, 50, 100];

  errorLogs$ = signal<ErrorLog[]>([]);
  totalRecords$ = signal(0);
  pageSize$ = signal(50);
  pageIndex$ = signal(0);
  isLoading$ = signal(false);

  // Filter options
  fileTypes = ['All Files', 'API', 'Database', 'Auth', 'System'];
  levels = ['All Levels', 'INFO', 'WARNING', 'ERROR', 'DEBUG'];

  // Filter values
  selectedFile$ = signal<string>('All Files');
  selectedLevel$ = signal<string>('All Levels');
  startDate$ = signal<Date | null>(null);
  endDate$ = signal<Date | null>(null);
  searchMessage = '';

  ngOnInit(): void {
    this.loadErrorLogs();
  }

  loadErrorLogs(): void {
    this.isLoading$.set(true);
    // Fetch from API with pagination and filters
    // Simulate API call for now
    setTimeout(this.clearLoadingState.bind(this), 100);
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex$.set(event.pageIndex);
    this.pageSize$.set(event.pageSize);
    this.loadErrorLogs();
  }

  onFileFilter(file: string): void {
    this.selectedFile$.set(file);
    this.pageIndex$.set(0);
    this.loadErrorLogs();
  }

  onLevelFilter(level: string): void {
    this.selectedLevel$.set(level);
    this.pageIndex$.set(0);
    this.loadErrorLogs();
  }

  onStartDateChange(date: Date | null): void {
    this.startDate$.set(date);
  }

  onEndDateChange(date: Date | null): void {
    this.endDate$.set(date);
  }

  onApplyFilters(): void {
    this.pageIndex$.set(0);
    this.loadErrorLogs();
  }

  onSearch(): void {
    this.pageIndex$.set(0);
    this.loadErrorLogs();
  }

  private clearLoadingState(): void {
    this.isLoading$.set(false);
  }
}
