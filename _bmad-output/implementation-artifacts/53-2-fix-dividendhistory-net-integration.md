# Story 53.2: Fix dividendhistory.net Integration Based on Investigation Findings

Status: Approved

## Story

As a developer,
I want the `fetchDividendHistory` function to correctly retrieve and parse dividend data from dividendhistory.net for VFL, ACP, IFN, and FAX,
so that the application displays accurate dividend information for securities that were previously returning empty results.

## Acceptance Criteria

1. **Given** the HTML structure findings from Story 53.1,
   **When** `fetchDividendHistory('VFL')` is called,
   **Then** a non-empty array of dividend rows is returned.

2. **Given** the HTML structure findings from Story 53.1,
   **When** `fetchDividendHistory('ACP')` is called,
   **Then** a non-empty array of dividend rows is returned.

3. **Given** the HTML structure findings from Story 53.1,
   **When** `fetchDividendHistory('IFN')` is called,
   **Then** a non-empty array of dividend rows is returned.

4. **Given** the HTML structure findings from Story 53.1,
   **When** `fetchDividendHistory('FAX')` is called,
   **Then** a non-empty array of dividend rows is returned.

5. **Given** the parsing logic is updated to match the actual dividendhistory.net HTML structure,
   **When** `extractDividendJson` (or its replacement) processes the live HTML,
   **Then** the correct dividend JSON data is extracted without errors.

6. **Given** any test files reference the old `dividendhistory.org` URL or the incorrect `dividendhistory.net` parsing assumptions from Story 50.1,
   **When** the implementation is corrected,
   **Then** all such test references are updated to match the verified behaviour.

7. **Given** all changes are applied,
   **When** `pnpm all` runs,
   **Then** all unit tests pass with no regressions.

## Definition of Done

- [ ] Parsing logic in `dividend-history.service.ts` updated to match the actual HTML structure confirmed in Story 53.1 (not the assumed `<script data-dividend-chart-json>` pattern unless it was verified to exist)
- [ ] Manual or integration test confirms VFL returns dividend rows from dividendhistory.net
- [ ] Manual or integration test confirms ACP returns dividend rows from dividendhistory.net
- [ ] Manual or integration test confirms IFN returns dividend rows from dividendhistory.net
- [ ] Manual or integration test confirms FAX returns dividend rows from dividendhistory.net
- [ ] All test files updated to reflect the verified dividendhistory.net behaviour
- [ ] `pnpm all` passes

## Tasks / Subtasks

> **BLOCKED:** Tasks 2–5 cannot begin until Story 53.1 is complete. The first task is to review 53.1's investigation findings and use them to drive all subsequent changes.

- [ ] **Task 1: Review Story 53.1 findings** (prerequisite for all other tasks)

  - [ ] Read `_bmad-output/implementation-artifacts/53-1-investigate-dividendhistory-net-html-structure.md` (Dev Agent Record section) in full
  - [ ] Identify the actual HTML pattern confirmed by Investigation (e.g., does `<script data-dividend-chart-json>` exist, or is there a different pattern?)
  - [ ] Identify any confirmed field-name differences vs the `DividendHistoryRow` interface (`ex_div`, `payday`, `payout`, `type`, `currency`, `pctChange`)
  - [ ] Note HTTP response status for VFL, ACP, IFN, FAX (should all be 200)
  - [ ] Record the findings that will drive the implementation below

