# RMS to RMS-Material Migration Plan

## Executive Summary

This document outlines the complete plan to migrate the RMS frontend application from PrimeNG to Angular Material, creating a new application `rms-material` on port 4201.

### Primary Driver

PrimeNG's virtual scrolling with lazy data fetching in tables does not meet requirements. Angular Material CDK's virtual scrolling provides better control and performance.

### Scope

- **Full feature parity** with existing RMS application
- **New application**: `apps/rms-material` (port 4201)
- **Duplicated code**: All services, state management, and utilities copied
- **Custom theme**: Match current styling with light/dark mode support
- **Target**: Eventually deprecate and remove `apps/rms`

---

## Current Application Analysis

### Technology Stack (Current)

| Layer            | Technology                             |
| ---------------- | -------------------------------------- |
| Framework        | Angular 20.1.8                         |
| UI Library       | PrimeNG 20.0.0                         |
| State Management | SmartNgRX Signals 2.1.4                |
| Styling          | TailwindCSS 3.4.1 + PrimeNG Aura theme |
| Charts           | Chart.js 4.5.0                         |
| Auth             | AWS Amplify 6.x                        |
| Change Detection | Zoneless                               |

### Component Inventory (40 Components)

#### Authentication (4 components)

| Component                 | PrimeNG Usage                               | Material Replacement                                                          |
| ------------------------- | ------------------------------------------- | ----------------------------------------------------------------------------- |
| `login.ts`                | p-password, p-button, p-message, pInputText | mat-form-field, matInput, mat-icon (visibility toggle), mat-button, mat-error |
| `profile.ts`              | Container only                              | Container only                                                                |
| `password-change-card.ts` | p-password, p-button, p-card, p-message     | mat-card, mat-form-field, mat-icon, mat-button, mat-error                     |
| `email-change-card.ts`    | pInputText, p-button, p-card, p-message     | mat-card, mat-form-field, matInput, mat-button, mat-error                     |

#### Shell & Navigation (3 components)

| Component             | PrimeNG Usage                                             | Material Replacement                                                      |
| --------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------- |
| `shell.component.ts`  | p-toolbar, p-splitter, p-confirmDialog, p-toast, p-button | mat-toolbar, custom splitter (CDK), mat-dialog, mat-snack-bar, mat-button |
| `session-warning.ts`  | p-dialog, p-button                                        | mat-dialog, mat-button                                                    |
| `accounts/account.ts` | p-listbox, p-button, p-toolbar                            | mat-selection-list, mat-button, mat-toolbar                               |

#### Global Features (5 components)

| Component                        | PrimeNG Usage                                                                                | Material Replacement                                                                                                    |
| -------------------------------- | -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `global-universe.component.ts`   | p-table (editable), p-toolbar, p-button, p-inputNumber, p-datepicker, p-select, p-cellEditor | mat-table + CDK virtual scroll, mat-toolbar, mat-button, mat-form-field, mat-datepicker, mat-select, custom cell editor |
| `screener.ts`                    | p-table, p-toolbar, p-select, p-button                                                       | mat-table + CDK virtual scroll, mat-toolbar, mat-select, mat-button                                                     |
| `global-summary.component.ts`    | p-chart, p-select                                                                            | ng2-charts (Chart.js wrapper), mat-select                                                                               |
| `global-error-logs.component.ts` | p-table, p-toolbar, p-paginator, p-button, p-select                                          | mat-table, mat-paginator, mat-toolbar, mat-button, mat-select                                                           |
| `global.component.ts`            | Container only                                                                               | Container only                                                                                                          |

#### Account Panel (8 components)

| Component                     | PrimeNG Usage                                                            | Material Replacement                                                            |
| ----------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| `account-panel.component.ts`  | Container with tabs                                                      | mat-tab-group                                                                   |
| `account-detail.component.ts` | Container                                                                | Container                                                                       |
| `summary.component.ts`        | p-chart, p-select                                                        | ng2-charts, mat-select                                                          |
| `open-positions.component.ts` | p-table (editable), p-toolbar, p-cellEditor, p-inputNumber, p-datepicker | mat-table + CDK virtual scroll, mat-toolbar, custom cell editor, mat-form-field |
| `sold-positions.component.ts` | p-table (editable), p-toolbar, p-cellEditor, p-inputNumber, p-datepicker | mat-table + CDK virtual scroll, mat-toolbar, custom cell editor, mat-form-field |
| `dividend-deposits.ts`        | p-table (virtual scroll, lazy), p-toolbar, p-button                      | mat-table + CDK virtual scroll (lazy loading), mat-toolbar, mat-button          |
| `div-dep-modal.component.ts`  | p-dialog, p-select, p-inputNumber, p-datepicker, p-button                | mat-dialog, mat-select, mat-form-field, mat-datepicker, mat-button              |
| `new-position.component.ts`   | Form inputs                                                              | mat-form-field components                                                       |

