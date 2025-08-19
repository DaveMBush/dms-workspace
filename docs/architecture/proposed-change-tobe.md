# Proposed change (to‑be)

Create a backend sync that derives Universe from curated Screener.

## Selection criteria

Use all `screener` rows where these are true:

- `has_volitility`
- `objectives_understood`
- `graph_higher_before_2008`

For each selected row:

- Ensure `risk_group_id` is set (already populated in Screener flow).
- Upsert into `universe` with fields:
  - `symbol`, `risk_group_id`
  - `distribution`, `distributions_per_year`, `ex_date`
    - Prefer values from Yahoo via `getDistributions(symbol)` to keep
      consistency with existing Universe flows (`settings` routes).
  - `last_price` via `getLastPrice(symbol)`
  - Reset `most_recent_sell_date` only for new inserts; do not reset for
    existing rows to preserve trading history.
  - Set `expired=false`.

Non‑selected symbols handling:

- Mark any `universe.symbol` not in the selected Screener set as `expired=true`.
- Do not delete; keep for history.

## New API

- POST `/api/universe/sync-from-screener`
  - Body: none.
  - Behavior: Implements the selection criteria, upserts the Universe, marks
    non‑selected as expired, returns summary.
  - Idempotent: Running multiple times yields the same result.
  - Feature flag: Only active when `USE_SCREENER_FOR_UNIVERSE=true`.

## API schema (examples)

- Request
  - Method: POST
  - Path: `/api/universe/sync-from-screener`
  - Headers: `Content-Type: application/json`
  - Body: `{}` (empty object) or no body

- 200 OK

```json
{
  "inserted": 12,
  "updated": 34,
  "markedExpired": 5,
  "selectedCount": 46
}
```

- 403 Forbidden (feature disabled)

```json
{
  "error": "Feature disabled",
  "inserted": 0,
  "updated": 0,
  "markedExpired": 0,
  "selectedCount": 0
}
```

- 500 Internal Server Error

```json
{
  "error": "Internal server error"
}
```

Notes:

- Idempotent: multiple calls with unchanged Screener state return the same
  counts.
- Do not cache responses; clients should treat this as a command.
- Apply server-side rate limiting to prevent accidental hammering.

## Frontend changes

- `UniverseSettingsComponent` dialog:
  - Keep current controls for manual entry (as fallback).
  - Add a button "Use Screener" that calls the new POST endpoint.
  - After completion, close dialog and refresh relevant stores.

No changes to Universe read paths are required; consumers already read
`expired` and other fields.