- [ ] **Task 2: Update `extractDividendJson` (or replace it) in `dividend-history.service.ts`** (AC: #5)

  - [ ] If the `<script data-dividend-chart-json>` attribute was **confirmed present** on dividendhistory.net: verify the existing regex works correctly and make no change (or add a comment confirming verification)
  - [ ] If the attribute was **absent** and a different HTML pattern was found:
    - [ ] Replace or update the `scriptRegex` in `extractDividendJson` to match the confirmed pattern
    - [ ] If the data structure is now in a different element (e.g. HTML table, inline JSON variable, different attribute name), rewrite the extraction logic accordingly
    - [ ] If field names differ from `DividendHistoryRow` (e.g., site uses `exDiv` instead of `ex_div`), add a mapping step or update the interface
  - [ ] Update the function-level comment to describe the confirmed data source pattern
  - [ ] Do **not** remove `BROWSER_HEADERS`, `DIVIDEND_HISTORY_RATE_LIMIT_DELAY` — these must remain intact
  - [ ] **Update** `BASE_URL` from `'https://dividendhistory.net/payout'` to `'https://dividendhistory.net'` and URL path from `/{TICKER}/` to `/{ticker_lowercase}-dividend-yield`

- [ ] **Task 3: Verify VFL, ACP, IFN, FAX return non-empty results** (AC: #1–4)

  - [ ] Run a manual integration check for each symbol (e.g., via `test-yahoo.js` or a temporary test script, or via Playwright MCP) confirming a non-empty array is returned
  - [ ] Alternatively, write a short throwaway test that hits the live endpoint via `fetchDividendHistory` — mark it `skip` or `todo` in the committed test file if it requires network access

- [ ] **Task 4: Update unit tests in `dividend-history.service.spec.ts`** (AC: #6, #7)

  - [ ] Review the `buildDividendHtml` helper function in the spec — it currently generates HTML with `<script type="application/json" data-dividend-chart-json>`. If the confirmed pattern differs, update this helper to match.
  - [ ] If `extractDividendJson` was rewritten (Task 2), update all test cases that supply mock HTML to use the new HTML structure
  - [ ] If field names changed, update `SAMPLE_DIVIDEND_ROWS` and any mapping assertions
  - [ ] Ensure all existing test cases still pass — do not silently delete tests; rewrite them to match the verified behaviour
  - [ ] Add new test cases if the new parsing path introduces branches not previously covered (e.g., missing element, partial data)

- [ ] **Task 5: Run `pnpm all` and confirm no regressions** (AC: #7)
  - [ ] Run `pnpm all` from workspace root
  - [ ] Fix any remaining test failures introduced by the parsing changes
  - [ ] Confirm the passing test count is ≥ the prior baseline

## Dev Notes

### Key Files

| File                                                                                           | Purpose                                                                           |
| ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `apps/server/src/app/routes/common/dividend-history.service.ts`                                | Main service — `extractDividendJson`, `fetchAndParseHtml`, `fetchDividendHistory` |
| `apps/server/src/app/routes/common/dividend-history.service.spec.ts`                           | Unit tests — `buildDividendHtml` helper must match confirmed HTML pattern         |
| `_bmad-output/implementation-artifacts/53-1-investigate-dividendhistory-net-html-structure.md` | **Investigation results** — drive all parsing decisions from this file            |
| `_bmad-output/implementation-artifacts/50-1-switch-dividend-fetch-to-dividendhistory-net.md`   | Prior story context — what was changed in Epic 50                                 |

### Current Implementation Context (post-Story 50.1)

The service as it stands after Story 50.1:

```typescript
const BASE_URL = 'https://dividendhistory.net/payout'; // ✅ correct domain

const BROWSER_HEADERS = {
  /* ... Chrome UA, Accept, Accept-Language, Referer */
};
// ✅ must remain

// 10-second rate limit — must remain
const DIVIDEND_HISTORY_RATE_LIMIT_DELAY = 10 * 1000;

interface DividendHistoryRow {
  ex_div: string;
  payday: string;
  payout: number;
  type: string;
  currency: string;
  pctChange: number | string;
}

function extractDividendJson(html: string): DividendHistoryRow[] | null {
  // ⚠️  This regex was ASSUMED — Story 53.1 must confirm whether this attribute exists
  const scriptRegex = /<script[^>]+data-dividend-chart-json[^>]*>([\s\S]*?)<\/script>/;
  const match = scriptRegex.exec(html);
  if (!match) return null;
  try {
    const parsed: unknown = JSON.parse(match[1]);
    return Array.isArray(parsed) ? (parsed as DividendHistoryRow[]) : null;
  } catch {
    return null;
  }
}
```

The existing spec helper matches the _assumed_ pattern:

```typescript
function buildDividendHtml(rows: unknown[]): string {
  return `<html><body><script type="application/json" data-dividend-chart-json>${JSON.stringify(rows)}</script></body></html>`;
}
```

If Story 53.1 confirms a different HTML structure, both `extractDividendJson` and `buildDividendHtml` must be updated together so they remain consistent.

### Story 53.1 Dependency

**This story is hard-blocked on Story 53.1.**

Story 53.1 uses the Playwright MCP browser to load live dividendhistory.net pages for VFL, ACP, IFN, and FAX and documents:

1. Whether `<script data-dividend-chart-json>` actually exists on dividendhistory.net
2. If not, the correct HTML pattern where dividend data is embedded
3. The confirmed field names in the dividend data
4. HTTP 200 confirmation for all four symbols

The root cause of VFL/ACP/IFN/FAX returning empty arrays is almost certainly that `extractDividendJson` returns `null` (because the assumed `data-dividend-chart-json` attribute does not exist on dividendhistory.net). Story 53.1 confirms the real pattern; this story implements the fix.

**Do not guess the HTML pattern.** Read the Dev Agent Record of Story 53.1 first.

### Constraints

The following must **not** be altered by this story:

- `BROWSER_HEADERS` constant and its contents
- `DIVIDEND_HISTORY_RATE_LIMIT_DELAY = 10 * 1000` (10-second minimum gap)
- `enforceDividendHistoryRateLimit()` and `updateDividendHistoryCallTime()` exports
- The `isValidProcessedRow` guard (date valid + amount > 0)
- Sort order (ascending by date)

The following **must** be updated by this story (confirmed by Story 53.1 investigation):

- `BASE_URL`: change from `'https://dividendhistory.net/payout'` to `'https://dividendhistory.net'`
- URL construction: change from `` `${BASE_URL}/${encodeURIComponent(upperTicker)}/` `` to
  `` `${BASE_URL}/${encodeURIComponent(upperTicker.toLowerCase())}-dividend-yield` ``
- The `type !== 'u'` filter: **remove**; replace with a date-based guard (exclude rows where
  ex-div date > today), since the `type` field does not exist in the new HTML structure

### Testing Approach

**Unit test scope (must-pass offline):**

- Mock `fetch` to return HTML that matches the _confirmed_ structure from Story 53.1
- Verify `fetchDividendHistory('PDI')` (or any symbol) returns the expected `ProcessedRow[]`
- Update `buildDividendHtml` helper in the spec to generate matching HTML
- All existing unit test cases must continue to pass (rewrite, do not delete)

**Integration/manual verification (required for DoD):**

- Use Playwright MCP or a temporary Node script to call `fetchDividendHistory('VFL')` against the live site
- Confirm a non-empty array for VFL, ACP, IFN, FAX
- This can be done informally (no committed integration test required), but the result must be documented in the Dev Agent Record below

### Key Commands

```bash
# Run all unit tests
pnpm all

# Run only the dividend service spec
pnpm nx test server --testFile=apps/server/src/app/routes/common/dividend-history.service.spec.ts

# Quick server smoke check
pnpm start:server
```

### References

- [Story 53.1 (investigation prerequisite)](../implementation-artifacts/53-1-investigate-dividendhistory-net-html-structure.md)
- [Story 50.1 (prior domain switch)](../implementation-artifacts/50-1-switch-dividend-fetch-to-dividendhistory-net.md)
- [Service file](../../apps/server/src/app/routes/common/dividend-history.service.ts)
- [Service spec](../../apps/server/src/app/routes/common/dividend-history.service.spec.ts)
- [Project context](../../_bmad-output/project-context.md)

---

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6 (GitHub Copilot)

### Story Creation Date

2026-04-06

### Implementation Notes

**Updated 2026-04-06 based on Story 53.1 investigation findings.**

#### Confirmed HTML Pattern from Story 53.1

1. **URL format (BREAKING CHANGE):** The old `/payout/{TICKER}/` path returns HTTP 404. The new URL
   pattern is: `https://dividendhistory.net/{ticker_lowercase}-dividend-yield`

   - Change `BASE_URL` to `'https://dividendhistory.net'`
   - Change URL construction to `` `${BASE_URL}/${encodeURIComponent(upperTicker.toLowerCase())}-dividend-yield` ``

2. **No `data-dividend-chart-json`:** This attribute does not exist on dividendhistory.net.
   The dividend data is in HTML tables with class `table table-bordered`.

3. **Two-table structure per page:**

   - **Table 1** (2nd `table.table-bordered` on page): Has header row `<th>`, then ~25 data rows
   - **Table 2** (3rd `table.table-bordered` on page): No header row, contains older history

4. **Column mapping (0-indexed):**
   | Index | Column header | Maps to |
   |---|---|---|
   | 0 | `{SYM} Ex Dividend Date` | `ex_div` (format: `MM/DD/YYYY`) |
   | 1 | `Declaration Date` | (not used) |
   | 2 | `Record Date` | (not used) |
   | 3 | `Payout Date` | `payday` (format: `MM/DD/YYYY`) |
   | 4 | `Period` | (not used — `Monthly`, `Quarterly`, `Annual`, `Other`) |
   | 5 | `Dividend` | `payout` (format: `$0.05000` — strip `$`, parse float) |
   | 6 | `Unadjusted` | (not used — split-adjusted vs unadjusted price) |
   | 7 | `Change` | (not used — percentage change vs prior) |

5. **`type` field:** Does not exist in the new HTML. The `type !== 'u'` filter must be replaced
   with a date-based guard: exclude rows where ex-div date is in the future (> today).

6. **`currency` field:** Not present; always USD. Remove from interface or default to `'USD'`.

7. **`DividendHistoryRow` interface changes needed:**
   - Remove `type: string` and `currency: string` (absent from new structure)
   - Change `pctChange` to optional since `Change` column is often empty string

#### What `extractDividendJson` should become

Replace with an HTML table parser using a proper DOM parser (e.g., JSDOM, `node-html-parser`, or
similar — not string splitting on `<td` boundaries, which is brittle against whitespace/nesting):

- Select the 2nd and 3rd `table.table-bordered` elements via DOM
- For Table 1: iterate rows, skip the first `<tr>` row (header with `<th>` elements)
- For Table 2: iterate all `<tr>` rows (no header row)
- For each data row, use DOM `.querySelectorAll('td')` to read cells by index:
  - Index 0 → `ex_div` (ex-dividend date, `MM/DD/YYYY`)
  - Index 3 → `payday` (payout date, `MM/DD/YYYY`)
  - Index 5 → `payout` (dividend amount, strip `$`, parse to float)
- Filter out rows where `ex_div` date is in the future (date-based guard replaces `type !== 'u'`)
- Return array of `DividendHistoryRow` objects with only the mapped fields

#### Manual Verification Results (from Story 53.1 Playwright investigation)

- VFL: HTTP 200, 25 + 370 rows = 395 total dividend rows (data goes back to 1993)
- ACP: HTTP 200, 25 + 155 rows = 180 total dividend rows (data goes back to 2011)
- IFN: HTTP 200, 25 + 38 rows = 63 total dividend rows (quarterly, goes back to 1994)
- FAX: HTTP 200, 25 + 279 rows = 304 total dividend rows (data goes back to 2000)

All four symbols return substantial dividend histories — no empty results expected after fix.

### Completion Checklist

- [ ] `extractDividendJson` updated (or confirmed unchanged) based on verified HTML structure
- [ ] `buildDividendHtml` in spec updated to match if parsing changed
- [ ] VFL returns non-empty array (verified manually or via integration check)
- [ ] ACP returns non-empty array
- [ ] IFN returns non-empty array
- [ ] FAX returns non-empty array
- [ ] `pnpm all` passes with no regressions
