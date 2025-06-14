import { isPlatformBrowser } from '@angular/common';
import { Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { ToolbarModule } from 'primeng/toolbar';

const DARK_MODE_KEY = 'rms-dark';

@Component({
  imports: [ButtonModule, RouterModule, ToolbarModule],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  themeIcon = 'pi-moon';
  constructor(@Inject(PLATFORM_ID) private platformId: object) {}
  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
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
