# API Contracts

All routes are served by the Fastify backend. Routes under `apps/server/src/app/routes/` are auto-loaded with `/api` prefix. Feature flags are served at the root (`/`).

## Common Conventions

### SmartNgRX Load-by-IDs Pattern

All SmartNgRX entities follow this contract for fetching data:

```
POST /api/<entity>
Content-Type: application/json
Body: string[]    // Array of entity IDs

Response 200: <Entity>[]   // Array of full entity objects
```

The frontend sends IDs it needs to resolve; the server returns the corresponding objects.

### Sort/Filter State Header

For routes that support server-side sorting/filtering, the frontend sends table state in a custom header:

```
x-table-state: <base64-encoded JSON>
```

Decoded JSON structure:

```typescript
type AllTableState = Record<string, TableState>;

interface TableState {
  sort?: { field: string; direction: 'asc' | 'desc' };
  filters?: Record<string, string>;
  page?: { index: number; size: number };
}
```

Example: `{ "trades-open": { "sort": { "field": "buyDate", "direction": "desc" } } }`

### Standard Entity Shape

All entities share common fields:

```typescript
{
  id: string;           // CUID
  createdAt: string;    // ISO 8601
  updatedAt: string;    // ISO 8601
  deletedAt?: string;   // Present if soft-deleted
  version: number;      // Optimistic concurrency version
}
```

---

## Feature Flags

### `GET /`

Returns feature flags object. No auth required.

**Response 200**:

```json
{
  "useScreenerForUniverse": true
}
```

---

## Health

### `GET /health`

Basic health check. No auth required.

**Response 200**:

```json
{ "status": "ok" }
```

### `GET /health/detailed`

Detailed health including database connectivity. No auth required.

**Response 200**:

```json
{
  "status": "ok",
  "database": "connected",
  "uptime": 12345,
  "version": "1.0.0"
}
```

---

## CSRF

### `GET /api/csrf-token`

Get a new CSRF token. Excluded from auth validation. Must be called before any mutating request.

**Response 200**:

```json
{ "csrfToken": "abc123..." }
```

Token must be sent in subsequent POST/PUT/DELETE requests as header: `x-csrf-token: <token>`

---

## Auth

All `/api/auth/**` routes require CSRF token but are excluded from JWT auth.

### `POST /api/auth/set-secure-cookie`

Store JWT access token in HTTP-only Secure cookie.

**Request Body**:

```json
{ "accessToken": "<jwt>", "refreshToken": "<jwt>" }
```

**Response 200**: `{ "success": true }`

### `POST /api/auth/clear-cookies`

Clear all auth cookies (logout).

**Response 200**: `{ "success": true }`

### `POST /api/auth/revoke-token`

Add current JWT to blacklist (server-side logout).

**Response 200**: `{ "success": true }`

---

## Bootstrap

### `POST /api/top`

Bootstrap endpoint — returns IDs of all top-level entity collections. Called once on app init by the `TopEffectService`.

**Request Body**: `string[]` (Top entity IDs — typically `["top-1"]`)

**Response 200**:

```typescript
[{
  id: string;
  accounts: string[];             // Account IDs
  universes: string[];            // Universe entry IDs
  riskGroups: string[];           // RiskGroup IDs
  divDepositTypes: string[];      // DivDepositType IDs
  holidays: string[];             // Holiday date strings
  screens: Screen[];              // Full screener row objects (small collection)
}]
```

---

## Accounts

### `POST /api/accounts`

Load accounts by IDs.

**Request Body**: `string[]`

**Response 200**:

```typescript
[{
  id: string;
  name: string;
  openTrades: string[];           // Trade IDs (lazy-loaded separately)
  soldTrades: string[];
  divDeposits: string[];
  months: { month: number; year: number }[];
  createdAt: string; updatedAt: string; version: number;
}]
```

### `PUT /api/accounts`

Update account.

**Request Body**: Full account object including `id` and `version`.

**Response 200**: Updated account object.

**Response 409**: Version conflict (optimistic lock failure).

