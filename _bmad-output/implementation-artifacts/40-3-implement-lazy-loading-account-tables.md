# Story 40.3: Implement Lazy Loading for Account Tables

Status: Approved

## Story

As Dave (the investor),
I want the Open Positions, Closed Positions, and Dividend Deposits tables to lazy-load data as I scroll,
so that accounts with many entries load quickly and don't freeze the browser.

## Acceptance Criteria

1. **Given** the Open Positions table opened for an account with many entries, **When** the initial load completes, **Then** only viewport-visible rows (± buffer) are fetched.
2. **Given** the same lazy-loading pattern applied to Closed Positions and Dividend Deposits tables, **When** initial load completes for either table, **Then** only viewport-visible rows are fetched.
3. **Given** the fix applies the same SmartSignals pattern used in Story 40.2, **When** the code is reviewed, **Then** the pattern is consistent across all four tables (no one-off solutions).
4. **Given** all changes, **When** `pnpm all` runs, **Then** all tests pass.

## Definition of Done

- [ ] Lazy loading implemented for Open Positions, Closed Positions, Dividend Deposits
- [ ] Same SmartSignals configuration pattern as Universe Screen (Story 40.2)
- [ ] Unit tests for store configuration
- [ ] `pnpm all` passes
- [ ] `pnpm format` passes

## Tasks / Subtasks

- [ ] Apply the same SmartSignals lazy-loading configuration from Story 40.2 to the Open Positions store feature (AC: #1, #3)
- [ ] Update the Open Positions server route to accept and apply `start`/`end` or `page`/`pageSize` parameters (AC: #1)
- [ ] Apply the same pattern to the Closed Positions store feature and server route (AC: #2, #3)
- [ ] Apply the same pattern to the Dividend Deposits store feature and server route (AC: #2, #3)
- [ ] Add unit tests for each Account table's store configuration (AC: #4)
- [ ] Run `pnpm all` and fix any failures (AC: #4)
- [ ] Run `pnpm format`

## Dev Notes

### Key Files

- `apps/dms-material/src/app/accounts/` — Account table store feature configurations
- `apps/server/src/app/routes/` — Account table server routes
- Story 40.2 implementation — use as the reference pattern

### Approach

This is a repetition of Story 40.2's pattern across three additional tables. Extract any shared configuration helpers from Story 40.2 before starting this story to avoid creating three near-identical configurations. The server route updates mirror the Universe Screen change — support range parameters and return only the requested subset.

## Dev Agent Record

### Agent Model Used

### Completion Notes

## File List
