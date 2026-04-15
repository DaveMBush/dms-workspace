import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatToolbarModule } from '@angular/material/toolbar';

interface ErrorLogEntry {
  id: string;
  timestamp: string;
  level: string;
  message: string;
  requestId?: string;
}

interface ErrorLogResponse {
  logs: ErrorLogEntry[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
}

@Component({
  selector: 'dms-global-error-logs',
  standalone: true,
  imports: [
    DatePipe,
    MatCardModule,
    MatProgressSpinnerModule,
    MatTableModule,
    MatToolbarModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './global-error-logs.html',
})
export class GlobalErrorLogsComponent implements OnInit {
  private readonly http = inject(HttpClient);

  readonly loading$ = signal(true);
  readonly errorMessage$ = signal('');
  readonly logs$ = signal<ErrorLogEntry[]>([]);
  readonly displayedColumns = ['timestamp', 'level', 'message'];

  ngOnInit(): void {
    const self = this;
    this.http.get<ErrorLogResponse>('/api/logs/errors').subscribe({
      next: function onLogsSuccess(response) {
        self.logs$.set(response.logs);
        self.loading$.set(false);
      },
      error: function onLogsError() {
        self.errorMessage$.set('Failed to load error logs.');
        self.loading$.set(false);
      },
    });
  }
}