### `POST /api/accounts/add`

Create new account.

**Request Body**:

```json
{ "name": "Fidelity IRA" }
```

**Response 201**: New account object.

### `DELETE /api/accounts/:id`

Soft-delete account and all child entities (cascading soft-delete).

**Response 200**: `{ "success": true }`

### `POST /api/accounts/indexes`

Load paginated child entities for an account. Used by SmartNgRX `loadByIndexes`.

**Request Body**:

```json
{
  "accountId": "<account-id>",
  "field": "openTrades",
  "page": { "index": 0, "size": 50 }
}
```

**Response 200**: Array of child entity IDs (strings).

---

## Universe (CEF Watchlist)

### `POST /api/universe`

Load universe entries by IDs.

**Request Body**: `string[]`

**Response 200**:

```typescript
[{
  id: string;
  symbol: string;
  distribution: number;           // Distribution per payment (dollars)
  distributions_per_year: number; // Payment frequency (12 = monthly)
  last_price: number;
  most_recent_sell_date?: string;
  most_recent_sell_price?: number;
  ex_date?: string;               // Next ex-dividend date
  risk_group_id: string;
  expired: boolean;               // Soft-inactive flag
  is_closed_end_fund: boolean;
  name?: string;
  avg_purchase_yield_percent?: number;
  position?: number;              // Total shares held
  createdAt: string; updatedAt: string; version: number;
}]
```

### `PUT /api/universe`

Update universe entry.

**Request Body**: Full universe object with `id` and `version`.

**Response 200**: Updated universe object.

### `POST /api/universe/add-symbol`

Add new symbol to universe.

**Request Body**:

```json
{
  "symbol": "UTF",
  "risk_group_id": "<risk-group-id>",
  "is_closed_end_fund": true
}
```

**Response 201**: New universe object.

### `DELETE /api/universe/:id`

Soft-delete universe entry.

**Response 200**: `{ "success": true }`

### `GET /api/universe/all`

Return all non-expired universe entries (used for autocomplete).

**Response 200**: `Universe[]`

### `POST /api/universe/sync-from-screener`

Copy matching data from screener rows into universe records.
Matches by symbol name. Updates `distribution`, `distributions_per_year`, `last_price`.

**Request Body**: `{}` (no body required)

**Response 200**: `{ "updated": 42 }`

---

## Trades

### `POST /api/trades`

Load trades by IDs.

**Request Body**: `string[]`

**Response 200**:

```typescript
[{
  id: string;
  universeId: string;
  accountId: string;
  buy: number;                  // Buy price per share
  sell?: number;                // Sell price (if closed)
  buy_date: string;             // ISO date
  sell_date?: string;
  quantity: number;
  createdAt: string; updatedAt: string; version: number;
}]
```

### `GET /api/trades/open`

All open trades (no sell_date). Supports sort/filter header.

**Response 200**: `Trade[]`

### `GET /api/trades/closed`

All closed trades. Supports sort/filter header.

**Response 200**: `Trade[]`

---

## Screener

### `POST /api/screener`

Fetch and cache fresh screener data from cefconnect.com.

**Request Body**: `{}` or `{ "forceRefresh": true }`

**Response 200**: `{ "rows": number, "updated": string }`

### `POST /api/screener/rows`

Load screener rows by IDs.

**Request Body**: `string[]`

**Response 200**:

```typescript
[{
  id: string;
  symbol: string;
  distribution?: number;
  distribution_rate?: number;
  distributions_per_year?: number;
  has_volitility: boolean;
  objectives_understood: boolean;
  graph_higher_before_2008: boolean;
  premium_discount?: number;
  ytd_return?: number;
  category?: string;
  createdAt: string; updatedAt: string;
}]
```

---

## Summary

### `GET /api/summary`

Portfolio-wide aggregated summary.

**Response 200**:

```typescript
{
  totalInvested: number;
  totalValue: number;
  totalDistributions: number;
  totalUnrealizedGain: number;
  totalRealizedGain: number;
  averageYield: number;
}
```

