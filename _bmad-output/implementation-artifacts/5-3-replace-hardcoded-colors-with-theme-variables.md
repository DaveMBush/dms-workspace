# Story 5.3: Replace Hardcoded Colors with Theme Variables

Status: ready-for-dev

## Story

As a developer,
I want all hardcoded color values replaced with `--dms-*` CSS variables or Angular Material theme tokens,
so that the app theme switch (light ↔ dark) correctly recolors every element.

## Acceptance Criteria

1. **Given** all hardcoded `color:`, `background:`, `border-color:` declarations in component stylesheets,
   **When** I replace each with the appropriate `--dms-*` variable or Tailwind theme class,
   **Then** no element displays an incorrect color in dark mode.

2. **And** the full dark-mode visual inspection (Playwright screenshot) shows no white-on-white or black-on-black text issues.

## Tasks / Subtasks

- [ ] Identify all hardcoded color values (AC: 1)
  - [ ] Scan all component `.scss` files for `color:`, `background:`, `background-color:`, `border-color:` with hardcoded hex/RGB/named values
  - [ ] Also scan inline `styles:` arrays in `@Component` decorators
  - [ ] Cross-reference with audit document from Story 5.1 (entries with type `color`)
- [ ] Map each hardcoded color to theme variable (AC: 1)
  - [ ] Use `--dms-*` custom properties defined in `_theme-variables.scss`
  - [ ] For Material component overrides, use Angular Material theme mixins (not `::ng-deep`)
  - [ ] Document the mapping for each replacement
- [ ] Apply replacements (AC: 1)
  - [ ] Replace each hardcoded color with `var(--dms-*)` or Material token
  - [ ] One component per commit: `style(theme): replace hardcoded colors in {ComponentName}`
- [ ] Visual verification (AC: 2)
  - [ ] Run dev server and inspect every modified component in both light and dark mode
  - [ ] Take screenshot of dark mode — verify no contrast issues
  - [ ] Run `pnpm all` for each component
- [ ] Run full quality checks (AC: 2)
  - [ ] `pnpm e2e:dms-material:chromium` passes
  - [ ] `pnpm e2e:dms-material:firefox` passes

## Dev Notes

### Available Theme Variables

Defined in `apps/dms-material/src/themes/_theme-variables.scss`:

- `--dms-background`, `--dms-surface`
- `--dms-text-primary`, `--dms-text-secondary`
- `--dms-border`
- `--dms-primary-{50-900}`
- `--dms-success`, `--dms-warning`, `--dms-error`, `--dms-info`

### Anti-Patterns

- **NEVER** use `::ng-deep` — use Material mixin overrides in global theme
- **NEVER** use Tailwind `bg-*`, `text-*`, `border-*` color classes on Material components — use theme variables instead
- Do not introduce new hardcoded hex or RGB values

### Angular Material Theming

- Material 3 (`mat.define-theme`) with blue primary palette, yellow tertiary
- Light/dark themes in `src/themes/_light-theme.scss` and `_dark-theme.scss`
- Override via `@include mat.all-component-themes(...)` or per-component mixins

### Previous Story Intelligence

- Story 5.1: Produced CSS audit with all color rules identified
- Story 5.2: Migrated layout/spacing — color rules were intentionally skipped

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 5, Story 5.3]
- [Source: _bmad-output/project-context.md#Styling & Theming, CSS Custom Properties]
- [Source: _bmad-output/project-context.md#Anti-Patterns]

## Dev Agent Record

### Agent Model Used

### Completion Notes List

### File List
