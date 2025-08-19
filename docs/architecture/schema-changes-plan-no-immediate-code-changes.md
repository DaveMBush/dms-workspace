# Schema changes plan (no immediate code changes)

These changes improve integrity and performance; apply via migrations after
review. A phased approach avoids downtime and allows safe rollback.

- Unique constraints
  - Add unique on `universe.symbol` (dedupe first; see below).
  - Add unique on `risk_group.name` to prevent duplicates.

- Indexes
  - `universe`: index on `expired`, index on `risk_group_id`.
  - `screener`: composite index on
    `(has_volitility, objectives_understood, graph_higher_before_2008)` and
    an index on `risk_group_id`.

- Phased rename (typo)
  - Field: `screener.has_volitility` → `has_volatility`.
  - Phase 1: Add new column `has_volatility` nullable, backfill from
    `has_volitility`, keep both updated in code (toggle via feature flag).
  - Phase 2: Switch reads/writes to `has_volatility` in code.
  - Phase 3: Backfill verification, drop `has_volitility` column.

- Dedupe plan for `universe.symbol`
  - Report current duplicates with a query and decide retention rule
    (keep most recent `updatedAt`).
  - Mark others as expired or archive before adding the unique.

- Rollback
  - Each migration must be reversible; document how to drop unique/indexes
    and how to restore the old column if needed.
