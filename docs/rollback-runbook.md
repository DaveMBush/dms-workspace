# Rollback Runbook: Screener → Universe Sync (Brownfield)

This runbook describes how to quickly disable the Screener-driven Universe sync,
verify system health, and recover data if needed.

## Scope

- Feature controlled by env var `USE_SCREENER_FOR_UNIVERSE`.
- Universe remains fully manageable via the existing manual Settings flow.

## Preconditions

- Access to the deployment environment and logs.
- Ability to set environment variables and restart the server.
- SQLite database file location known (`DATABASE_URL`).

## Quick disable (feature toggle)

### Emergency Disable (< 2 minutes)

**Production Environment:**
1. Set `USE_SCREENER_FOR_UNIVERSE=false` in production environment variables
2. Restart the server process (or container restart for containerized deployments)
3. Verify disable immediately:
   - Check `/api/feature-flags` endpoint returns `useScreenerForUniverse: false`
   - Confirm UI button is hidden in Universe Settings dialog
   - Test that POST `/api/universe/sync-from-screener` returns 404 or forbidden

**Development/Local Environment:**
1. Update `.env` file: `USE_SCREENER_FOR_UNIVERSE=false`
2. Restart development server (`npm run dev` or equivalent)
3. Verify feature flag status in application

**Docker/Container Environment:**
1. Update environment variables in container orchestration (Docker Compose, Kubernetes, etc.)
2. Restart container: `docker-compose restart rms-server` (or equivalent)
3. Verify container logs show feature flag as disabled

### Verification of Disable

**Required checks after disable:**
- [ ] Universe Settings dialog shows only manual input fields
- [ ] "Use Screener" button is not visible in UI
- [ ] Manual Universe management works correctly
- [ ] No automatic sync operations occur

> **📖 For detailed configuration instructions, see [Feature Flag Configuration](./configuration/feature-flags.md)**

> **📖 For detailed configuration instructions, see [Feature Flag Configuration](../configuration/feature-flags.md)**

## Verification checklist

### Manual Universe Management Verification

**UI Functionality:**
- [ ] Universe Settings dialog opens correctly
- [ ] All manual input fields are visible and functional:
  - [ ] Symbol input field accepts ticker symbols
  - [ ] Risk group dropdown populated with options
  - [ ] Add/Update buttons respond correctly
  - [ ] Delete functionality works for existing symbols
- [ ] Universe table renders completely:
  - [ ] All columns display (Symbol, Risk Group, Last Price, etc.)
  - [ ] Sorting works on all columns
  - [ ] Filtering (if implemented) functions correctly
  - [ ] Pagination works if enabled
- [ ] No "Use Screener" button visible anywhere in Universe Settings
- [ ] Manual Universe updates persist after refresh

**API Endpoints:**
- [ ] POST `/api/settings` responds correctly for Universe updates
- [ ] GET `/api/settings/update` returns current Universe configuration
- [ ] POST `/api/universe` (load by ids) functions for manual Universe management
- [ ] Feature flag endpoint `/api/feature-flags` returns `useScreenerForUniverse: false`
- [ ] POST `/api/universe/sync-from-screener` is properly blocked (404/403 response)

**Database Integrity:**
- [ ] No unexpected spikes in `universe.expired = true` counts after rollback
- [ ] `risk_group` table contains required rows:
  - [ ] "Equities" risk group exists
  - [ ] "Income" risk group exists  
  - [ ] "Tax Free Income" risk group exists
- [ ] Universe table data integrity:
  - [ ] No orphaned records (missing risk_group references)
  - [ ] Symbol data is complete and accurate
  - [ ] Historical data preserved (updatedAt, createdAt timestamps)

### System Health Verification

**Performance:**
- [ ] Universe page loads within acceptable time (< 2 seconds)
- [ ] Manual Universe operations complete promptly
- [ ] No memory leaks or excessive resource usage
- [ ] Database queries perform efficiently

**Logging:**
- [ ] No error logs related to disabled feature
- [ ] Manual Universe operations log correctly
- [ ] Feature flag status logged appropriately
- [ ] No background sync attempts logged

## Universe Integrity Validation Checklist