#### Shared Components (7 components)

| Component                           | PrimeNG Usage               | Material Replacement                   |
| ----------------------------------- | --------------------------- | -------------------------------------- |
| `base-positions-table.component.ts` | p-table base                | mat-table base                         |
| `editable-cell.component.ts`        | p-cellEditor, p-inputNumber | Custom inline edit with mat-form-field |
| `editable-date-cell.component.ts`   | p-cellEditor, p-datepicker  | Custom inline edit with mat-datepicker |
| `symbol-autocomplete.component.ts`  | p-autoComplete              | mat-autocomplete                       |
| `symbol-filter-header.component.ts` | p-select                    | mat-select                             |
| `summary-display.component.ts`      | p-chart                     | ng2-charts                             |
| Various toolbar components          | p-toolbar, p-button         | mat-toolbar, mat-button                |

#### Universe Settings (2 components)

| Component              | PrimeNG Usage                                           | Material Replacement                                            |
| ---------------------- | ------------------------------------------------------- | --------------------------------------------------------------- |
| `universe-settings.ts` | Container                                               | Container                                                       |
| `add-symbol-dialog.ts` | p-dialog, p-autoComplete, p-select, p-message, p-button | mat-dialog, mat-autocomplete, mat-select, mat-error, mat-button |

### PrimeNG to Angular Material Component Mapping

| PrimeNG Component | Angular Material Equivalent                          | Notes                              |
| ----------------- | ---------------------------------------------------- | ---------------------------------- |
| `p-table`         | `mat-table` + `cdk-virtual-scroll-viewport`          | CDK provides superior lazy loading |
| `p-button`        | `mat-button`, `mat-raised-button`, `mat-icon-button` | Multiple variants available        |
| `p-dialog`        | `MatDialog` service                                  | Programmatic dialog handling       |
| `p-inputNumber`   | `mat-form-field` + `matInput` + custom directive     | Need custom number formatting      |
| `p-datepicker`    | `mat-datepicker`                                     | Similar API                        |
| `p-select`        | `mat-select`                                         | Similar API                        |
| `p-password`      | `mat-form-field` + `matInput` + visibility toggle    | Custom visibility toggle           |
| `p-autoComplete`  | `mat-autocomplete`                                   | Similar API                        |
| `p-toolbar`       | `mat-toolbar`                                        | Direct replacement                 |
| `p-toast`         | `MatSnackBar`                                        | Different paradigm (imperative)    |
| `p-confirmDialog` | `MatDialog` with confirm component                   | Custom confirm dialog              |
| `p-message`       | `mat-error` or custom message component              | Context-dependent                  |
| `p-chart`         | `ng2-charts` (Chart.js wrapper)                      | Uses same Chart.js                 |
| `p-paginator`     | `mat-paginator`                                      | Direct replacement                 |
| `p-listbox`       | `mat-selection-list`                                 | Similar functionality              |
| `p-card`          | `mat-card`                                           | Direct replacement                 |
| `p-splitter`      | Custom component using CDK Drag/Drop                 | No direct equivalent               |
| `p-cellEditor`    | Custom inline edit component                         | No direct equivalent               |
| `p-checkbox`      | `mat-checkbox`                                       | Direct replacement                 |
| `p-tag`           | `mat-chip`                                           | Similar functionality              |
| `pInputText`      | `matInput` directive                                 | Direct replacement                 |
| `pTooltip`        | `matTooltip`                                         | Direct replacement                 |

---

## Implementation Plan

### Phase 0: Project Setup (Stories 0.1 - 0.5)

#### Story 0.1: Generate New Application

```bash
nx g @nx/angular:application rms-material --directory=apps/rms-material --style=scss --routing=true --prefix=rms
```

**Tasks:**

- Generate new Angular application
- Configure port 4201 in project.json
- Set up proxy configuration for API
- Configure zoneless change detection
- Verify application builds and serves

#### Story 0.2: Install Angular Material

