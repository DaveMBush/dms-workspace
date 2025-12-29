# Epic AA: DMS-Material Project Setup & Infrastructure

## Epic Goal

Establish the new `dms-material` Angular application with Angular Material, custom theming, and all foundational infrastructure required to support the migration from PrimeNG to Angular Material.

## Epic Description

**Existing System Context:**

- Current relevant functionality: DMS frontend application using PrimeNG 20 for UI components
- Technology stack: Angular 20, PrimeNG, TailwindCSS, SmartNgRX Signals, Chart.js, AWS Amplify
- Integration points: Backend API via proxy, SmartNgRX state management, authentication services
- Problem: PrimeNG's virtual scrolling with lazy data fetching in tables does not meet requirements

**Enhancement Details:**

- What's being added: New Angular application `apps/dms-material` using Angular Material instead of PrimeNG
- How it integrates: Runs on port 4201, shares same backend API, duplicates all services and state management
- Success criteria: Application scaffolded, themed to match current styling with light/dark mode, all infrastructure in place

## Stories

1. **Story AA.1:** Generate new Angular application `dms-material` with Nx
2. **Story AA.2:** Install and configure Angular Material and CDK dependencies
3. **Story AA.3:** Create custom Material theme matching current styling with light/dark mode
4. **Story AA.4:** Copy and configure core infrastructure (environments, Amplify, state management)
5. **Story AA.5:** Set up application configuration with Material providers

## Compatibility Requirements

- [x] New application runs independently on port 4201
- [x] Existing DMS application unchanged and continues to function on port 4200
- [x] Same backend API used via proxy configuration
- [x] All SmartNgRX state management patterns preserved
- [x] Authentication flow identical to existing application

## Technical Constraints

- Angular 20.x (matching existing application)
- Angular Material 20.x (compatible version)
- Zoneless change detection (matching existing application)
- TailwindCSS integration with Material components
- Must pass all lint, format, and build requirements

## Success Metrics

- Application generates and serves without errors on port 4201
- Custom theme applied with light/dark mode toggle working
- All core services and state management operational
- Proxy configuration routes API calls correctly
- Build succeeds in both development and production modes

## Dependencies

- None - this is the foundational epic

## Risk Assessment

**Risk Level:** Low

**Risks:**

1. Angular Material version compatibility with Angular 20
   - Mitigation: Use matching major version (20.x)
2. TailwindCSS layer conflicts with Material styles
   - Mitigation: Proper CSS layer ordering in styles.scss
3. Theme not matching existing styling closely enough
   - Mitigation: Iterative refinement during development

## Impact Analysis

**Files Created:**

- `apps/dms-material/` - New application directory
- `apps/dms-material/project.json` - Nx project configuration
- `apps/dms-material/src/styles.scss` - Global styles with theme
- `apps/dms-material/src/themes/` - Theme SCSS files
- `apps/dms-material/src/app/` - Application source files

**Package.json Updates:**

- `@angular/material` - Material components
- `@angular/cdk` - Component Dev Kit
- `ng2-charts` - Chart.js wrapper for Angular

## Priority

**Critical** - Must be completed before all other migration epics

## Estimated Effort

2-3 business days

## Definition of Done

- [ ] New application generated with proper Nx configuration
- [ ] Angular Material and CDK installed and configured
- [ ] Custom theme created matching current Aura theme colors
- [ ] Light/dark mode toggle functional
- [ ] All core infrastructure copied and imports updated
- [ ] Application builds and serves successfully
- [ ] Proxy configuration working for API calls
- [ ] All validation commands pass (format, lint, build)