### Data Consistency Checks

**Pre-Rollback Snapshot:**
- [ ] Document current Universe count: `SELECT COUNT(*) FROM universe`
- [ ] Document active symbols: `SELECT COUNT(*) FROM universe WHERE expired = false`
- [ ] Document risk group distribution: `SELECT risk_group_id, COUNT(*) FROM universe GROUP BY risk_group_id`
- [ ] Save timestamp of last successful sync (if any)

**Post-Rollback Validation:**
- [ ] Verify Universe count matches pre-rollback (within expected delta)
- [ ] Confirm no mass expiration occurred:
  - [ ] Active symbols count should be stable
  - [ ] No more than 5% change in active Universe symbols
- [ ] Risk group distribution remains consistent
- [ ] All symbols have valid risk_group_id references

**Symbol-Level Validation:**
- [ ] Sample 10 random symbols and verify:
  - [ ] Symbol format is valid (uppercase, proper ticker format)
  - [ ] Risk group assignment is appropriate
  - [ ] Last price data is reasonable (> 0, not null)
  - [ ] Updated timestamps are within expected range
- [ ] Check for duplicate symbols: `SELECT symbol, COUNT(*) FROM universe GROUP BY symbol HAVING COUNT(*) > 1`
- [ ] Verify no null values in critical fields:
  - [ ] `symbol` field has no null values
  - [ ] `risk_group_id` field has no null values

**Trading Data Integrity:**
- [ ] Historical trading data preserved (if applicable)
- [ ] Position data remains linked to correct Universe symbols
- [ ] Account balances and holdings are accurate
- [ ] No orphaned trade records

### Functional Validation Tests

**Manual Universe Operations:**
- [ ] Add new symbol manually - verify successful creation
- [ ] Update existing symbol risk group - verify change persists
- [ ] Delete symbol manually - verify proper removal
- [ ] Bulk operations work correctly (if implemented)

**Data Refresh and Synchronization:**
- [ ] Manual data refresh completes successfully
- [ ] Price updates work for manually managed symbols
- [ ] Risk calculations use correct Universe data
- [ ] Reports and analytics reflect current Universe state

**Edge Case Testing:**
- [ ] Add symbol with special characters (if allowed)
- [ ] Test with maximum symbol length
- [ ] Verify error handling for invalid symbols
- [ ] Test concurrent Universe modifications

### Recovery Validation

**If Data Issues Found:**
- [ ] Stop all Universe operations immediately
- [ ] Assess scope of data corruption
- [ ] Determine if backup restore is necessary
- [ ] Document specific issues for future prevention
- [ ] Test backup restoration procedure if needed

**Post-Recovery Validation:**
- [ ] Re-run all integrity checks after any restoration
- [ ] Verify manual Universe management fully functional
- [ ] Confirm no data loss in critical business operations
- [ ] Update incident documentation with lessons learned

## Backup and restore (SQLite)

- Backup
  - Stop the server.
  - Copy the SQLite file (path from `DATABASE_URL`).
  - Store backup with timestamp.

- Restore
  - Stop the server.
  - Replace the SQLite file with the backup copy.
  - Start the server.

## Rollback Verification Procedures

### Step-by-Step Rollback Process

**Phase 1: Pre-Rollback Assessment (5 minutes)**
1. [ ] Document current system state:
   - [ ] Feature flag status: `curl /api/feature-flags | grep useScreenerForUniverse`
   - [ ] Universe count: `SELECT COUNT(*) FROM universe WHERE expired = false`
   - [ ] Last sync timestamp (if available in logs)
   - [ ] Current active user sessions
2. [ ] Identify rollback trigger (performance issue, data corruption, user report)
3. [ ] Estimate rollback impact and timeline
4. [ ] Notify relevant stakeholders of planned rollback

**Phase 2: Execute Rollback (2 minutes)**
1. [ ] Set `USE_SCREENER_FOR_UNIVERSE=false` in environment
2. [ ] Restart server/container
3. [ ] Verify restart successful (check health endpoint)
4. [ ] Confirm feature flag disabled: `curl /api/feature-flags`

