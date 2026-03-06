# Story AR.10: CUSIP Cache Enhancements and Management

**Status:** Approved

## Story

**As a** system administrator
**I want** tools to monitor and manage the CUSIP cache
**So that** I can maintain cache health and troubleshoot resolution issues

## Context

**Current System:**

- AR.8 and AR.9 implemented basic CUSIP caching
- Cache stores CUSIP→Symbol mappings permanently
- No management tools or monitoring capabilities
- No way to handle edge cases like:
  - Symbol changes due to corporate actions (ticker changes)
  - Delisted securities
  - Incorrectly resolved CUSIPs
  - Cache growth over time

**Business Need:**

- Administrators need visibility into cache performance
- Users may need to manually correct incorrect mappings
- Cache may need periodic cleanup for obsolete entries
- System health monitoring requires cache metrics

**Proposed Enhancements:**

1. **Cache Statistics** - API endpoint showing cache metrics
2. **Cache Management API** - Endpoints for manual cache operations
3. **Cache Cleanup** - Optional expiration/archival of old entries
4. **Audit Logging** - Track cache updates for troubleshooting

## Acceptance Criteria

### Cache Statistics Endpoint

1. [ ] GET `/api/admin/cusip-cache/stats` endpoint returns:
   - Total cache entries
   - Cache hit rate (if tracking enabled)
   - Entries by source (OpenFIGI vs Yahoo Finance)
   - Most recently added entries (last 10)
   - Cache size (database storage)
   - Oldest/newest cache entries
2. [ ] Statistics are calculated efficiently (no full table scans)
3. [ ] Response includes timestamp of statistics generation

### Cache Management API

4. [ ] GET `/api/admin/cusip-cache/search?cusip=XXX` - Search cache by CUSIP
5. [ ] GET `/api/admin/cusip-cache/search?symbol=YYY` - Search cache by symbol
6. [ ] POST `/api/admin/cusip-cache/add` - Manually add/update mapping
7. [ ] DELETE `/api/admin/cusip-cache/:id` - Remove incorrect mapping
8. [ ] POST `/api/admin/cusip-cache/bulk-add` - Import multiple mappings
9. [ ] All endpoints require admin authentication
10. [ ] Endpoints validate input (CUSIP format, non-empty symbols)

### Cache Cleanup Features

11. [ ] Add `lastUsedAt` field to schema (track when mapping was last used)
12. [ ] Background job or manual endpoint to archive entries unused >1 year
13. [ ] Archived entries moved to `cusip_cache_archive` table
14. [ ] Cleanup is optional and configurable
15. [ ] Cleanup reports what was archived

### Audit Logging

16. [ ] Cache updates logged with:
    - Timestamp
    - CUSIP and symbol
    - Source (API, manual, bulk import)
    - User ID (for manual updates)
17. [ ] Logs stored in `cusip_cache_audit` table
18. [ ] Audit log queryable via API
19. [ ] Audit log includes update reason (if manually added)

## Tasks / Subtasks

- [ ] Update Prisma schema (AC: 11, 16-17)
  - [ ] Add `lastUsedAt` DateTime field to `cusip_cache`
  - [ ] Create `cusip_cache_archive` model
  - [ ] Create `cusip_cache_audit` model
  - [ ] Create and run migration
- [ ] Implement statistics endpoint (AC: 1-3)
  - [ ] Create route `/api/admin/cusip-cache/stats`
  - [ ] Query cache counts and aggregations
  - [ ] Calculate cache hit rate (requires tracking)
  - [ ] Add admin auth middleware
- [ ] Implement management API (AC: 4-10)
  - [ ] Create CRUD endpoints for cache
  - [ ] Add search functionality
  - [ ] Add validation middleware
  - [ ] Add admin authorization checks
  - [ ] Write API tests
- [ ] Implement cleanup features (AC: 11-15)
  - [ ] Add `lastUsedAt` tracking to CusipCacheService
  - [ ] Create cleanup service/endpoint
  - [ ] Implement archival logic
  - [ ] Add configuration options
  - [ ] Create manual cleanup endpoint
- [ ] Implement audit logging (AC: 16-19)
  - [ ] Create AuditLogService
  - [ ] Log all cache modifications
  - [ ] Create audit log query endpoint
  - [ ] Add retention policy for audit logs
- [ ] Create cache warming script (AC: 20-23)
  - [ ] Write Node.js script in `scripts/` folder
  - [ ] Add CSV parsing
  - [ ] Add validation logic
  - [ ] Generate import report
  - [ ] Document usage in README
