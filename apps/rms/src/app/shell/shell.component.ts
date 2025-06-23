import { isPlatformBrowser } from '@angular/common';
import { Component, inject, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { SplitterModule } from 'primeng/splitter';
import { ToolbarModule } from 'primeng/toolbar';
import { PanelModule } from 'primeng/panel';
import { TooltipModule } from 'primeng/tooltip';
import { SettingsComponent } from '../settings/settings.component';
import { SettingsService } from '../settings/settings.service';
import { GlobalComponent } from '../global/global.component';

const DARK_MODE_KEY = 'rms-dark';

@Component({
  imports: [
    ButtonModule,
    PanelModule,
    RouterModule,
    ToolbarModule,
    SplitterModule,
    TooltipModule,
    SettingsComponent,
    GlobalComponent,
  ],
  selector: 'app-shell',
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
  standalone: true,
})
export class ShellComponent implements OnInit {
  themeIcon = 'pi-moon';
  themeTooltip = 'Dark Mode';
  platformId = inject(PLATFORM_ID);
  isBrowser = isPlatformBrowser(this.platformId);
  protected readonly settingsService = inject(SettingsService);
  selectedId: string | null = null;

  ngOnInit(): void {
    if (this.isBrowser) {
      if (document.readyState === 'complete') {
        this.afterPageLoad();
      } else {
        window.addEventListener('load', () => this.afterPageLoad());
      }
    }
  }

  private afterPageLoad() {
    let darkValue = localStorage.getItem(DARK_MODE_KEY);
    if (darkValue === null) {
      // find the system preference for dark mode
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      localStorage.setItem(DARK_MODE_KEY, isDark ? 'true' : 'false');
      darkValue = isDark ? 'true' : 'false';
    }

    if (darkValue === 'true') {
      this.themeIcon = 'pi-sun';
      this.themeTooltip = 'Light Mode';
      document
        .querySelector('html')
        ?.classList.toggle('p-dark', true);
    }
  }

  protected toggleTheme() {
    const isDark = localStorage.getItem(DARK_MODE_KEY) === 'true';
    document.querySelector('html')?.classList.toggle('p-dark', !isDark);
    localStorage.setItem(DARK_MODE_KEY, !isDark ? 'true' : 'false');
    this.themeIcon = !isDark ? 'pi-sun' : 'pi-moon';
    this.themeTooltip = !isDark ? 'Light Mode' : 'Dark Mode';
  }

  onSelectionChange(e: {id: string, name: string}) {
    this.selectedId = e.id;
  }
}