**Phase 3: Immediate Verification (10 minutes)**
1. [ ] Run Manual Universe Management Verification checklist (above)
2. [ ] Test critical Universe operations:
   - [ ] Add test symbol manually
   - [ ] Update existing symbol
   - [ ] Delete test symbol
3. [ ] Verify UI shows no "Use Screener" functionality
4. [ ] Check application logs for errors

**Phase 4: Full Integrity Check (15 minutes)**
1. [ ] Run complete Universe Integrity Validation Checklist (above)
2. [ ] Compare pre/post rollback data counts
3. [ ] Test end-to-end user workflows
4. [ ] Verify trading operations unaffected

**Phase 5: Post-Rollback Monitoring (24 hours)**
1. [ ] Monitor application logs for related errors
2. [ ] Track Universe management operations success rate
3. [ ] Monitor user feedback and support tickets
4. [ ] Document any issues discovered post-rollback

### Success Criteria for Rollback

**Immediate Success (within 15 minutes):**
- [ ] Feature flag successfully disabled
- [ ] Manual Universe management fully functional
- [ ] No critical errors in application logs
- [ ] UI properly reflects manual-only mode
- [ ] All integrity checks pass

**Sustained Success (24 hours):**
- [ ] No increase in Universe-related support tickets
- [ ] Manual operations perform within normal parameters
- [ ] No data corruption detected
- [ ] System performance remains stable

### Common failure scenarios and responses

**Too many symbols expired after a sync:**
- **Detection:** Universe count drops significantly, user reports missing symbols
- **Immediate Action:** 
  1. [ ] Set feature flag off immediately
  2. [ ] Stop all Universe operations
  3. [ ] Assess data loss scope
- **Recovery Action:** Restore latest backup if > 10% symbol loss
- **Validation:** Universe counts and sample symbols present, trading views correct

**Missing `risk_group` rows:**
- **Detection:** Universe operations fail, foreign key errors in logs
- **Immediate Action:**
  1. [ ] Check risk_group table: `SELECT * FROM risk_group`
  2. [ ] Verify expected groups exist: Equities, Income, Tax Free Income
- **Recovery Action:** Re-run seed path (runtime ensure) or insert rows manually
- **Validation:** Universe reads resolve risk group names correctly

**Endpoint/feature remains visible after toggle off:**
- **Detection:** UI still shows "Use Screener" button, API endpoints remain active
- **Immediate Action:**
  1. [ ] Clear application cache
  2. [ ] Force browser refresh (Ctrl+F5)
  3. [ ] Verify environment variables applied
- **Recovery Action:** Redeploy with updated environment variables or remove UI flag
- **Validation:** UI and API are no-op for sync action, feature flag API returns false

**Database performance degradation:**
- **Detection:** Slow Universe operations, high query times
- **Immediate Action:**
  1. [ ] Check database locks: `.schema universe` in SQLite
  2. [ ] Monitor active connections
  3. [ ] Review recent query patterns
- **Recovery Action:** Restart database connection pool, optimize queries
- **Validation:** Universe operations complete within 2 seconds

## Monitoring and logs

- Check for errors related to:
  - Yahoo requests (network, rate limits).
  - Prisma upserts and transactions.
  - Unusual counts of `expired=true` in `universe`.

- Suggested alerts
  - High failure rate for sync action.
  - Large delta in expired symbols compared to previous successful run.

## Roll-forward plan (re-enable safely)

1) Enable `USE_SCREENER_FOR_UNIVERSE=true` in non-prod.
2) Run the sync and validate:
   - Inserted/updated/expired counts are expected.
   - Trading screens show consistent positions and histories.
3) Enable in prod during a low-traffic window; keep manual flow available.
4) Monitor logs for 24 hours; be ready to toggle off quickly if needed.

## Notes on schema migrations (if applied)

- Migrations must be reversible.
- For the typo rename (`has_volitility` → `has_volatility`), use a 3-phase
  migration with backfill and only drop the old column after the code switches.
- For `universe.symbol` unique, dedupe first (keep newest by `updatedAt`).

## Incident communication

- Document the issue, the rollback time, and the verification outcomes.
- Log follow-ups: test gaps, monitoring thresholds, additional guardrails.
