# Common failure scenarios and responses

- Too many symbols expired after a sync
  - Action: Set feature flag off. Restore the latest backup if needed.
  - Validate: Universe counts and sample symbols present. Trading views correct.

- Missing `risk_group` rows
  - Action: Re-run the seed path (runtime ensure) or insert rows manually.
  - Validate: Universe reads resolve risk group names.

- Endpoint/feature remains visible after toggle off
  - Action: Clear config cache, redeploy with updated envs, or remove UI flag.
  - Validate: UI and API are no-op for the sync action.
