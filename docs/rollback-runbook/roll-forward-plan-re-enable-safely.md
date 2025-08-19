# Roll-forward plan (re-enable safely)

1) Enable `USE_SCREENER_FOR_UNIVERSE=true` in non-prod.
2) Run the sync and validate:
   - Inserted/updated/expired counts are expected.
   - Trading screens show consistent positions and histories.
3) Enable in prod during a low-traffic window; keep manual flow available.
4) Monitor logs for 24 hours; be ready to toggle off quickly if needed.
