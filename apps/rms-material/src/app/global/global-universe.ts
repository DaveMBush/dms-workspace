import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'rms-global-universe',
  imports: [MatCardModule],
  templateUrl: './global-universe.html',
  styleUrl: './global-universe.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GlobalUniverse {}
