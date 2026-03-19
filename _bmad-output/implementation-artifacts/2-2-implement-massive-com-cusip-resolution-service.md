# Story 2.2: Implement massive.com CUSIP Resolution Service

Status: ready-for-dev

## Story

As a developer,
I want a server-side service that wraps the massive.com API and resolves a CUSIP to a ticker symbol,
so that the resolution logic is encapsulated and testable independently of the existing OpenFIGI service.

## Acceptance Criteria

1. **Given** a valid CUSIP string,
   **When** the massive.com service is called,
   **Then** it returns the resolved ticker symbol if found, or `null` if not found.

2. **And** the service respects the 5 API calls/minute rate limit by queuing or throttling requests.

3. **And** the service has unit tests covering: successful resolution, null response, rate-limit handling, and network error.

## Tasks / Subtasks

- [ ] Verify `resolution_source` / `source` field in Prisma schema (AC: 1)
  - [ ] Confirm `CusipCacheSource` enum exists in `prisma/schema.prisma` (it does: `OPENFIGI`, `YAHOO_FINANCE`)
  - [ ] Add `MASSIVE` to the `CusipCacheSource` enum in `prisma/schema.prisma`
  - [ ] Add `MASSIVE` to the `CusipCacheSource` enum in `prisma/schema.postgresql.prisma` (keep both schemas in sync)
  - [ ] Create Prisma migration for the enum change
- [ ] Create `massive-cusip.service.ts` (AC: 1, 2)
  - [ ] File location: `apps/server/src/utils/massive-cusip.service.ts` per architecture
  - [ ] Class name: `MassiveCusipService`
  - [ ] Implement `resolveCusip(cusip: string): Promise<string | null>` method
  - [ ] All methods must be named functions (no arrow functions assigned to properties)
- [ ] Implement rate-limit throttling (AC: 2)
  - [ ] Hand-rolled interval-based throttle per ADR-003
  - [ ] Effective rate: 4.5 req/min (10% safety margin below 5 req/min)
  - [ ] Named helper function: `throttledFetch` (or similar explicit name)
  - [ ] No external queue library required
- [ ] Implement circuit-breaker for HTTP 429 (AC: 2)
  - [ ] If massive.com returns HTTP 429, return `null` immediately (fall through to Yahoo Finance)
- [ ] Write unit tests (AC: 3)
  - [ ] Test: successful CUSIP resolution returns ticker symbol
  - [ ] Test: unknown CUSIP returns `null`
  - [ ] Test: rate-limit throttling correctly spaces requests
  - [ ] Test: HTTP 429 triggers circuit-breaker, returns `null`
  - [ ] Test: network error returns `null` with logged warning
  - [ ] Test file: `apps/server/src/utils/massive-cusip.service.spec.ts`

## Dev Notes

### Architecture Constraints (ADR-003)

- File: `apps/server/src/utils/massive-cusip.service.ts`
- Class: `MassiveCusipService`
- Rate limit: Hand-rolled interval-based throttle, 4.5 req/min effective rate
- Circuit-breaker: HTTP 429 → fall through immediately
- Named functions only — no anonymous arrow functions

### Prisma Schema Change Required

Both schema files must stay in sync:
- `prisma/schema.prisma` (SQLite dev)
- `prisma/schema.postgresql.prisma` (PostgreSQL prod)

Current `CusipCacheSource` enum at line ~144 of `prisma/schema.prisma`:
```prisma
enum CusipCacheSource {
  OPENFIGI
  YAHOO_FINANCE
}
```
Must become:
```prisma
enum CusipCacheSource {
  OPENFIGI
  MASSIVE
  YAHOO_FINANCE
}
```

### Naming Convention (ADR-003)

Resolution source values match the `CusipCacheSource` enum exactly:
| Value          | Meaning                             |
|----------------|-------------------------------------|
| `OPENFIGI`     | Resolved via OpenFIGI API           |
| `MASSIVE`      | Resolved via massive.com            |
| `YAHOO_FINANCE`| Resolved via Yahoo Finance fallback |

### Testing Standards

- Unit test framework: Vitest
- Test file co-located: `massive-cusip.service.spec.ts`
- Use `vi.mock()` for HTTP calls
- `globals: true` — no need to import describe/it/expect

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 2, Story 2.2]
- [Source: _bmad-output/planning-artifacts/architecture.md#ADR-003]
- [Source: prisma/schema.prisma — CusipCacheSource enum, line 144]
- [Source: _bmad-output/project-context.md#Backend — Fastify + Prisma]

## Dev Agent Record

### Agent Model Used

### Completion Notes List

### File List
