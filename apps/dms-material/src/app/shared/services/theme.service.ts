import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private readonly themeKey = 'dms-theme';

  isDarkMode$ = signal(this.loadThemePreference());

  constructor() {
    this.syncThemeWithDom();
  }

  toggleTheme(): void {
    const newValue = !this.isDarkMode$();
    this.isDarkMode$.set(newValue);
    this.syncThemeWithDom();
    this.saveThemePreference();
  }

  private syncThemeWithDom(): void {
    if (this.isDarkMode$()) {
      this.addDarkThemeClass();
    } else {
      this.removeDarkThemeClass();
    }
  }

  private addDarkThemeClass(): void {
    document.body.classList.add('dark-theme');
  }

  private removeDarkThemeClass(): void {
    document.body.classList.remove('dark-theme');
  }

  private loadThemePreference(): boolean {
    try {
      const stored = localStorage.getItem(this.themeKey);
      if (stored !== null) {
        return stored === 'dark';
      }
      // Check system preference
      return this.getSystemPreference();
    } catch {
      return false;
    }
  }

  private getSystemPreference(): boolean {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    return mediaQuery?.matches ?? false;
  }

  private saveThemePreference(): void {
    try {
      const themeValue = this.isDarkMode$() ? 'dark' : 'light';
      localStorage.setItem(this.themeKey, themeValue);
    } catch {
      // localStorage not available, silently fail
    }
  }
}
