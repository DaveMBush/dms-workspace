# Verification checklist

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
