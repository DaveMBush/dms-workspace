import { Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'rms-global-universe',
  imports: [MatCardModule],
  template: `
    <mat-card>
      <mat-card-header>
        <mat-card-title>Universe</mat-card-title>
      </mat-card-header>
      <mat-card-content>
        <p>Global universe view coming soon.</p>
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
export class GlobalUniverse {}
