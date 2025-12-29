# Story AA.2: Install and Configure Angular Material Dependencies

## Story

**As a** developer building the dms-material application
**I want** Angular Material and CDK properly installed and configured
**So that** I can use Material components throughout the application

## Context

**Current System:**

- DMS application uses PrimeNG 20 for UI components
- Chart.js 4.5.0 already installed for charting

**New Dependencies:**

- `@angular/material` - Material Design components
- `@angular/cdk` - Component Development Kit (required by Material)
- `ng2-charts` - Angular wrapper for Chart.js (replaces p-chart)

## Acceptance Criteria

### Functional Requirements

- [ ] `@angular/material` package installed (version 20.x matching Angular version)
- [ ] `@angular/cdk` package installed (version 20.x matching Angular version)
- [ ] `ng2-charts` package installed for Chart.js integration
- [ ] Material animations module configured

### Technical Requirements

- [ ] Packages added to `package.json` dependencies:
  ```json
  {
    "@angular/material": "^20.0.0",
    "@angular/cdk": "^20.0.0",
    "ng2-charts": "^7.0.0"
  }
  ```
- [ ] `pnpm install` completes without errors
- [ ] No peer dependency conflicts
- [ ] Material typography styles available

### Configuration Requirements

- [ ] `provideAnimationsAsync()` added to app configuration
- [ ] Material icons font linked in index.html (if using icon font approach)
- [ ] CDK overlay styles available

### Validation Requirements

- [ ] Application builds with new dependencies
- [ ] No import errors for Material modules
- [ ] Basic Material component renders correctly (e.g., mat-button)

## Technical Approach

### Step 1: Install Dependencies

```bash
pnpm add @angular/material@^20.0.0 @angular/cdk@^20.0.0 ng2-charts@^7.0.0
```

### Step 2: Update index.html

Add Material Icons font to `apps/dms-material/src/index.html`:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Dividend Management System Material</title>
    <base href="/" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="icon" type="image/x-icon" href="favicon.ico" />
    <!-- Material Icons -->
    <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet" />
    <!-- Roboto Font (Material Design typography) -->
    <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500&display=swap" rel="stylesheet" />
  </head>
  <body class="mat-typography">
    <dms-root></dms-root>
  </body>
</html>
```

### Step 3: Update App Configuration

Update `apps/dms-material/src/app/app.config.ts` to include animations:

```typescript
import { ApplicationConfig, provideZonelessChangeDetection } from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter } from '@angular/router';

import { appRoutes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [provideZonelessChangeDetection(), provideAnimationsAsync(), provideRouter(appRoutes)],
};
```

### Step 4: Verify Material Component Works

Update `apps/dms-material/src/app/app.component.ts` temporarily to test:

```typescript
import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'dms-root',
  imports: [MatButtonModule],
  template: `
    <h1>DMS Material</h1>
    <button mat-raised-button color="primary">Test Button</button>
  `,
})
export class AppComponent {}
```

### Step 5: Verify Build

```bash
pnpm nx run dms-material:build
pnpm nx run dms-material:serve
```

## Files Modified

| File                                         | Changes                                    |
| -------------------------------------------- | ------------------------------------------ |
| `package.json`                               | Add Material, CDK, ng2-charts dependencies |
| `apps/dms-material/src/index.html`           | Add Material Icons and Roboto font links   |
| `apps/dms-material/src/app/app.config.ts`    | Add provideAnimationsAsync                 |
| `apps/dms-material/src/app/app.component.ts` | Test Material button (temporary)           |

## Package Versions

| Package             | Version | Purpose                      |
| ------------------- | ------- | ---------------------------- |
| `@angular/material` | ^20.0.0 | Material Design components   |
| `@angular/cdk`      | ^20.0.0 | Component Development Kit    |
| `ng2-charts`        | ^7.0.0  | Chart.js wrapper for Angular |

## Definition of Done

- [ ] All packages installed without errors
- [ ] No peer dependency warnings
- [ ] Animations provider configured
- [ ] Material Icons font linked
- [ ] Test button renders with Material styling
- [ ] Application builds successfully
- [ ] Application serves successfully

## Notes

- Version 20.x of Angular Material matches Angular 20 used in the project
- `ng2-charts` wraps the existing Chart.js library already in use
- The temporary test button will be removed in subsequent stories
- Consider using `mat-icon` component instead of icon font for better tree-shaking in production