### `GET /api/summary/graph`

Monthly distribution data for charting.

**Query params**: `year=2024&month=12` (optional filters)

**Response 200**:

```typescript
[{ month: number; year: number; total: number; }]
```

### `GET /api/summary/years`

Available years with data.

**Response 200**: `number[]` e.g. `[2021, 2022, 2023, 2024]`

### `GET /api/summary/months`

Available months for a given year.

**Query params**: `year=2024`

**Response 200**: `number[]` e.g. `[1, 2, 3, 4, 5, 6]`

---

## Settings (Yahoo Finance Update)

### `POST /api/settings`

Trigger bulk update of universe entries from Yahoo Finance (distribution data, prices). Long-running — up to several minutes.

**Request Body**: `{}` or `{ "symbols": string[] }` (omit for all)

**Response 200**: `{ "updated": 47, "failed": 2 }`

### `PUT /api/settings/update`

Update individual settings record.

**Request Body**: Settings object.

**Response 200**: Updated settings object.

---

## Dividend Deposits

### `POST /api/div-deposits`

Load dividend deposits by IDs.

**Request Body**: `string[]`

**Response 200**: `DivDeposit[]`

### `PUT /api/div-deposits`

Update dividend deposit.

**Request Body**: Full deposit object.

**Response 200**: Updated deposit.

---

## Dividend Deposit Types

### `POST /api/div-deposit-types`

Load deposit types by IDs.

**Request Body**: `string[]`

**Response 200**: `DivDepositType[]`

---

## Risk Groups

### `POST /api/risk-group`

Load risk groups by IDs.

**Request Body**: `string[]`

**Response 200**:

```typescript
[{
  id: string;
  name: string;           // e.g. "Equities", "Income", "Tax Free Income"
  color?: string;         // CSS color string
  createdAt: string; updatedAt: string; version: number;
}]
```

### `PUT /api/risk-group`

Update risk group.

**Request Body**: Full risk group with `id` and `version`.

**Response 200**: Updated risk group.

---

## Import

### `POST /api/import`

Import a Fidelity account export CSV file. Parses positions and creates/updates trade records.

**Request**: `multipart/form-data` with field `file` containing the CSV file.

**Response 200**:

```json
{
  "imported": 23,
  "skipped": 5,
  "errors": []
}
```

---

## Symbol Search

### `GET /api/symbol/search`

Search for CEF symbols (from universe) matching a query string.

**Query params**: `q=<search-term>`

**Response 200**:

```typescript
[{
  id: string;
  symbol: string;
  name?: string;
  distribution: number;
  risk_group_id: string;
}]
```

---

## Logs

### `GET /api/logs`

List available server log files.

**Response 200**: `[{ "filename": "app-2024-01-15.log", "size": 12345, "modified": "<ISO>" }]`

### `DELETE /api/logs/:filename`

Delete a specific log file.

**Response 200**: `{ "success": true }`

---

## Admin — CUSIP Cache

### `GET /api/admin/cusip-cache`

List all CUSIP cache entries.

**Response 200**:

```typescript
[{
  cusip: string;
  symbol: string;
  source: "OPENFIGI" | "YAHOO_FINANCE";
  resolvedAt: string;
  lastUsedAt: string;
}]
```

### `POST /api/admin/cusip-cache`

Manually add or refresh a CUSIP cache entry.

**Request Body**:

```json
{ "cusip": "12345678A", "symbol": "UTF", "source": "OPENFIGI" }
```

**Response 201**: New cache entry.

---

## Error Response Format

All error responses follow RFC 7807 Problem Details (via `@fastify/sensible`):

```json
{
  "statusCode": 404,
  "error": "Not Found",
  "message": "Universe entry with id 'xyz' not found"
}
```

Common status codes:

- `400` — Bad request / validation error
- `401` — Missing or invalid JWT
- `403` — CSRF token invalid
- `404` — Resource not found
- `409` — Optimistic lock version conflict
- `429` — Rate limit exceeded
- `500` — Internal server error
