# Story 2.1: Verify massive.com API Returns Results for Failing CUSIPs

Status: ready-for-dev

## Story

As a developer,
I want to make test API calls to massive.com for the three failing CUSIPs before committing to the integration,
so that I can confirm the alternative API actually resolves what OpenFIGI cannot.

## Acceptance Criteria

1. **Given** the three failing CUSIPs: `691543102`, `88636J527`, `88634T493`,
   **When** I call the massive.com API (free tier) with each CUSIP,
   **Then** each call returns a valid ticker symbol (or a clear indication that the symbol is unresolvable).

2. **And** the results are documented in `_bmad-output/implementation-artifacts/cusip-api-comparison.md` comparing OpenFIGI vs massive.com responses.

## Tasks / Subtasks

- [ ] Research massive.com API documentation (AC: 1)
  - [ ] Identify the correct endpoint for CUSIP-to-ticker resolution
  - [ ] Document authentication requirements (API key, free tier limits)
  - [ ] Confirm rate limit: 5 requests/minute per ADR-003
- [ ] Make test API calls for each failing CUSIP (AC: 1)
  - [ ] Call massive.com with `691543102` and record response
  - [ ] Call massive.com with `88636J527` and record response
  - [ ] Call massive.com with `88634T493` and record response
- [ ] Make corresponding OpenFIGI calls for comparison (AC: 2)
  - [ ] Call OpenFIGI with each of the three CUSIPs and record responses
- [ ] Create comparison document (AC: 2)
  - [ ] Create `_bmad-output/implementation-artifacts/cusip-api-comparison.md`
  - [ ] Include table: CUSIP | OpenFIGI Result | massive.com Result | Notes
  - [ ] Document any rate-limit or authentication observations
  - [ ] Document response format differences

## Dev Notes

### Architecture Constraints (ADR-003)

- Fallback chain after integration: OpenFIGI → massive.com → Yahoo Finance
- Rate limit: 5 req/min. Plan for 4.5 req/min effective rate (10% safety margin)
- This story is verification only — no code changes to the server

### Existing Resolution Sources

The `CusipCacheSource` enum in `prisma/schema.prisma` currently has:
- `OPENFIGI`
- `YAHOO_FINANCE`

Story 2.2 will need to add `MASSIVE` to this enum and create a migration.

### Existing CUSIP Resolution Code

- Resolution logic: `apps/server/src/app/routes/import/resolve-cusip.function.ts`
- Cache service: `apps/server/src/app/routes/import/cusip-cache.service.ts`
- Admin routes: `apps/server/src/app/routes/admin/cusip-cache/index.ts`
- Yahoo Finance: `apps/server/src/app/routes/common/distribution-api.function.ts`

### Output Document Format

```markdown
# CUSIP API Comparison — OpenFIGI vs massive.com

| CUSIP       | OpenFIGI Result | massive.com Result | Resolved? | Notes |
|-------------|-----------------|---------------------|-----------|-------|
| 691543102   | ...             | ...                 | Yes/No    | ...   |
| 88636J527   | ...             | ...                 | Yes/No    | ...   |
| 88634T493   | ...             | ...                 | Yes/No    | ...   |
```

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 2, Story 2.1]
- [Source: _bmad-output/planning-artifacts/architecture.md#ADR-003]
- [Source: prisma/schema.prisma — CusipCacheSource enum]

## Dev Agent Record

### Agent Model Used

### Completion Notes List

### File List
