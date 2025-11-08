# Story F1: API schema doc for sync endpoint

## Acceptance Criteria

- ✅ Document request/response schema and examples.
- ✅ Add to `docs/architecture.md` and cross-link in this backlog.

## Implementation

The API schema documentation for the sync endpoint has been added to the [Architecture document](../../architecture.md#api-schema-examples).

### API Endpoint

**POST** `/api/universe/sync-from-screener`

This endpoint synchronizes the universe records from the screener data based on specific selection criteria. Full documentation including request/response schemas, field descriptions, and error handling can be found in the [API schema section](../../architecture.md#api-schema-examples) of the architecture document.

### Key Features

- Returns detailed sync summary with correlation ID for tracking
- Includes log file path for debugging and audit purposes
- Feature flag controlled via `USE_SCREENER_FOR_UNIVERSE` environment variable
- Idempotent operation for safe repeated execution
