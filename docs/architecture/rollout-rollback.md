# Rollout & rollback

- Default off behind `USE_SCREENER_FOR_UNIVERSE=false`.
- Enable in non‑prod, validate parity with current manual list.
- Enable in prod; keep manual path as fallback.
- Rollback by toggling the flag off.

See detailed procedures in the [Rollback runbook](./rollback-runbook.md).
