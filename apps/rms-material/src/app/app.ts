import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';

import { ThemeService } from './shared/services/theme.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterModule, MatButtonModule, MatIconModule],
  selector: 'rms-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected title = 'rms-material';
  protected themeService = inject(ThemeService);
  protected isDarkMode$ = this.themeService.isDarkMode$;
}
