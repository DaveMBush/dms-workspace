# Story AA.3: Create Custom Material Theme with Light/Dark Mode

## Story

**As a** user of the dms-material application
**I want** the application to match the current DMS styling with light/dark mode support
**So that** the migration provides a consistent visual experience

## Context

**Current System:**

- DMS uses PrimeNG Aura theme with TailwindCSS
- Dark mode controlled via `.p-dark` class on body
- CSS layers: `tailwind-base, primeng, tailwind-utilities`
- Colors: Primary blues, neutral grays, semantic colors for status

**New Theme:**

- Angular Material 3 (M3) theming system
- Dark mode controlled via `.dark-theme` class
- CSS layers: `tailwind-base, material, tailwind-utilities`
- Match Aura theme colors as closely as possible

## Acceptance Criteria

### Functional Requirements

- [ ] Custom Material theme created matching current Aura colors
- [ ] Light theme as default
- [ ] Dark theme applied when `.dark-theme` class on body
- [ ] Theme colors applied to all Material components
- [ ] Semantic colors for success, warning, error states

### Technical Requirements

- [ ] Theme files organized in `src/themes/` directory:
  - `_theme-variables.scss` - CSS custom properties
  - `_light-theme.scss` - Light theme definition
  - `_dark-theme.scss` - Dark theme definition
- [ ] `styles.scss` properly imports themes with CSS layer ordering
- [ ] TailwindCSS integration preserved
- [ ] Typography configured to match current styling

### Visual Requirements

