# Story 40.4: E2E Tests Verifying Network Traffic for Lazy Loading

Status: Approved

## Story

As a developer,
I want Playwright e2e tests that verify lazy loading by inspecting network requests as the user scrolls,
so that there is a regression guard confirming only visible data is fetched.

## Acceptance Criteria

1. **Given** the Universe Screen opened with ≥ 100 rows in the database, **When** the page loads, **Then** the e2e test asserts (via Playwright `page.waitForRequest` / response interception) that the initial API request fetches ≤ 50 rows (or the configured page size), NOT all rows.
2. **Given** the investor scrolls to the bottom of the Universe table, **When** new rows scroll into view, **Then** the e2e test asserts a subsequent API request is made with the next page/range offset.
3. **Given** the same network-traffic assertions applied to one Account table (e.g. Open Positions), **When** the table loads, **Then** the test asserts similarly bounded initial fetch size.
4. **Given** all e2e tests, **When** `pnpm e2e` runs, **Then** all lazy-loading network tests pass.

## Definition of Done

- [ ] Playwright e2e tests using request interception for Universe Screen lazy loading
- [ ] Playwright e2e tests for at least one Account table
- [ ] Tests assert fetch size ≤ configured page/buffer size (not all rows)
- [ ] `pnpm e2e` passes
- [ ] `pnpm all` passes

## Tasks / Subtasks

- [ ] Write a Playwright test using `page.route()` or `page.waitForRequest()` to intercept the Universe table data requests on page load (AC: #1)
  - [ ] Assert the initial request specifies a `start`/`end` range or `pageSize` ≤ 50
  - [ ] Assert NOT all rows are requested (check the `end` parameter or response row count)
- [ ] Write a Playwright test that scrolls to the bottom of the Universe table and asserts a subsequent request is made with a higher `start` offset (AC: #2)
- [ ] Write a Playwright test for the Open Positions table using the same network interception approach (AC: #3)
- [ ] Ensure test data has ≥ 100 rows in the database for the Universe table (use fixtures/seed) (AC: #1)
- [ ] Run `pnpm e2e` and confirm all lazy-loading tests pass (AC: #4)
- [ ] Run `pnpm all` and fix any failures

## Dev Notes

### Key Files

- `apps/dms-material-e2e/` — Playwright test suite
- Universe Screen API endpoint — identified in Story 40.1; the intercepted URL pattern
- `page.route()` Playwright docs — for intercepting and inspecting requests

### Approach

Use `page.route('**/api/universe**', route => { /* capture request */ route.continue(); })` to capture all requests to the Universe API. On page load, capture the first request and assert `start === 0` and `end <= 50`. For the scroll test, use `page.evaluate(() => document.querySelector('cdk-virtual-scroll-viewport').scrollTop = 9999)` and wait for the next intercepted request. Assert the new request has a higher `start` value.

## Dev Agent Record

### Agent Model Used

### Completion Notes

## File List
