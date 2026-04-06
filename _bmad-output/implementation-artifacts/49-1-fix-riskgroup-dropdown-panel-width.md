# Story 49.1: Fix Risk Group Filter Dropdown Panel Width on Universe Screen

Status: Approved

## Story

As a trader,
I want the Risk Group filter dropdown panel on the Universe screen to be wide enough to show every
option on a single line,
so that I can easily read and select the correct risk group without text wrapping.

## Acceptance Criteria

1. **Given** a Universe screen column whose Risk Group filter dropdown contains options with long names (e.g., "Tax-Free Income"), **When** the user clicks the Risk Group filter trigger to open the dropdown, **Then** all option labels are displayed on a single line with no wrapping inside the panel.
2. **Given** the Risk Group dropdown panel is open, **When** the user reads the option list, **Then** each option label is fully visible and untruncated within the dropdown panel.
3. **Given** the Risk Group filter is in its collapsed (closed) state, **When** the column is rendered, **Then** the trigger field width is still constrained to the column width (unchanged from before).
4. **Given** the fix is applied, **When** `pnpm all` runs, **Then** all unit tests pass with no regressions.

## Tasks / Subtasks

- [ ] Use Playwright MCP server to reproduce the current wrapping issue (AC: #1)
  - [ ] Navigate to Universe screen
  - [ ] Open the Risk Group filter dropdown
  - [ ] Confirm option labels wrap onto multiple lines
- [ ] Locate the `@case ('risk_group')` block in `global-universe.component.html` (AC: #1, #2, #3)
  - [ ] Identify the `mat-select` element at approximately line 123
- [ ] Add `panelWidth="auto"` to the `mat-select` element (AC: #1, #2)
  - [ ] This makes the dropdown overlay panel auto-size to the longest option width
  - [ ] The trigger (`mat-form-field`) width remains unchanged (column-constrained via `w-full`)
- [ ] Use Playwright MCP server to verify the fix (AC: #1, #2, #3)
  - [ ] Confirm all options are on a single line after the change
  - [ ] Confirm the collapsed trigger field is still column-width
- [ ] Run `pnpm all` and confirm no regressions (AC: #4)

## Dev Notes

### Key File

- **Template:** `apps/dms-material/src/app/global/global-universe/global-universe.component.html`
  — find the `@case ('risk_group')` block (approximately line 117). The `mat-select` inside
  it currently has no `panelWidth` input.

### The Fix

Add `panelWidth="auto"` to the `mat-select`:

```html
@case ('risk_group') {
<mat-form-field
  appearance="outline"
  subscriptSizing="dynamic"
  class="header-filter w-full"
>
  <mat-select
    panelWidth="auto"
    [value]="riskGroupFilter$()"
    (selectionChange)="onRiskGroupFilterChange($event.value)"
    placeholder="Select One"
  >
    <mat-option [value]="null">All</mat-option>
    @for (group of riskGroupOptions$(); track group.value) {
    <mat-option [value]="group.value">{{ group.label }}</mat-option>
    }
  </mat-select>
</mat-form-field>
}
```

`panelWidth="auto"` instructs Angular Material to size the overlay panel to fit the widest
`mat-option` content. The `mat-form-field` trigger retains `class="header-filter w-full"` which
constrains it to the column width — only the floating overlay panel gets wider.

### Context

- This is a pure HTML template change — no TypeScript changes required.
- No new components, services, or imports needed.
- Angular Material version: 21.2.x — `panelWidth` is a stable input on `mat-select`.
- The risk group names come from `riskGroupOptions$()` computed signal in the component. The
  actual names can be confirmed at runtime but typically include values like "Tax-Free Income",
  "Preferreds / Income", "Equities" etc.

### Project Conventions

- Zoneless Angular 21 — no zone-related concerns for this change.
- `OnPush` change detection — no impact from a purely template attribute change.
- Tailwind CSS utilities — `w-full` on the `mat-form-field` is correct and must not be removed.

### Key Commands

- Run all tests: `pnpm all`
- Start frontend dev server: `pnpm start:dms-material`

### References

- [Source: _bmad-output/planning-artifacts/epics-2026-04-06.md#Epic 49]
- [Source: apps/dms-material/src/app/global/global-universe/global-universe.component.html]
- [Source: _bmad-output/project-context.md]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
