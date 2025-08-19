# Epic E: Data and database

Goal: Safe data evolution and recovery.

## Story E1: Risk group seed and validation

Acceptance Criteria:

- Ensure risk groups exist before sync; seed script or runtime ensure.
- Unit test for ensure behavior.

## Story E2: Backup and restore guidance

## Story E3: Schema integrity and performance

Description: Add uniques and indexes, and plan a phased rename for the
misspelled field.

Acceptance Criteria:

- Unique on `universe.symbol` added after dedupe; unique on `risk_group.name`.
- Indexes: `universe(expired)`, `universe(risk_group_id)`,
  `screener(has_volitility, objectives_understood, graph_higher_before_2008)`,
  `screener(risk_group_id)`.
- Rename plan documented: `has_volitility` → `has_volatility` with 3‑phase
  migration plan and rollback steps.
Acceptance Criteria:

- Doc steps to back up SQLite db before rollout; restore procedure included.
