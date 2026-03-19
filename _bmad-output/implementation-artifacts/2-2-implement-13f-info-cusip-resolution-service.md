# Story 2.2: Implement 13f.info CUSIP Resolution Service

Status: ready-for-dev

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

- [ ] Verify `resolution_source` / `source` field in Prisma schema (AC: 1)
  - [ ] Confirm `CusipCacheSource` enum exists in `prisma/schema.prisma` (it does: `OPENFIGI`, `YAHOO_FINANCE`)
  - [ ] Add `THIRTEENF` to the `CusipCacheSource` enum in `prisma/schema.prisma`
  - [ ] Add `THIRTEENF` to the `CusipCacheSource` enum in `prisma/schema.postgresql.prisma` (keep both schemas in sync)
  - [ ] Create Prisma migration for the enum change
- [ ] Create `thirteenf-cusip.service.ts` (AC: 1, 2)
  - [ ] File location: `apps/server/src/utils/thirteenf-cusip.service.ts`
  - [ ] Class name: `ThirteenfCusipService`
  - [ ] Implement `resolveCusip(cusip: string): Promise<string | null>` method
  - [ ] Fetch `https://13f.info/cusip/{cusip}`, parse JSON-LD to extract ticker
  - [ ] JSON-LD extraction: `JSON.parse(jsonLdText).itemListElement[0].name`
  - [ ] Return `null` if JSON-LD is absent, `itemListElement` is empty, or HTTP is non-200
  - [ ] All methods must be named functions (no arrow functions assigned to properties)
- [ ] Implement rate-limit throttling (AC: 2)
  - [ ] Mirror the Yahoo Finance pattern in `distribution-api.function.ts`:
    - Module-level `let lastThirteenfCallTime = 0`
    - `const THIRTEENF_RATE_LIMIT_DELAY = 1000` (1 second)
    - Named function `enforceThirteenfRateLimit()` that awaits the remaining delay
    - Named function `updateThirteenfLastCallTime()` that records `Date.now()`
  - [ ] Call `enforceThirteenfRateLimit()` before every fetch, `updateThirteenfLastCallTime()` after
- [ ] Write unit tests (AC: 3)
  - [ ] Test: successful CUSIP resolution returns ticker symbol from JSON-LD
  - [ ] Test: JSON-LD absent (non-13f.info page structure) returns `null`
  - [ ] Test: empty `itemListElement` array returns `null`
  - [ ] Test: HTTP non-200 response returns `null` with logged warning
  - [ ] Test: network error returns `null` with logged warning
  - [ ] Test: rate-limit delay is enforced between consecutive calls
  - [ ] Test file: `apps/server/src/utils/thirteenf-cusip.service.spec.ts`

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

### Completion Notes List

### File List
