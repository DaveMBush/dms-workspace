# Story 52.1: Apply `panelWidth=""` to Accounts Filter Dropdown and Verify with Playwright

Status: Approved

## Story

As a trader,
I want the Accounts filter dropdown panel on the Universe screen to be wide enough to display every account name on a single line,
so that I can identify and select the correct account without text wrapping.

## Acceptance Criteria

1. **Given** the Account selector `mat-select` in the toolbar of `global-universe.component.html` does not yet have `panelWidth=""`, **When** the developer adds `panelWidth=""` to that `mat-select`, **Then** the attribute is present in the source file.
2. **Given** the updated template is served, **When** the Playwright MCP server opens the Universe screen and clicks the Accounts filter trigger, **Then** the open dropdown panel is wide enough for all account names to appear on a single line with no text wrapping.
3. **Given** the dropdown panel is open, **When** the Playwright MCP server measures the width of the panel overlay, **Then** the panel width equals or exceeds the width of the widest account name option.
4. **Given** the Accounts filter is in its collapsed (closed) state, **When** the Universe screen is rendered, **Then** the trigger field width remains constrained to its current size (unchanged).
5. **Given** all changes are applied, **When** `pnpm all` runs, **Then** all unit tests pass with no regressions.

## Tasks / Subtasks

- [ ] Add `panelWidth=""` to the Account selector `mat-select` in the toolbar (AC: #1)
  - [ ] Open `apps/dms-material/src/app/global/global-universe/global-universe.component.html`
  - [ ] Locate the `mat-form-field` with `class="account-select"` in the `mat-toolbar` (lines ~7–17)
  - [ ] Add `panelWidth=""` as the first attribute on the `mat-select` element (line ~9)
  - [ ] Save the file
- [ ] Use Playwright MCP server to verify the fix (AC: #2, #3, #4)
  - [ ] Navigate to `/global/universe`
  - [ ] Click the Account selector trigger to open the dropdown
  - [ ] Confirm all account name options appear on a single line with no wrapping
  - [ ] Measure the panel overlay width and confirm it equals or exceeds the widest account name
  - [ ] Close the dropdown and confirm the trigger field is still the same width as before
- [ ] Run `pnpm all` and confirm no regressions (AC: #5)

## Dev Notes

### Key Files

- **Template to change:** `apps/dms-material/src/app/global/global-universe/global-universe.component.html`
  — The Account selector `mat-form-field` is in the `mat-toolbar` at approximately lines 7–17.
  The `mat-select` (approximately line 9) currently has **no `panelWidth` attribute at all**.
- **Existing E2E tests (do NOT modify in this story):** `apps/dms-material-e2e/src/global-universe.spec.ts`
- **Column filter width E2E tests:** `apps/dms-material-e2e/src/universe-column-filter-width.spec.ts`
  — verifies filter inputs stay within column bounds; should not be affected by this change.

> **Note:** The epic description references a "`@case` block for the Accounts filter", but
> inspection of the current source file shows the account selector lives directly in the
> `mat-toolbar` (not inside an `@switch`/`@case` block). There is no `@case ('account')` or
> `@case ('portfolio')` block in this file. The fix target is the `mat-form-field.account-select`
> in the toolbar.

### The Fix

Add one attribute to the `mat-select` inside `mat-form-field.account-select`. **Before:**

```html
<mat-form-field appearance="outline" class="account-select">
  <mat-label>Account</mat-label>
  <mat-select
    [value]="selectedAccountId$()"
    (selectionChange)="onAccountChange($event.value)"
  >
    @for (option of accountOptions$(); track option.value) {
    <mat-option [value]="option.value">{{ option.label }}</mat-option>
    }
  </mat-select>
</mat-form-field>
```

**After:**

```html
<mat-form-field appearance="outline" class="account-select">
  <mat-label>Account</mat-label>
  <mat-select
    panelWidth=""
    [value]="selectedAccountId$()"
    (selectionChange)="onAccountChange($event.value)"
  >
    @for (option of accountOptions$(); track option.value) {
    <mat-option [value]="option.value">{{ option.label }}</mat-option>
    }
  </mat-select>
</mat-form-field>
```

Only the `panelWidth=""` attribute is added — everything else is identical.

### Context

- **Why `panelWidth=""`?**
  Angular Material's `panelWidth` input on `mat-select`:
  - `panelWidth="auto"` — sizes the overlay panel to **match the trigger width**, which means it
    inherits any CSS width constraint on the trigger element.
  - `panelWidth=""` (empty string) — **removes** the width constraint on the overlay panel
    entirely, allowing the CDK overlay to grow to the natural width of the widest `mat-option`
    label. The trigger element width is **not** affected.
  - No attribute at all (current state) — Angular Material uses a default that may mirror
    trigger width depending on version; `panelWidth=""` is the explicit fix.
- **Pure HTML template change** — no TypeScript changes needed.
- **No new components, services, directives, or imports** are required.
- **Angular Material version:** 21.2.x — `panelWidth` is a stable `@Input` on `mat-select`.
- **Zoneless Angular 21** — `inject()`, `OnPush`, signal-first patterns. This change has no
  impact on change detection.
- **Similar fix:** See Story 51.1 (`51-1-fix-riskgroup-panelwidth-empty-string.md`) for the
  identical fix applied to the `@case ('risk_group')` column filter dropdown in the same template.

### Key Commands

```bash
# Run all unit tests
pnpm all

# Start dev server for Playwright verification
pnpm start:server
# Then open http://localhost:4200/global/universe
```

### References

- Story 51.1: `_bmad-output/implementation-artifacts/51-1-fix-riskgroup-panelwidth-empty-string.md`
- Angular Material `mat-select` docs: `panelWidth` input — stable in Angular Material 17+
- Template file: `apps/dms-material/src/app/global/global-universe/global-universe.component.html`

## Dev Agent Record

### Agent Model Used
Claude Sonnet 4.6 (GitHub Copilot)

### Debug Log References
None

### Completion Notes List
- Story file created from epic spec and direct inspection of `global-universe.component.html`
- Confirmed: the Account selector is in the `mat-toolbar` (lines 7–17), **not** in a `@case` block
- Confirmed: the current `mat-select` has no `panelWidth` attribute (unlike `risk_group` which had `panelWidth="auto"`)
- The fix is a single attribute addition: `panelWidth=""` on the `mat-select`

### File List
- `apps/dms-material/src/app/global/global-universe/global-universe.component.html` (modify)
