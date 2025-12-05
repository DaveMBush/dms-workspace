import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'rms-global-screener',
  imports: [MatCardModule],
  templateUrl: './global-screener.html',
  styleUrl: './global-screener.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GlobalScreener {}
