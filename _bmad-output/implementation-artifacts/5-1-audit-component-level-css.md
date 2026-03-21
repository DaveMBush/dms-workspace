# Story 5.1: Audit Component-Level CSS

Status: ready-for-dev

## Story

As a developer,
I want a full list of all `.css`/`.scss` files in `dms-material` that contain non-trivial custom styles,
so that I know what needs to be migrated.

## Acceptance Criteria

1. **Given** all component stylesheets in `apps/dms-material/src`,
   **When** I review each file for styles that are expressible as Tailwind utilities or theme variables,
   **Then** every such occurrence is listed in `_bmad-output/implementation-artifacts/css-audit.md` with a proposed Tailwind replacement.

## Tasks / Subtasks

- [ ] Scan all component stylesheets (AC: 1)
  - [ ] Find all `.scss` files in `apps/dms-material/src/`
  - [ ] Also scan `styles:` arrays inside `@Component` decorators in `.ts` files (inline styles)
  - [ ] Identify non-trivial custom styles (not just empty files or Angular Material imports)
- [ ] Classify each style rule (AC: 1)
  - [ ] For each non-trivial rule, determine the type: `layout` | `spacing` | `typography` | `color` | `other`
  - [ ] For `layout` and `spacing` rules, propose Tailwind v3 class equivalents
  - [ ] For `color` rules, leave blank with note "Managed by Angular Material" — do NOT migrate colors
  - [ ] For `typography` rules, propose Tailwind equivalents where applicable
- [ ] Create audit document (AC: 1)
  - [ ] Create `_bmad-output/implementation-artifacts/css-audit.md`
  - [ ] Use the required table format (see Dev Notes)
  - [ ] Group entries by component for readability
  - [ ] Include summary counts: total rules, by type, migration effort estimate

## Dev Notes

### Architecture Constraints (ADR-002)

- CSS layer order `@layer tailwind-base, material, tailwind-utilities` is inviolable
- Color classes must NOT be migrated — they stay with Angular Material theme tokens
- Tailwind classes must use v3 names (v4 migration is Epic 6)
- `::ng-deep` is banned — flag any existing usage

### Required Audit Document Format

Per architecture Implementation Patterns § Format Patterns:

| Component                | File                            | Current Style     | Type   | Proposed Tailwind Class |
| ------------------------ | ------------------------------- | ----------------- | ------ | ----------------------- |
| `HoldingsTableComponent` | `holdings-table.component.scss` | `margin-top: 8px` | layout | `mt-2`                  |

**Type** values: `layout` | `spacing` | `typography` | `color` | `other`

### Critical: Inline Styles

Architecture document explicitly calls out: Story 5.1 must scan both `.scss` files AND `styles:` arrays inside `@Component` decorators in `.ts` files — not just standalone stylesheet files.

### Key Directories to Scan

```
apps/dms-material/src/app/auth/
apps/dms-material/src/app/dashboard/
apps/dms-material/src/app/accounts/
apps/dms-material/src/app/global/
apps/dms-material/src/app/shared/
apps/dms-material/src/app/shell/
apps/dms-material/src/app/universe-settings/
apps/dms-material/src/app/account-panel/
apps/dms-material/src/themes/
```

### Project CSS Variables

Use `--dms-*` custom properties for semantic colors (defined in `_theme-variables.scss`):

- `--dms-background`, `--dms-surface`, `--dms-text-primary`, `--dms-text-secondary`, `--dms-border`
- `--dms-primary-{50-900}`, `--dms-success`, `--dms-warning`, `--dms-error`, `--dms-info`

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 5, Story 5.1]
- [Source: _bmad-output/planning-artifacts/architecture.md#ADR-002, Format Patterns]
- [Source: _bmad-output/project-context.md#Styling & Theming]

## Dev Agent Record

### Agent Model Used

### Completion Notes List

### File List
