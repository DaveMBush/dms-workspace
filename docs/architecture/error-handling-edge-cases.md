# Error handling & edge cases

- Missing `risk_group` rows: ensure via existing `ensureRiskGroupsExist()`.
- Distribution unavailable: upsert with existing values; do not block sync.
- Network failures to Yahoo: retry/backoff similar to current flows; partial
  updates allowed, and a later `settings/update` call can catch up.
- Concurrency: wrap upserts and mark‑expired in a transaction.
