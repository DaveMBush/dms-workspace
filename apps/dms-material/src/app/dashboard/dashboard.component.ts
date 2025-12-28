import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'rms-dashboard',
  templateUrl: './dashboard.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent {}
