# Acceptance criteria

- Triggering the sync (spec) updates `universe` by selecting all `screener`
  rows with the three booleans set to true.
- Existing `universe` rows for selected symbols are updated (fields from
  Yahoo) but keep historical trading data; non‑selected rows are marked
  `expired=true` and are not deleted.
- Operation is idempotent; re‑running produces no change if inputs unchanged.
- Feature is disabled by default and is enabled only via
  `USE_SCREENER_FOR_UNIVERSE=true`.
- Manual universe entry remains available and unchanged.