- [ ] Optional: Admin UI (AC: 24-28)
  - [ ] Create Angular component for cache dashboard
  - [ ] Add to admin routes
  - [ ] Implement search interface
  - [ ] Add management forms
  - [ ] Style with project UI framework

## Dependencies

### Security

- Admin endpoints must require authentjection
- Limit bulk operations to prevent abuse
- Rate limit API endpoints

### Database Schema Additions

```prisma
model cusip_cache {
  // ... existing fields ...
  lastUsedAt DateTime @default(now()) @updatedAt  // track usage
}

model cusip_cache_archive {
  id         String   @id @default(uuid())
  cusip      String
  symbol     String
  source     String
  resolvedAt DateTime
  archivedAt DateTime @default(now())
  reason     String?  // why archived

  @@index([archivedAt])
}

model cusip_cache_audit {
  id        String   @id @default(uuid())
  cusip     String
  symbol    String
  action    String   // 'CREATE', 'UPDATE', 'DELETE'
  source    String   // 'API', 'MANUAL', 'BULK_IMPORT'
  userId    String?  // if manual
  reason    String?  // if manual
  createdAt DateTime @default(now())

  @@index([createdAt])
  @@index([cusip])
}
```

### Configuration

- Add environment variables for:
  - `CUSIP_CACHE_CLEANUP_ENABLED` (default: false)
  - `CUSIP_CACHE_CLEANUP_AGE_DAYS` (default: 365)
  - `CUSIP_CACHE_AUDIT_RETENTION_DAYS` (default: 90)

## Definition of Done

- [ ] All acceptance criteria met
- [ ] API endpoints documented
- [ ] Unit tests for new services
- [ ] Integration tests for endpoints
- [ ] Manual testing confirms functionality
- [ ] Admin UI tested (if implemented)
- [ ] Documentation updated:
  - Admin guide for cache management
  - API documentationed
- [ ] Performance tested with large cache (10k+ entries)

## Related Files

**New Files:**

- `apps/server/src/app/routes/admin/cusip-cache-stats.route.ts`
- `apps/server/src/app/routes/admin/cusip-cache-management.route.ts`
- `apps/server/src/app/services/cusip-cache-cleanup.service.ts`
- `apps/server/src/app/services/cusip-audit-log.service.ts`
- `scripts/warm-cusip-cache.ts`
- `scripts/sample-cusips.csv` (sample data for testing)
- Migration file(s) for schema updates

\*\*Migration file(s) for schema updates

**Modified Files:**

- `prisma/schema.prisma` (add audit and archive models)
- `prisma/schema.postgresql.prisma` (add audit and archive models)
- `apps/server/src/app/routes/import/cusip-cache.service.ts` (add lastUsedAt tracking)

```json
{
  "totalEntries": 1247,
  "entriesBySource": {
    "OPENFIGI": 892,
    "YAHOO_FINANCE": 355
  },
  "cacheHitRate": 73.5,
  "oldestEntry": "2024-01-15T10:23:45Z",
  "newestEntry": "2026-03-05T14:32:10Z",
  "recentlyAdded": [
    {
      "cusip": "00206R102",
      "symbol": "T",
      "source": "OPENFIGI",
      "resolvedAt": "2026-03-05T14:32:10Z"
    }
  ],
  "timestamp": "2026-03-06T09:15:23Z"
}
```

### GET /api/admin/cusip-cache/search?cusip=037833100

```json
{
  "id": "abc-123-def-456",
  "cusip": "037833100",
  "symbol": "AAPL",
  "source": "OPENFIGI",
  "resolvedAt": "2025-11-20T08:15:30Z",
  "lastUsedAt": "2026-03-01T12:45:00Z",
  "createdAt": "2025-11-20T08:15:30Z",
  "updatedAt": "2026-03-01T12:45:00Z"
}
```

## Notes

- This story enhances the basic caching from AR.8/AR.9
- Features are prioritized: Statistics > Management API > Cleanup > UI
- Can be split into multiple smaller stories if needed
- Cache warming is useful for testing and production initialization
- Audit logging helps debug incorrect symbol resolutions reported by users
  implements backend API infrastructure for cache management
- Features are prioritized: Statistics > Management API > Cleanup > Audit Logging
- Admin UI will be implemented in AR.11 with e2e tests
- Audit logging helps debug incorrect symbol resolutions reported by users
- Since the system primarily works with closed-end funds, cache warming is not needed
