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

1) Set `USE_SCREENER_FOR_UNIVERSE=false` in the server environment.
2) Restart the server to apply the change.
3) Confirm the new sync action is not accessible (UI button hidden or disabled,
   endpoint guarded if present in future).

## Verification checklist

- UI
  - Universe Settings dialog still shows manual fields and can update universe.
  - Universe table renders and sorts as before.

- API
  - Manual endpoints respond as expected:
    - POST `/api/settings`
    - GET `/api/settings/update`
    - POST `/api/universe` (load by ids)

- Database
  - No unexpected spikes in `universe.expired = true` counts after rollback.
  - `risk_group` rows intact (`Equities`, `Income`, `Tax Free Income`).

## Backup and restore (SQLite)

- Backup
  - Stop the server.
  - Copy the SQLite file (path from `DATABASE_URL`).
  - Store backup with timestamp.

- Restore
  - Stop the server.
  - Replace the SQLite file with the backup copy.
  - Start the server.

## Common failure scenarios and responses

- Too many symbols expired after a sync
  - Action: Set feature flag off. Restore the latest backup if needed.
  - Validate: Universe counts and sample symbols present. Trading views correct.

- Missing `risk_group` rows
  - Action: Re-run the seed path (runtime ensure) or insert rows manually.
  - Validate: Universe reads resolve risk group names.

- Endpoint/feature remains visible after toggle off
  - Action: Clear config cache, redeploy with updated envs, or remove UI flag.
  - Validate: UI and API are no-op for the sync action.

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