- [ ] Primary color matches current blue (#3B82F6 or similar)
- [ ] Background colors match current light/dark backgrounds
- [ ] Text colors provide proper contrast in both modes
- [ ] Component colors (buttons, inputs, etc.) look consistent

### Validation Requirements

- [ ] Theme toggle switches between light and dark modes
- [ ] All Material components respect theme colors
- [ ] No CSS conflicts between Material and TailwindCSS
- [ ] Builds successfully with theme files

## Test-Driven Development Approach

**Write tests BEFORE implementation code.**

### Step 1: Create Unit Tests First

Create `apps/dms-material/src/app/shared/services/theme.service.spec.ts`:

```typescript
import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  let service: ThemeService;
  let localStorageSpy: ReturnType<typeof vi.spyOn>;
  let matchMediaSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Mock localStorage
    localStorageSpy = vi.spyOn(Storage.prototype, 'getItem');
    vi.spyOn(Storage.prototype, 'setItem');

    // Mock matchMedia
    matchMediaSpy = vi.spyOn(window, 'matchMedia');
    matchMediaSpy.mockReturnValue({ matches: false } as MediaQueryList);

    TestBed.configureTestingModule({});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.classList.remove('dark-theme');
  });

  describe('initialization', () => {
    it('should load light theme when localStorage is empty and system prefers light', () => {
      localStorageSpy.mockReturnValue(null);
      matchMediaSpy.mockReturnValue({ matches: false } as MediaQueryList);

      service = TestBed.inject(ThemeService);

      expect(service.isDarkMode()).toBe(false);
      expect(document.body.classList.contains('dark-theme')).toBe(false);
    });

    it('should load dark theme when localStorage has dark preference', () => {
      localStorageSpy.mockReturnValue('dark');

      service = TestBed.inject(ThemeService);

      expect(service.isDarkMode()).toBe(true);
      expect(document.body.classList.contains('dark-theme')).toBe(true);
    });

    it('should load light theme when localStorage has light preference', () => {
      localStorageSpy.mockReturnValue('light');

      service = TestBed.inject(ThemeService);

      expect(service.isDarkMode()).toBe(false);
    });

    it('should respect system preference when no localStorage value', () => {
      localStorageSpy.mockReturnValue(null);
      matchMediaSpy.mockReturnValue({ matches: true } as MediaQueryList);

      service = TestBed.inject(ThemeService);

      expect(service.isDarkMode()).toBe(true);
    });
  });

  describe('toggleTheme', () => {
    beforeEach(() => {
      localStorageSpy.mockReturnValue(null);
      service = TestBed.inject(ThemeService);
    });

    it('should toggle from light to dark', () => {
      expect(service.isDarkMode()).toBe(false);

      service.toggleTheme();

      expect(service.isDarkMode()).toBe(true);
      expect(document.body.classList.contains('dark-theme')).toBe(true);
    });

    it('should toggle from dark to light', () => {
      service.toggleTheme(); // Now dark

      service.toggleTheme(); // Back to light

      expect(service.isDarkMode()).toBe(false);
      expect(document.body.classList.contains('dark-theme')).toBe(false);
    });

    it('should persist theme preference to localStorage', () => {
      service.toggleTheme();

      expect(localStorage.setItem).toHaveBeenCalledWith('dms-theme', 'dark');
    });

    it('should persist light theme preference to localStorage', () => {
      service.toggleTheme(); // dark
      service.toggleTheme(); // light

      expect(localStorage.setItem).toHaveBeenLastCalledWith('dms-theme', 'light');
    });
  });

  describe('edge cases', () => {
    it('should handle localStorage throwing error gracefully', () => {
      localStorageSpy.mockImplementation(() => {
        throw new Error('localStorage not available');
      });

      expect(() => TestBed.inject(ThemeService)).not.toThrow();
    });

    it('should handle matchMedia not available', () => {
      localStorageSpy.mockReturnValue(null);
      matchMediaSpy.mockReturnValue(undefined as unknown as MediaQueryList);

      expect(() => TestBed.inject(ThemeService)).not.toThrow();
    });

    it('should apply theme immediately on toggle without delay', () => {
      localStorageSpy.mockReturnValue(null);
      service = TestBed.inject(ThemeService);

      service.toggleTheme();

      // Verify immediate application (no async delay)
      expect(document.body.classList.contains('dark-theme')).toBe(true);
    });
  });
});
```

**TDD Cycle:**

1. Run `pnpm nx run dms-material:test` - tests should fail (RED)
2. Implement minimal code to pass tests (GREEN)
3. Refactor while keeping tests passing (REFACTOR)

## Technical Approach

### Step 2: Create Theme Variables

Create `apps/dms-material/src/themes/_theme-variables.scss`:

```scss
// Theme color definitions matching PrimeNG Aura theme
// These CSS custom properties enable dynamic theming

:root {
  // Primary palette (blue)
  --dms-primary-50: #eff6ff;
  --dms-primary-100: #dbeafe;
  --dms-primary-200: #bfdbfe;
  --dms-primary-300: #93c5fd;
  --dms-primary-400: #60a5fa;
  --dms-primary-500: #3b82f6;
  --dms-primary-600: #2563eb;
  --dms-primary-700: #1d4ed8;
  --dms-primary-800: #1e40af;
  --dms-primary-900: #1e3a8a;

  // Neutral palette (gray)
  --dms-neutral-50: #f9fafb;
  --dms-neutral-100: #f3f4f6;
  --dms-neutral-200: #e5e7eb;
  --dms-neutral-300: #d1d5db;
  --dms-neutral-400: #9ca3af;
  --dms-neutral-500: #6b7280;
  --dms-neutral-600: #4b5563;
  --dms-neutral-700: #374151;
  --dms-neutral-800: #1f2937;
  --dms-neutral-900: #111827;

  // Semantic colors
  --dms-success: #22c55e;
  --dms-warning: #f59e0b;
  --dms-error: #ef4444;
  --dms-info: #3b82f6;
}
```

### Step 3: Create Light Theme

Create `apps/dms-material/src/themes/_light-theme.scss`:

```scss
@use '@angular/material' as mat;

// Light theme color configuration
$light-primary: mat.m3-define-palette(mat.$m3-blue-palette);
$light-accent: mat.m3-define-palette(mat.$m3-azure-palette);
$light-warn: mat.m3-define-palette(mat.$m3-red-palette);

$light-theme: mat.m3-define-theme(
  (
    color: (
      theme-type: light,
      primary: $light-primary,
      tertiary: $light-accent,
    ),
    typography: mat.m3-define-typography(
        (
          brand-family: 'Roboto, sans-serif',
          plain-family: 'Roboto, sans-serif',
        )
      ),
    density: (
      scale: 0,
    ),
  )
);

// Light theme specific CSS custom properties
:root {
  --dms-background: #ffffff;
  --dms-surface: #f9fafb;
  --dms-text-primary: #111827;
  --dms-text-secondary: #6b7280;
  --dms-border: #e5e7eb;
}
```

### Step 4: Create Dark Theme

Create `apps/dms-material/src/themes/_dark-theme.scss`:

```scss
@use '@angular/material' as mat;

// Dark theme color configuration
$dark-primary: mat.m3-define-palette(mat.$m3-blue-palette);
$dark-accent: mat.m3-define-palette(mat.$m3-azure-palette);
$dark-warn: mat.m3-define-palette(mat.$m3-red-palette);

$dark-theme: mat.m3-define-theme(
  (
    color: (
      theme-type: dark,
      primary: $dark-primary,
      tertiary: $dark-accent,
    ),
    typography: mat.m3-define-typography(
        (
          brand-family: 'Roboto, sans-serif',
          plain-family: 'Roboto, sans-serif',
        )
      ),
    density: (
      scale: 0,
    ),
  )
);

// Dark theme specific CSS custom properties
.dark-theme {
  --dms-background: #111827;
  --dms-surface: #1f2937;
  --dms-text-primary: #f9fafb;
  --dms-text-secondary: #9ca3af;
  --dms-border: #374151;
}
```

### Step 5: Update Main Styles

Update `apps/dms-material/src/styles.scss`:

```scss
@use '@angular/material' as mat;
@use './themes/theme-variables';
@use './themes/light-theme' as light;
@use './themes/dark-theme' as dark;

// CSS Layer ordering for proper specificity
@layer tailwind-base, material, tailwind-utilities;

@layer tailwind-base {
  @tailwind base;
}

@layer tailwind-utilities {
  @tailwind components;
  @tailwind utilities;
}

// Include Material core styles
@include mat.core();

// Apply light theme by default
@layer material {
  html {
    @include mat.all-component-themes(light.$light-theme);
  }

  // Apply dark theme when .dark-theme class is present
  .dark-theme {
    @include mat.all-component-colors(dark.$dark-theme);
  }
}

// Global styles
html,
body {
  margin: 0;
  font-family: Roboto, sans-serif;
  height: 100%;
  background-color: var(--dms-background);
  color: var(--dms-text-primary);
}

// Smooth theme transitions
* {
  transition: background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease;
}

// Custom utility classes for theming
.surface-ground {
  background-color: var(--dms-background);
}

.surface-card {
  background-color: var(--dms-surface);
}

.text-primary {
  color: var(--dms-text-primary);
}

.text-secondary {
  color: var(--dms-text-secondary);
}

.border-default {
  border-color: var(--dms-border);
}
```

### Step 6: Create Theme Toggle Service

Create `apps/dms-material/src/app/shared/services/theme.service.ts`:

```typescript
import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private readonly THEME_KEY = 'dms-theme';
  isDarkMode = signal(this.loadThemePreference());

  constructor() {
    this.applyTheme(this.isDarkMode());
  }

  toggleTheme(): void {
    const newValue = !this.isDarkMode();
    this.isDarkMode.set(newValue);
    this.applyTheme(newValue);
    this.saveThemePreference(newValue);
  }

  private applyTheme(isDark: boolean): void {
    if (isDark) {
      document.body.classList.add('dark-theme');
    } else {
      document.body.classList.remove('dark-theme');
    }
  }

  private loadThemePreference(): boolean {
    const stored = localStorage.getItem(this.THEME_KEY);
    if (stored !== null) {
      return stored === 'dark';
    }
    // Check system preference
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  private saveThemePreference(isDark: boolean): void {
    localStorage.setItem(this.THEME_KEY, isDark ? 'dark' : 'light');
  }
}
```

### Step 7: Verify Theme Toggle

Update `apps/dms-material/src/app/app.component.ts` to test theme:

```typescript
import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { ThemeService } from './shared/services/theme.service';

@Component({
  selector: 'dms-root',
  imports: [MatButtonModule, MatIconModule],
  template: `
    <div class="p-4">
      <h1 class="text-2xl mb-4">DMS Material - Theme Test</h1>
      <button mat-raised-button color="primary" (click)="themeService.toggleTheme()">
        <mat-icon>{{ themeService.isDarkMode() ? 'light_mode' : 'dark_mode' }}</mat-icon>
        Toggle Theme
      </button>
      <div class="mt-4 p-4 surface-card rounded border border-default">
        <p class="text-primary">Primary text on card surface</p>
        <p class="text-secondary">Secondary text for less emphasis</p>
      </div>
      <div class="mt-4 flex gap-2">
        <button mat-raised-button color="primary">Primary</button>
        <button mat-raised-button color="accent">Accent</button>
        <button mat-raised-button color="warn">Warn</button>
      </div>
    </div>
  `,
})
export class AppComponent {
  themeService = inject(ThemeService);
}
```

## Files Created/Modified

| File                                                         | Purpose                            |
| ------------------------------------------------------------ | ---------------------------------- |
| `apps/dms-material/src/themes/_theme-variables.scss`         | CSS custom properties for colors   |
| `apps/dms-material/src/themes/_light-theme.scss`             | Light theme Material configuration |
| `apps/dms-material/src/themes/_dark-theme.scss`              | Dark theme Material configuration  |
| `apps/dms-material/src/styles.scss`                          | Global styles with theme imports   |
| `apps/dms-material/src/app/shared/services/theme.service.ts` | Theme toggle service               |
| `apps/dms-material/src/app/app.component.ts`                 | Updated with theme test            |

## Color Mapping Reference

| PrimeNG Aura   | Material Equivalent | CSS Variable           |
| -------------- | ------------------- | ---------------------- |
| Primary blue   | Primary palette     | `--dms-primary-500`    |
| Surface ground | Background          | `--dms-background`     |
| Surface card   | Surface             | `--dms-surface`        |
| Text color     | Text primary        | `--dms-text-primary`   |
| Text secondary | Text secondary      | `--dms-text-secondary` |
| Border color   | Border              | `--dms-border`         |

## Definition of Done

- [ ] Theme variable file created with color palette
- [ ] Light theme file created with Material configuration
- [ ] Dark theme file created with Material configuration
- [ ] styles.scss updated with proper imports and layers
- [ ] Theme service created with toggle functionality
- [ ] Theme persists across page refreshes (localStorage)
- [ ] System preference detected on first visit
- [ ] All Material components respect theme colors
- [ ] Smooth transitions between themes
- [ ] Build succeeds with theme files

## E2E Test Requirements

When this story is complete, ensure the following e2e tests exist in `apps/dms-material-e2e/`:

### Core Functionality

- [ ] Theme toggle switches between light and dark mode
- [ ] Theme preference persists across page refreshes
- [ ] All Material components display correctly in both themes
- [ ] No visual regressions in theme colors

### Edge Cases

- [ ] First-time visitor with system dark mode preference sees dark theme
- [ ] First-time visitor with system light mode preference sees light theme
- [ ] User preference overrides system preference after toggle
- [ ] Theme transitions smoothly without flash of wrong theme on page load
- [ ] Theme toggle works correctly after multiple rapid clicks
- [ ] Theme persists after browser close and reopen (localStorage)
- [ ] Clearing localStorage reverts to system preference
- [ ] All text has sufficient contrast ratio in both themes (WCAG AA)

Run `pnpm nx run dms-material-e2e:e2e` to verify all e2e tests pass.

## Notes

- Material 3 (M3) theming system is used for modern styling
- CSS custom properties enable easy color overrides
- Theme service uses signals for reactivity
- localStorage stores user preference
- System preference detected via `prefers-color-scheme` media query
