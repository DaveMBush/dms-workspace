import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'dms-global-error-logs',
  imports: [MatCardModule],
  templateUrl: './global-error-logs.html',
  styleUrl: './global-error-logs.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GlobalErrorLogs {}