```bash
pnpm add @angular/material @angular/cdk
```

**Tasks:**

- Add Angular Material and CDK dependencies
- Add `ng2-charts` for Chart.js integration (already using chart.js)
- Configure material imports

#### Story 0.3: Create Custom Theme

**Tasks:**

- Create Material 3 custom theme matching current Aura styling
- Implement light/dark mode toggle using `.dark-theme` class
- Set up CSS custom properties for theme variables
- Create `styles.scss` with proper layer ordering for TailwindCSS

**Files to create:**

- `apps/rms-material/src/styles.scss`
- `apps/rms-material/src/themes/_light-theme.scss`
- `apps/rms-material/src/themes/_dark-theme.scss`
- `apps/rms-material/src/themes/_theme-variables.scss`

#### Story 0.4: Copy Core Infrastructure

**Tasks:**

- Copy `environments/` folder
- Copy `amplify.config.ts`
- Copy all files from `store/` (SmartNgRX state management)
- Copy `error-handler/` service
- Copy all shared services
- Update imports as needed

#### Story 0.5: Set Up App Configuration

**Tasks:**

- Create `app.config.ts` with Angular Material providers
- Replace `providePrimeNG()` with Material animations
- Keep SmartNgRX providers
- Keep auth interceptors and guards

---

### Phase 1: Core Layout & Authentication (Stories 1.1 - 1.5)

#### Story 1.1: Shell Component

**Migrate:** `shell/shell.component.ts`

**Tasks:**

- Replace `p-toolbar` with `mat-toolbar`
- Create custom splitter component using CDK
- Replace `p-toast` with `MatSnackBar` service
- Replace `p-confirmDialog` with custom confirm dialog
- Implement theme toggle (light/dark)
- Copy and adapt SCSS styles

**New components needed:**

- `shared/splitter/splitter.component.ts` - Custom splitter
- `shared/confirm-dialog/confirm-dialog.component.ts` - Confirmation dialog

#### Story 1.2: Login Component

**Migrate:** `auth/login/login.ts`

**Tasks:**

- Replace `p-password` with `mat-form-field` + visibility toggle
- Replace `pInputText` with `matInput`
- Replace `p-button` with `mat-button`
- Replace `p-message` with `mat-error`
- Maintain all auth logic unchanged

#### Story 1.3: Profile Components

**Migrate:** `auth/profile/` folder

**Tasks:**

- Migrate `profile.ts` container
- Migrate `password-change-card.ts`
- Migrate `email-change-card.ts`
- Replace `p-card` with `mat-card`
- Replace form inputs with Material equivalents

#### Story 1.4: Session Warning Dialog

**Migrate:** `auth/components/session-warning/`

**Tasks:**

- Convert to Material dialog
- Use `MatDialog` service for programmatic opening

#### Story 1.5: Account List Component

**Migrate:** `accounts/account.ts`

**Tasks:**

- Replace `p-listbox` with `mat-selection-list`
- Replace `p-toolbar` with `mat-toolbar`
- Replace `p-button` with `mat-button`

---

### Phase 2: Shared Components (Stories 2.1 - 2.8)

#### Story 2.1: Base Table Component with Virtual Scrolling

**Create:** `shared/base-table/base-table.component.ts`

**Tasks:**

- Create base table using `mat-table` + `cdk-virtual-scroll-viewport`
- Implement lazy loading data source
- Support sorting, filtering
- Create table configuration interface

**Key feature:** This addresses the primary driver - proper virtual scrolling with lazy loading.

#### Story 2.2: Editable Cell Component

**Migrate:** `shared/editable-cell.component.ts`

**Tasks:**

- Create custom inline edit component
- Support number input with formatting
- Support blur/enter key to save
- Support escape to cancel

#### Story 2.3: Editable Date Cell Component

**Migrate:** `shared/editable-date-cell.component.ts`

**Tasks:**

- Create custom inline date edit
- Integrate `mat-datepicker`
- Support same interaction patterns

#### Story 2.4: Symbol Autocomplete Component

**Migrate:** `shared/symbol-autocomplete.component.ts`

**Tasks:**

- Replace `p-autoComplete` with `mat-autocomplete`
- Maintain dropdown, force selection, min length options

#### Story 2.5: Symbol Filter Header Component

**Migrate:** `shared/symbol-filter-header.component.ts`

**Tasks:**

- Replace `p-select` with `mat-select`

