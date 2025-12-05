import { Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'rms-global-error-logs',
  imports: [MatCardModule],
  template: `
    <mat-card>
      <mat-card-header>
        <mat-card-title>Error Logs</mat-card-title>
      </mat-card-header>
      <mat-card-content>
        <p>Global error logs view coming soon.</p>
      </mat-card-content>
    </mat-card>
  `,
  styles: `
    :host {
      display: block;
      padding: 16px;
    }
  `,
})
export class GlobalErrorLogs {}
