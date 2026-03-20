# Story 2.2: Implement 13f.info CUSIP Resolution Service

Status: review

## Story

As a developer,
I want a server-side service that scrapes 13f.info and resolves a CUSIP to a ticker symbol,
so that the resolution logic is encapsulated and testable independently of the existing OpenFIGI service.

## Acceptance Criteria

1. **Given** a valid CUSIP string,
   **When** the 13f.info service is called,
   **Then** it returns the resolved ticker symbol if found, or `null` if not found.

2. **And** the service enforces a 1-second minimum delay between requests (mirroring the Yahoo Finance rate-limit pattern).

3. **And** the service has unit tests covering: successful resolution, null response (CUSIP not found), rate-limit delay, and network error.

## Tasks / Subtasks

- [x] Verify `resolution_source` / `source` field in Prisma schema (AC: 1)
  - [x] Confirm `CusipCacheSource` enum exists in `prisma/schema.prisma` (it does: `OPENFIGI`, `YAHOO_FINANCE`)
  - [x] Add `THIRTEENF` to the `CusipCacheSource` enum in `prisma/schema.prisma`
  - [x] Add `THIRTEENF` to the `CusipCacheSource` enum in `prisma/schema.postgresql.prisma` (keep both schemas in sync)
  - [x] Create Prisma migration for the enum change — deferred to Story 2.3 (SQLite dev, no migration needed)
- [x] Create `thirteenf-cusip.service.ts` (AC: 1, 2)
  - [x] File location: `apps/server/src/utils/thirteenf-cusip.service.ts`
  - [x] Implemented as standalone exported functions (matching `distribution-api.function.ts` pattern)
  - [x] Implement `resolveCusipViaThirteenf(cusip: string): Promise<string | null>` function
  - [x] Fetch `https://13f.info/cusip/{cusip}`, parse JSON-LD to extract ticker
  - [x] JSON-LD extraction: `JSON.parse(jsonLdText).itemListElement[0].name`
  - [x] Return `null` if JSON-LD is absent, `itemListElement` is empty, or HTTP is non-200
  - [x] All methods are named functions (no arrow functions assigned to properties)
- [x] Implement rate-limit throttling (AC: 2)
  - [x] Mirror the Yahoo Finance pattern in `distribution-api.function.ts`:
    - Module-level `let lastThirteenfCallTime = 0`
    - `const THIRTEENF_RATE_LIMIT_DELAY = 1000` (1 second)
    - Named function `enforceThirteenfRateLimit()` that awaits the remaining delay
    - Named function `updateThirteenfLastCallTime()` that records `Date.now()`
  - [x] Call `enforceThirteenfRateLimit()` before every fetch, `updateThirteenfLastCallTime()` after
- [x] Write unit tests (AC: 3)
  - [x] Test: successful CUSIP resolution returns ticker symbol from JSON-LD
  - [x] Test: JSON-LD absent (non-13f.info page structure) returns `null`
  - [x] Test: empty `itemListElement` array returns `null`
  - [x] Test: HTTP non-200 response returns `null` with logged warning
  - [x] Test: network error returns `null` with logged warning
  - [x] Test: rate-limit delay is enforced between consecutive calls
  - [x] Test file: `apps/server/src/utils/thirteenf-cusip.service.spec.ts`

## Dev Notes

### Architecture Constraints (ADR-003)

- File: `apps/server/src/utils/thirteenf-cusip.service.ts`
- Class: `ThirteenfCusipService`
- Rate limit: 1 req/sec (1000 ms delay), using same pattern as Yahoo Finance
- No HTTP 429 circuit-breaker needed (no official rate limit), but handle non-200 gracefully
- Named functions only — no anonymous arrow functions

### Rate-Limit Pattern (mirror of Yahoo Finance)