#### Story 2.6: Summary Display Component (Charts)

**Migrate:** `shared/summary-display.component.ts`

**Tasks:**

- Replace `p-chart` with `ng2-charts`
- Chart.js data format remains the same
- Update chart options for Material styling

#### Story 2.7: Toast/Notification Service

**Create:** `shared/services/notification.service.ts`

**Tasks:**

- Wrap `MatSnackBar` with convenient API
- Support different severity levels
- Match existing toast behavior

#### Story 2.8: Confirm Dialog Service

**Create:** `shared/services/confirm-dialog.service.ts`

**Tasks:**

- Create reusable confirm dialog component
- Wrap `MatDialog` with convenient API
- Support customizable messages and buttons

---

### Phase 3: Global Features (Stories 3.1 - 3.4)

#### Story 3.1: Global Universe Component (Complex)

**Migrate:** `global/global-universe/global-universe.component.ts`

**Tasks:**

- Use base table component
- Implement editable cells for all editable columns
- Implement row selection
- Add toolbar with actions
- Support filtering and sorting
- **Critical:** Implement virtual scrolling with lazy loading

**Complexity:** HIGH - This is the most complex table with inline editing.

#### Story 3.2: Screener Component

**Migrate:** `global/screener/screener.ts`

**Tasks:**

- Use base table component
- Implement column filtering with `mat-select`
- Add toolbar actions

#### Story 3.3: Global Summary Component

**Migrate:** `global/global-summary/global-summary.component.ts`

**Tasks:**

- Migrate charts using `ng2-charts`
- Replace `p-select` with `mat-select` for filtering

#### Story 3.4: Global Error Logs Component

**Migrate:** `global/global-error-logs/global-error-logs.component.ts`

**Tasks:**

- Use base table component
- Replace `p-paginator` with `mat-paginator`
- Implement filtering with `mat-select`

---

### Phase 4: Account Panel Features (Stories 4.1 - 4.6)

#### Story 4.1: Account Panel Container

**Migrate:** `account-panel/account-panel.component.ts`

**Tasks:**

- Set up container with routing
- Implement navigation tabs using `mat-tab-nav-bar`

#### Story 4.2: Account Detail Container

**Migrate:** `account-panel/account-detail.component.ts`

**Tasks:**

- Migrate container component
- Set up child routing

#### Story 4.3: Account Summary Component

**Migrate:** `account-panel/summary/summary.component.ts`

**Tasks:**

- Migrate charts using `ng2-charts`
- Replace `p-select` with `mat-select`

#### Story 4.4: Open Positions Component (Complex)

**Migrate:** `account-panel/open-positions/open-positions.component.ts`

**Tasks:**

- Use base table component
- Implement all editable cells
- Add toolbar actions
- Support position editing workflow

**Complexity:** HIGH

#### Story 4.5: Sold Positions Component (Complex)

**Migrate:** `account-panel/sold-positions/sold-positions.component.ts`

**Tasks:**

- Use base table component
- Implement all editable cells
- Add toolbar actions

**Complexity:** HIGH

#### Story 4.6: Dividend Deposits Component (Critical)

**Migrate:** `account-panel/dividend-deposits/dividend-deposits.ts`

**Tasks:**

- Use base table component with virtual scrolling
- **Critical:** Implement lazy loading with CDK virtual scroll
- This is the PRIMARY USE CASE for migration

**Complexity:** HIGH - Primary driver for migration

#### Story 4.7: Dividend Deposit Modal

**Migrate:** `account-panel/div-dep-modal/div-dep-modal.component.ts`

**Tasks:**

- Convert to `MatDialog`
- Replace form inputs with Material equivalents

---

### Phase 5: Universe Settings (Stories 5.1 - 5.2)

#### Story 5.1: Universe Settings Container

**Migrate:** `universe-settings/universe-settings.ts`

**Tasks:**

- Migrate container component

#### Story 5.2: Add Symbol Dialog

**Migrate:** `universe-settings/add-symbol-dialog/`

**Tasks:**

- Convert to `MatDialog`
- Replace `p-autoComplete` with `mat-autocomplete`
- Replace `p-select` with `mat-select`
- Replace `p-message` with `mat-error`

---

### Phase 6: Testing & Polish (Stories 6.1 - 6.4)

#### Story 6.1: Unit Test Migration

**Tasks:**

- Update all component tests for Material components
- Mock Material dialogs and snackbars
- Ensure all existing tests pass

