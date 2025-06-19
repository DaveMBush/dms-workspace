import { isPlatformBrowser } from '@angular/common';
import { Component, inject, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { SplitterModule } from 'primeng/splitter';
import { ToolbarModule } from 'primeng/toolbar';
import { PanelModule } from 'primeng/panel';

const DARK_MODE_KEY = 'rms-dark';

@Component({
  imports: [ButtonModule,PanelModule, RouterModule, ToolbarModule, SplitterModule],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  themeIcon = 'pi-moon';
  platformId = inject(PLATFORM_ID);
  isBrowser = isPlatformBrowser(this.platformId);
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
  }
}