From `apps/server/src/app/routes/common/distribution-api.function.ts`:
```typescript
let lastApiCallTime = 0;
const YAHOO_RATE_LIMIT_DELAY = 10 * 1000;

async function enforceYahooFinanceRateLimit() {
  const now = Date.now();
  const timeSinceLastCall = now - lastApiCallTime;
  if (timeSinceLastCall < YAHOO_RATE_LIMIT_DELAY) {
    await new Promise(resolve => setTimeout(resolve, YAHOO_RATE_LIMIT_DELAY - timeSinceLastCall));
  }
}
```
Apply the same pattern with `THIRTEENF_RATE_LIMIT_DELAY = 1000`.

### 13f.info Ticker Extraction

URL: `https://13f.info/cusip/{CUSIP}`  
No authentication required.

JSON-LD block in `<head>`:
```json
{"@context":"https://schema.org","@type":"BreadcrumbList",
 "itemListElement":[{"name":"OXLC","item":"https://13f.info/cusip/691543102",
  "alternateName":"Oxford Lane Capital Corp.","identifier":"691543102",...}]}
```
Extract ticker: `parsed.itemListElement[0].name`

Verified results from Story 2.1 pre-test:
| CUSIP      | Ticker |
|------------|--------|
| 691543102  | OXLC   |
| 88636J527  | ULTY   |
| 88634T493  | MSTY   |

### Prisma Schema Change Required

Both schema files must stay in sync:
- `prisma/schema.prisma` (SQLite dev)
- `prisma/schema.postgresql.prisma` (PostgreSQL prod)

Current `CusipCacheSource` enum:
```prisma
enum CusipCacheSource {
  OPENFIGI
  YAHOO_FINANCE
}
```
Must become:
```prisma
enum CusipCacheSource {
  THIRTEENF
  YAHOO_FINANCE
}
```
(Remove `OPENFIGI` as it is being deleted in Story 2.3; add `THIRTEENF` for 13f.info.)

### Naming Convention

Resolution source values match the `CusipCacheSource` enum exactly:
| Value          | Meaning                              |
|----------------|--------------------------------------|
| `THIRTEENF`    | Resolved via 13f.info HTML scraping  |
| `YAHOO_FINANCE`| Resolved via Yahoo Finance fallback  |

### Testing Standards

- Unit test framework: Vitest
- Test file co-located: `thirteenf-cusip.service.spec.ts`
- Use `vi.mock()` / `vi.spyOn()` for `fetch`
- `globals: true` — no need to import describe/it/expect

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 2, Story 2.2]
- [Source: _bmad-output/planning-artifacts/architecture.md#ADR-003]
- [Source: prisma/schema.prisma — CusipCacheSource enum]
- [Source: apps/server/src/app/routes/common/distribution-api.function.ts — Yahoo Finance rate-limit pattern]
- [Source: _bmad-output/project-context.md#Backend — Fastify + Prisma]

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6 via GitHub Copilot

### Completion Notes List
- Added `THIRTEENF` to `CusipCacheSource` enum in both schema files (kept `OPENFIGI` — removed in Story 2.3)
- Implemented as standalone exported functions (not a class) to match the `distribution-api.function.ts` pattern
- Uses `RegExp.exec()` instead of `String.match()` per eslint rules
- Named function inside Promise: `function rateLimitPromise(resolve)` per `@smarttools/no-anonymous-functions`
- Uses structured logger `logger.warn(message, data)` matching the project's `StructuredLogger` API
- All 7 unit tests pass; 0 lint/build errors from new files
- Pre-existing lint (851 errors) and build (63 Prisma client errors) failures unrelated to this story
- Prisma migration deferred to Story 2.3

### File List
- `prisma/schema.prisma` — added `THIRTEENF` to `CusipCacheSource` enum
- `prisma/schema.postgresql.prisma` — added `THIRTEENF` to `CusipCacheSource` enum
- `apps/server/src/utils/thirteenf-cusip.service.ts` — new 13f.info CUSIP resolution service
- `apps/server/src/utils/thirteenf-cusip.service.spec.ts` — unit tests (7 tests)

### Change Log
| Date | Change | Reason |
|------|--------|--------|
| 2026-03-19 | Initial implementation | Story 2.2 |
