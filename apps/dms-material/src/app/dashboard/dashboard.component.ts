import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'dms-dashboard',
  templateUrl: './dashboard.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent {}
