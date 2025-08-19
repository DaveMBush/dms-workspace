# Testing plan

- Unit
  - Selector that builds the set of eligible Screener ids.
  - Upsert function maps fields correctly and preserves history.
  - Expire function only marks symbols not present.

- Integration (server)
  - Seed `risk_group`, `screener`, `universe` records, run sync, assert
    upserted rows and expirations. Re‑run to verify idempotency.

- E2E (UI)
  - Button triggers POST, dialog progress indicator shows, stores refresh.
