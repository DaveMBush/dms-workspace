import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'rms-global-summary',
  imports: [MatCardModule],
  templateUrl: './global-summary.html',
  styleUrl: './global-summary.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GlobalSummary {}