#### Story 6.2: E2E Test Updates

**Tasks:**

- Update selectors for Material components
- Verify all user flows work correctly

#### Story 6.3: Accessibility Audit

**Tasks:**

- Verify ARIA attributes are correct
- Test keyboard navigation
- Verify screen reader compatibility

#### Story 6.4: Performance Validation

**Tasks:**

- Benchmark virtual scrolling performance
- Verify lazy loading works correctly
- Compare bundle sizes
- Optimize as needed

---

## File Structure

```
apps/rms-material/
├── src/
│   ├── main.ts
│   ├── styles.scss
│   ├── themes/
│   │   ├── _light-theme.scss
│   │   ├── _dark-theme.scss
│   │   └── _theme-variables.scss
│   ├── environments/
│   │   ├── environment.ts
│   │   └── environment.prod.ts
│   ├── app/
│   │   ├── app.component.ts
│   │   ├── app.config.ts
│   │   ├── app.routes.ts
│   │   ├── amplify.config.ts
│   │   ├── auth/
│   │   │   ├── auth.service.ts
│   │   │   ├── mock-auth.service.ts
│   │   │   ├── guards/
│   │   │   ├── interceptors/
│   │   │   ├── services/
│   │   │   ├── login/
│   │   │   ├── profile/
│   │   │   └── components/
│   │   ├── shell/
│   │   ├── accounts/
│   │   ├── account-panel/
│   │   ├── global/
│   │   ├── universe-settings/
│   │   ├── shared/
│   │   │   ├── components/
│   │   │   │   ├── base-table/
│   │   │   │   ├── editable-cell/
│   │   │   │   ├── editable-date-cell/
│   │   │   │   ├── splitter/
│   │   │   │   ├── confirm-dialog/
│   │   │   │   └── ...
│   │   │   └── services/
│   │   │       ├── notification.service.ts
│   │   │       ├── confirm-dialog.service.ts
│   │   │       └── ...
│   │   ├── store/
│   │   │   ├── accounts/
│   │   │   ├── div-deposits/
│   │   │   ├── div-deposit-types/
│   │   │   ├── risk-group/
│   │   │   ├── screen/
│   │   │   ├── top/
│   │   │   ├── trades/
│   │   │   └── universe/
│   │   └── error-handler/
│   └── public/
├── project.json
├── tsconfig.app.json
├── tsconfig.json
├── tsconfig.spec.json
└── proxy.conf.json
```

---

## Dependencies to Add

```json
{
  "dependencies": {
    "@angular/material": "^20.0.0",
    "@angular/cdk": "^20.0.0",
    "ng2-charts": "^7.0.0"
  }
}
```

**Note:** `chart.js` is already installed.

---

## Estimated Effort

| Phase                       | Stories | Estimated Days |
| --------------------------- | ------- | -------------- |
| Phase 0: Setup              | 5       | 2-3            |
| Phase 1: Core Layout & Auth | 5       | 2-3            |
| Phase 2: Shared Components  | 8       | 3-4            |
| Phase 3: Global Features    | 4       | 4-5            |
| Phase 4: Account Panel      | 7       | 5-6            |
| Phase 5: Universe Settings  | 2       | 1              |
| Phase 6: Testing & Polish   | 4       | 3-4            |

**Total Estimated: 20-26 business days**

---

## Risk Assessment

### High Risk Items

1. **Virtual scrolling with lazy loading** - Primary driver; must work correctly
2. **Editable table cells** - Complex custom implementation needed
3. **Theme matching** - CSS work to match existing look

### Medium Risk Items

1. **Dialog migration** - Different paradigm (imperative vs declarative)
2. **Toast notifications** - Different API
3. **Custom splitter** - No direct equivalent

### Low Risk Items

1. **Form inputs** - Direct equivalents available
2. **Buttons/toolbars** - Direct equivalents available
3. **Charts** - Same underlying library (Chart.js)

---

## Success Criteria

1. All features from RMS work identically in RMS-Material
2. Virtual scrolling with lazy loading works in dividend deposits table
3. Light/dark theme toggle works correctly
4. All unit tests pass
5. All E2E tests pass
6. Bundle size is comparable or smaller
7. Performance is equal or better

---

## Next Steps

1. Review and approve this migration plan
2. Create Epic and Stories in tracking system
3. Begin Phase 0: Project Setup
4. Iterate through phases sequentially
