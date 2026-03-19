# Story 2.1: Verify 13f.info Returns Results for Failing CUSIPs

Status: review

## Story

As a developer,
I want to make test HTTP requests to 13f.info for the three failing CUSIPs before committing to the integration,
so that I can confirm the alternative source actually resolves what OpenFIGI cannot.

## Acceptance Criteria

1. **Given** the three failing CUSIPs: `691543102`, `88636J527`, `88634T493`,
   **When** I fetch `https://13f.info/cusip/{CUSIP}` for each,
   **Then** each response contains a valid ticker symbol extractable from the JSON-LD structured data.

2. **And** the results are documented in `_bmad-output/implementation-artifacts/cusip-api-comparison.md` comparing OpenFIGI vs 13f.info responses.

## Tasks / Subtasks

- [x] Verify 13f.info endpoint behaviour (AC: 1)
  - [x] Confirm URL pattern: `https://13f.info/cusip/{CUSIP}`
  - [x] Confirm ticker extraction method: JSON-LD `<script type="application/ld+json">` — `itemListElement[0].name`
  - [x] Confirm no API key or authentication required
  - [x] Note: no official public rate limit; apply 1 req/sec (same delay pattern as Yahoo Finance)
- [x] Make test HTTP fetches for each failing CUSIP (AC: 1)
  - [x] Fetch 13f.info for `691543102` and record resolved ticker
  - [x] Fetch 13f.info for `88636J527` and record resolved ticker
  - [x] Fetch 13f.info for `88634T493` and record resolved ticker
- [x] Make corresponding OpenFIGI calls for comparison (AC: 2)
  - [x] Call OpenFIGI with each of the three CUSIPs and record responses
- [x] Create comparison document (AC: 2)
  - [x] Create `_bmad-output/implementation-artifacts/cusip-api-comparison.md`
  - [x] Include table: CUSIP | OpenFIGI Result | 13f.info Result | Ticker | Resolved? | Notes
  - [x] Document ticker extraction approach
  - [x] Document rate-limiting strategy

## Dev Notes

### Architecture Constraints (ADR-003)

- Resolution chain after integration: 13f.info → Yahoo Finance (OpenFIGI removed)
- Rate limit: No official limit; use 1 req/sec (1000 ms delay between calls, mirroring Yahoo Finance pattern)
- This story is verification only — no code changes to the server

### 13f.info Ticker Extraction

The ticker symbol is embedded in the page's JSON-LD structured data:

```html
<script type="application/ld+json">
  {"@context":"https://schema.org","@type":"BreadcrumbList",
   "itemListElement":[{"name":"OXLC","item":"https://13f.info/cusip/691543102",...}]}
</script>
```

Parse: `JSON.parse(jsonLdText).itemListElement[0].name` → ticker symbol.

Alternatively, the page `<title>` tag follows the pattern `TICKER – Company Name 13F Top Holders`.

### Existing Resolution Sources

The `CusipCacheSource` enum in `prisma/schema.prisma` currently has:

- `OPENFIGI`
- `YAHOO_FINANCE`

Story 2.2 will need to add `THIRTEENF` to this enum and create a migration.

### Existing CUSIP Resolution Code

- Resolution logic: `apps/server/src/app/routes/import/resolve-cusip.function.ts`
- Cache service: `apps/server/src/app/routes/import/cusip-cache.service.ts`
- Admin routes: `apps/server/src/app/routes/admin/cusip-cache/index.ts`
- Yahoo Finance (rate-limit pattern to mirror): `apps/server/src/app/routes/common/distribution-api.function.ts`

### Output Document Format

```markdown
# CUSIP API Comparison — OpenFIGI vs 13f.info

| CUSIP     | OpenFIGI Result | 13f.info Ticker | Resolved? | Notes |
| --------- | --------------- | --------------- | --------- | ----- |
| 691543102 | ...             | OXLC            | Yes       | ...   |
| 88636J527 | ...             | ULTY            | Yes       | ...   |
| 88634T493 | ...             | MSTY            | Yes       | ...   |
```

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 2, Story 2.1]
- [Source: _bmad-output/planning-artifacts/architecture.md#ADR-003]
- [Source: prisma/schema.prisma — CusipCacheSource enum]
- [Source: apps/server/src/app/routes/common/distribution-api.function.ts — Yahoo Finance rate-limit pattern]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (GitHub Copilot)

### Completion Notes List

- All three failing CUSIPs resolved successfully via 13f.info
- 691543102 → OXLC (Oxford Lane Capital Corp.)
- 88636J527 → ULTY (Tidal Trust II YieldMax Ultra O)
- 88634T493 → MSTY (YieldMax MSTR Option Income Strategy ETF)
- OpenFIGI returned `"No identifier found."` for all three CUSIPs, confirming the gap
- No API key or authentication required for 13f.info
- JSON-LD extraction method confirmed: `itemListElement[0].name`
- Rate-limiting strategy: 1 req/sec (1000 ms delay), matching Yahoo Finance pattern

### File List

- `_bmad-output/implementation-artifacts/cusip-api-comparison.md` — Comparison document with full results

### Change Log

| Date       | Change                                                                     | Author                      |
| ---------- | -------------------------------------------------------------------------- | --------------------------- |
| 2026-03-19 | Story completed — all verification tasks done, comparison document created | Dev Agent (Claude Opus 4.6) |
