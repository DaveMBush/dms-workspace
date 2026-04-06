# Story 50.1: Switch fetchDividendHistory to dividendhistory.net with Browser Headers

Status: Approved

## Story

As a developer,
I want the `fetchDividendHistory` function to use dividendhistory.net instead of
dividendhistory.org and include browser-like request headers,
so that dividend data is retrievable for all securities, including VFL and ACP which are currently
returning empty results.

## Acceptance Criteria

1. **Given** the service is configured to use dividendhistory.net, **When** `fetchDividendHistory('VFL')` is called, **Then** a non-empty array of dividend rows is returned (not an empty array or null).
2. **Given** the service is configured to use dividendhistory.net, **When** `fetchDividendHistory('ACP')` is called, **Then** a non-empty array of dividend rows is returned.
3. **Given** the HTTP request to dividendhistory.net, **When** the `fetch` call is made inside `fetchAndParseHtml`, **Then** the request includes headers: `User-Agent` (a real browser UA string), `Accept` (`text/html,...`), `Accept-Language`, and `Referer`.
4. **Given** the existing 10-second rate limiting, **When** consecutive calls to `fetchDividendHistory` are made, **Then** the delay between outbound HTTP requests remains at least 10 seconds (no regression to the existing rate limit).
5. **Given** the HTML response from dividendhistory.net, **When** `extractDividendJson` parses the response, **Then** the `<script data-dividend-chart-json>` pattern successfully extracts the JSON data (verified against live dividendhistory.net responses before committing).
6. **Given** the stale "falling back to Yahoo Finance" log message in `get-consistent-distributions.function.ts`, **When** this code path is triggered, **Then** the log message no longer references "Yahoo Finance" (update to "no dividend data found for {symbol}").
7. **Given** all changes are applied, **When** `pnpm all` runs, **Then** all unit tests pass with no regressions.

## Tasks / Subtasks

- [ ] **Pre-implementation verification** (AC: #5)
  - [ ] Manually fetch `https://dividendhistory.net/payout/VFL/` in a browser
  - [ ] Inspect the HTML source for a `<script data-dividend-chart-json>` tag
  - [ ] Confirm the JSON structure matches the `DividendHistoryRow` interface (`ex_div`, `payday`, `payout`, `type`, `currency`, `pctChange`)
  - [ ] Note any differences vs dividendhistory.org that would require parsing adjustments
- [ ] Update `BASE_URL` in `dividend-history.service.ts` (AC: #1, #2, #5)
  - [ ] Change `'https://dividendhistory.org/payout'` to `'https://dividendhistory.net/payout'`
  - [ ] Update all log messages that reference `dividendhistory.org` to `dividendhistory.net`
- [ ] Add browser-like request headers to `fetchAndParseHtml` (AC: #3)
  - [ ] Add a `headers` option to the `fetch(url, { headers: { ... } })` call
  - [ ] Include at minimum:
    - `User-Agent`: a real desktop browser UA string (Chrome on Windows or macOS)
    - `Accept`: `'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'`
    - `Accept-Language`: `'en-US,en;q=0.9'`
    - `Referer`: `'https://dividendhistory.net/'`
- [ ] Verify rate limiting is unchanged (AC: #4)
  - [ ] Confirm `DIVIDEND_HISTORY_RATE_LIMIT_DELAY` is still 10 seconds (10 * 1000 ms)
  - [ ] Add a code comment explaining the delay is intentionally human-paced
- [ ] Update stale log message in `get-consistent-distributions.function.ts` (AC: #6)
  - [ ] Find: `'fetchDividendHistory returned no data for ${symbol}, falling back to Yahoo Finance'`
  - [ ] Replace with: `'fetchDividendHistory returned no data for ${symbol}'`
  - [ ] **Note:** the unit test in `get-consistent-distributions.function.spec.ts` asserts this
    exact message text — you MUST also update the test's expected string to match the new message
    (this is an exception to the "do not modify tests" rule since the test asserts a literal string
    we are changing as part of this story's scope)
- [ ] Manually verify VFL returns dividend data (AC: #1)
  - [ ] Call `fetchDividendHistory('VFL')` in a test script or integration test
  - [ ] Confirm result is a non-empty array
- [ ] Manually verify ACP returns dividend data (AC: #2)
  - [ ] Call `fetchDividendHistory('ACP')` in a test script
  - [ ] Confirm result is a non-empty array
- [ ] Run `pnpm all` and confirm no regressions (AC: #7)

## Dev Notes

### Key File

- **Dividend service:** `apps/server/src/app/routes/common/dividend-history.service.ts`

### Current Implementation Summary

```ts
const BASE_URL = 'https://dividendhistory.org/payout';

async function fetchAndParseHtml(url, upperTicker) {
  const response = await fetch(url);   // ← no headers currently
  // ... parse response ...
}
```

### Target Implementation (headers)

```ts
const BASE_URL = 'https://dividendhistory.net/payout';

const BROWSER_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
    '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept':
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,' +
    'image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Referer': 'https://dividendhistory.net/',
} as const;

async function fetchAndParseHtml(url: string, upperTicker: string) {
  const response = await fetch(url, { headers: BROWSER_HEADERS });
  // ... rest unchanged ...
}
```

### Log Message Fix

In `apps/server/src/app/routes/screener/get-consistent-distributions.function.ts`:

- **Find** (line ~70):
  ```
  `fetchDividendHistory returned no data for ${symbol}, falling back to Yahoo Finance`
  ```
- **Replace with**:
  ```
  `fetchDividendHistory returned no data for ${symbol}`
  ```
- **Also update** the corresponding assertion in
  `apps/server/src/app/routes/screener/get-consistent-distributions.function.spec.ts`
  (line ~416) — this test asserts the exact log string, so it must be updated to match.

### Rate Limiting

The existing `DIVIDEND_HISTORY_RATE_LIMIT_DELAY = 10 * 1000` (10 seconds) is correct and
intentional. Add an explanatory comment:

```ts
// 10-second minimum gap between requests — intentionally human-paced to respect
// dividendhistory.net fair-use expectations and avoid automated-access detection.
const DIVIDEND_HISTORY_RATE_LIMIT_DELAY = 10 * 1000;
```

### HTML Parsing Compatibility

The `extractDividendJson` function looks for:
```
/<script[^>]+data-dividend-chart-json[^>]*>([\s\S]*?)<\/script>/
```
Verify this pattern matches dividendhistory.net's HTML before implementing. If the structure
differs, update the regex accordingly.

### Related Files

- `apps/server/src/app/routes/screener/get-consistent-distributions.function.ts` — contains stale log message
- `apps/server/src/app/routes/screener/get-consistent-distributions.function.spec.ts` — contains test assertion to update
- `apps/server/src/app/routes/common/distribution-api.function.ts` — has a comment referencing dividendhistory.org; update if present

### Key Commands

- Run all tests: `pnpm all`
- Quick server test: `pnpm start:server`

### References

- [Source: _bmad-output/planning-artifacts/epics-2026-04-06.md#Epic 50]
- [Source: apps/server/src/app/routes/common/dividend-history.service.ts]
- [Source: apps/server/src/app/routes/screener/get-consistent-distributions.function.ts]
- [Source: _bmad-output/implementation-artifacts/45-1-remove-yahoo-finance-dividend-code.md]
- [Source: _bmad-output/project-context.md]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
