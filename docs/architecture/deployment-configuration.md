# Deployment & configuration

- Env
  - `DATABASE_URL` (existing)
  - `USE_SCREENER_FOR_UNIVERSE` (new)

- Scheduling
  - Run GET `/api/screener` on a schedule (e.g., daily) to refresh sources.
  - The user can invoke the sync on demand from the UI.
