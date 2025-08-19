# Notes on schema migrations (if applied)

- Migrations must be reversible.
- For the typo rename (`has_volitility` → `has_volatility`), use a 3-phase
  migration with backfill and only drop the old column after the code switches.
- For `universe.symbol` unique, dedupe first (keep newest by `updatedAt`).
