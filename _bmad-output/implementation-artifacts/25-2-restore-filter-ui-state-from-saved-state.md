# Story 25.2: Restore Filter UI State from Saved State

Status: Approved

## Story

As a user,
I want filter inputs on the Universe and Screener tables to be pre-populated with my previously saved filter values when the screen loads,
so that I don't have to re-enter filter criteria after navigating away and back.

## Acceptance Criteria

1. **Given** a saved `TableState` with `filters: { ticker: 'AAPL', sector: 'Tech' }`, **When** the Universe screen initializes, **Then** the filter input fields are pre-populated with `'AAPL'` and `'Tech'` respectively.
2. **Given** populated filter inputs on init, **When** the user views the table, **Then** the table data is already filtered to match those values (no additional user action required).
3. **Given** no saved filter state, **When** the screen initializes, **Then** all filter inputs are empty and no filtering is applied.
4. **Given** a saved filter for a column that no longer exists in the current schema, **When** the screen initializes, **Then** the unknown filter key is silently ignored (no error thrown).
5. **Given** the restore logic, **When** Playwright E2E tests run, **Then** a test verifies: apply filter "XYZ", navigate away, navigate back → filter input shows "XYZ" and data is filtered.

## Definition of Done

- [ ] Filter inputs pre-populated from saved `TableState.filters` on Universe screen init
- [ ] Same behavior applied to Screener screen (if it uses the same filter mechanism)
- [ ] Stale/unknown filter keys silently dropped
- [ ] Unit tests cover: full filters, empty filters, unknown key scenario
- [ ] Playwright E2E test verifies round-trip filter persistence
- [ ] Run `pnpm all`
- [ ] Run `pnpm e2e:dms-material:chromium`
- [ ] Run `pnpm e2e:dms-material:firefox`
- [ ] Run `pnpm format`
- [ ] Repeat all of these if any fail until they all pass

## Tasks / Subtasks

- [ ] Locate filter state read/write paths (AC: #1)
  - [ ] Open `apps/dms-material/src/app/shared/services/sort-filter-state.service.ts`
  - [ ] Trace where `filters` from `TableState` is currently consumed (if at all) on component init
  - [ ] Identify the filter input signals/bindings in `global-universe.component.ts` and `global-screener.component.ts`
- [ ] Implement filter restore on init (AC: #1, #2)
  - [ ] In each screen component's constructor or `ngOnInit` effect, read `TableState.filters`
  - [ ] For each known filter key, set the corresponding component signal/control value
  - [ ] Trigger a data reload with the restored filter values applied
- [ ] Handle missing and unknown keys (AC: #3, #4)
  - [ ] Guard with `if (!filters || Object.keys(filters).length === 0)` for the no-filter case
  - [ ] For each filter key, check against a known-columns allowlist before applying
- [ ] Write unit tests (AC: Verify branches)
  - [ ] Full `filters` object → all inputs populated
  - [ ] Empty `filters` object → no-op
  - [ ] Unknown key in `filters` → silently skipped
- [ ] Write Playwright E2E test (AC: #5)
  - [ ] Apply filter on Universe screen, navigate to another route, navigate back
  - [ ] Assert filter input still shows the applied value
  - [ ] Assert table displays filtered rows

## Dev Notes

### Key Files

- `apps/dms-material/src/app/global/global-universe/global-universe.component.ts` — target component
- `apps/dms-material/src/app/global/global-screener/global-screener.component.ts` — also targeted if it uses same filter mechanism
- `apps/dms-material/src/app/shared/services/sort-filter-state.service.ts` — state source
- `apps/dms-material/src/app/shared/services/table-state.interface.ts` — `FilterConfig` definition
- `apps/dms-material-e2e/` — Playwright test directory

### FilterConfig Interface (reference)

```typescript
// Likely shape (verify in actual file):
export interface FilterConfig {
  [column: string]: string | string[];
}
```

### Angular Patterns

- Use `inject()` to inject services; no constructor injection
- Use `effect(() => { ... })` or `afterNextRender()` for one-time init side effects that depend on signals
- All filter inputs should be driven by `signal<string>()` or equivalent reactive primitive

### Dependencies

- Depends on Story 24.1 (normalized `TableState` model with migration utility)
- Does NOT depend on Stories 24.2 or 24.3 (filter is independent of sort)

### References

[Source: apps/dms-material/src/app/shared/services/sort-filter-state.service.ts]
[Source: apps/dms-material/src/app/shared/services/table-state.interface.ts]
[Source: apps/dms-material/src/app/global/global-universe/global-universe.component.ts]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
