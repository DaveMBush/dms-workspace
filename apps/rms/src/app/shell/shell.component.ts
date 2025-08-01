import { isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnDestroy, OnInit, PLATFORM_ID } from '@angular/core';
import { NavigationEnd,Router, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { PanelModule } from 'primeng/panel';
import { SplitterModule } from 'primeng/splitter';
import { ToolbarModule } from 'primeng/toolbar';
import { TooltipModule } from 'primeng/tooltip';
import { filter, Subscription } from 'rxjs';

import { GlobalComponent } from '../global/global.component';
import { UniverseSettingsComponent } from '../universe-settings/universe-settings.component';
import { UniverseSettingsService } from '../universe-settings/universe-settings.service';

const DARK_MODE_KEY = 'rms-dark';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ButtonModule,
    PanelModule,
    RouterModule,
    ToolbarModule,
    SplitterModule,
    TooltipModule,
    UniverseSettingsComponent,
    GlobalComponent,
  ],
  selector: 'rms-shell',
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
  standalone: true,
})
export class ShellComponent implements OnInit, OnDestroy {
  themeIcon = 'pi-moon';
  themeTooltip = 'Dark Mode';
  platformId = inject(PLATFORM_ID);
  isBrowser = isPlatformBrowser(this.platformId);
  protected readonly settingsService = inject(UniverseSettingsService);
  private router = inject(Router);
  private routeSubscription?: Subscription;
  selectedId: string | null = null;

  ngOnInit(): void {
    if (this.isBrowser) {
      if (document.readyState === 'complete') {
        this.afterPageLoad();
      } else {
        const self = this;
        window.addEventListener('load', function afterLoad() {
          self.afterPageLoad();
        });
      }
    }

    // Set initial selection based on current route
    this.updateSelectionFromRoute(this.router.url);

    // Listen for route changes
    const self = this;
    this.routeSubscription = this.router.events
      .pipe(filter(function filterNavigationEnd(event) {
        return event instanceof NavigationEnd;
      }))
      .subscribe(function routeChangeSubscription() {
        self.updateSelectionFromRoute(self.router.url);
      });
  }

  ngOnDestroy(): void {
    this.routeSubscription?.unsubscribe();
  }

  private updateSelectionFromRoute(url: string): void {
    const globalMatch = /\/global\/([^/]+)/.exec(url);
    const globalId = globalMatch?.[1];

    if (globalId !== undefined && globalId !== '') {
      this.selectedId = globalId;
    } else {
      // Clear selection if not on a global route
      this.selectedId = null;
    }
  }

  protected toggleTheme(): void {
    const isDark = localStorage.getItem(DARK_MODE_KEY) === 'true';
    document.querySelector('html')?.classList.toggle('p-dark', !isDark);
    localStorage.setItem(DARK_MODE_KEY, !isDark ? 'true' : 'false');
    this.themeIcon = !isDark ? 'pi-sun' : 'pi-moon';
    this.themeTooltip = !isDark ? 'Light Mode' : 'Dark Mode';
  }

  protected onSelectionChange(e: {id: string, name: string}): void {
    this.selectedId = e.id;
  }

  private afterPageLoad(): void {
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

}
