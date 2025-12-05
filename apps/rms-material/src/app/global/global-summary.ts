import { Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'rms-global-summary',
  imports: [MatCardModule],
  template: `
    <mat-card>
      <mat-card-header>
        <mat-card-title>Summary</mat-card-title>
      </mat-card-header>
      <mat-card-content>
        <p>Global summary view coming soon.</p>
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
export class GlobalSummary {}
