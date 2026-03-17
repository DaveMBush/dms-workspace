# Integration Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Browser (Angular SPA)                     │
│                                                             │
│  SmartNgRX Signals ──► HTTP Client ──► authInterceptor     │
│                                    ──► sortInterceptor     │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTPS / HTTP (same-origin in prod)
                         │ /api/** proxied in dev to :3000
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    Fastify Server (Node.js)                  │
│                                                             │
│  CORS → Rate Limit → CSRF → JWT Auth → Route Handler       │
│                                │                           │
│                                ▼                           │
│                      Prisma ORM (singleton)                │
└────────────────────────┬──────────────┬────────────────────┘
                         │              │
              ┌──────────▼──┐     ┌─────▼──────────┐
              │  SQLite DB  │     │  PostgreSQL DB  │
              │  (dev/e2e)  │     │  (Docker/prod)  │
              └─────────────┘     └────────────────┘
```

---

## Frontend ↔ Backend Communication

### Protocol

- All API calls use JSON over HTTP/HTTPS
- Endpoints are RESTful but follow the SmartNgRX `POST-by-IDs` pattern for entity loading
- Authentication: Bearer JWT in `Authorization` header (set by `authInterceptor`)
- CSRF: Token in `x-csrf-token` header (set by Angular `SecurityService`)
- Sort/filter state: Custom `x-table-state` header (set by `sortInterceptor`)

### Dev Proxy Configuration

In development, `proxy.conf.json` forwards requests from the Angular dev server (port 4201) to Fastify (port 3000):

```json
{
  "/api": {
    "target": "http://localhost:3000",
    "secure": false,
    "changeOrigin": true
  },
  "/health": {
    "target": "http://localhost:3000",
    "secure": false
  }
}
```

This allows the frontend to make same-origin requests in dev without CORS issues.

### Production Routing

In production, an API Gateway / CloudFront distribution routes:

- `GET /` and `/index.html` → S3 (Angular bundle)
- `/assets/**` → S3 (static assets)
- `/api/**` → App Runner / ECS (Fastify)

No proxy.conf needed — frontend and backend share the same origin.

---

## Authentication Flow

```
User opens app
     │
     ▼
Angular App bootstraps
     │
     ├── useMockAuth=true  ──► MockAuthService
     │                         Skip Cognito entirely
     │
     └── useMockAuth=false ──► AuthService (Amplify)
              │
              ▼
         AmplifyAuth.getCurrentUser()
              │ Not authenticated?
              ├──────────────► Redirect to /auth/login
              │
              │ Authenticated?
              ▼
         fetchAuthSession() → get JWT
              │
              ▼
         POST /api/auth/set-secure-cookie
              │ Server stores JWT in HTTP-only cookie
              ▼
         App fully loaded
```

### Token Lifecycle

```
HTTP Request (authInterceptor)
     │
     ▼
Get cached token (TokenCacheService)
     │ Token expired or absent?
     ├──► fetchAuthSession() from Amplify
     │    Refresh Cognito tokens
     │    Cache new token
     │
     ▼
Attach: Authorization: Bearer <token>

     │ 401 response?
     ├──► Refresh tokens (once)
     │    Retry original request
     │
     │ Still 401?
     └──► Redirect to /auth/login
```

---

## SmartNgRX Data Flow

The SmartNgRX library manages entity data with an optimized cache-miss loading pattern.

### Initial Bootstrap (`/api/top`)

```
Angular route activated (ShellComponent)
     │
     ▼
provideSmartFeatureSignalEntities('app', [top, accounts, universe, ...])
     │
     ▼
SmartNgRX detects 'top' entity not in store
     │
     ▼
TopEffectService.loadByIds(['top-1'])
     │
     ▼
POST /api/top  Body: ["top-1"]
     │
     ▼
Server returns Top: { accounts: ["id1","id2"], universes: [...], ... }
     │
     ▼
SmartNgRX stores Top, sees account IDs not in cache
     │
     ▼
AccountEffectService.loadByIds(["id1","id2"])
     │
     ▼
POST /api/accounts  Body: ["id1","id2"]
     │
     ▼
Accounts loaded, rendered in AccountComponent
```

### SmartNgRX Load-by-Indexes (Child Entities)

Used for loading trades/deposits per account:

```
User navigates to /account/:accountId
     │
     ▼
provideSmartFeatureSignalEntities('app', [openTrades, ...]) activated
     │
     ▼
SmartNgRX sees account.openTrades is array of IDs
     │
     ▼
TradeEffectService.loadByIndexes(accountId, 'openTrades')
     │
     ▼
POST /api/accounts/indexes  Body: { accountId, field: "openTrades", page: {...} }
     │
     ▼
Server returns page of Trade IDs
     │
     ▼
SmartNgRX fetches missing Trade entities via loadByIds
     │
     ▼
POST /api/trades  Body: ["tradeId1","tradeId2",...]
```

---

## Sort/Filter Header Protocol

### Frontend Side (`sortInterceptor`)

1. Before each HTTP request, `SortFilterStateService` is queried for all table states
2. State is serialized to JSON, base64-encoded, and added as `x-table-state` header
3. Field names are mapped (frontend → server): e.g., `buyDate → openDate`

```typescript
// In sortInterceptor:
const allState = sortFilterStateService.getAllState();
const encoded = btoa(JSON.stringify(allState));
return req.clone({
  headers: req.headers.set('x-table-state', encoded),
});
```

### Server Side

```typescript
// In route handler:
const allState = parseSortFilterHeader(request);
const tableState = getTableState(allState, 'trades-open');

const orderBy = tableState?.sort
  ? { [tableState.sort.field]: tableState.sort.direction }
  : { buy_date: 'desc' };

const trades = await prisma.trades.findMany({ orderBy, where: ... });
```

---

## File Import (Fidelity CSV)

```
User selects CSV file in UI
     │
     ▼
ImportDialogComponent reads file via FileReader API
     │
     ▼
FormData with file attached
     │
     ▼
POST /api/import  Content-Type: multipart/form-data
     │
     ▼
Fastify @fastify/multipart parses file stream
     │
     ▼
Server parses CSV rows:
  - Match symbol to universe entry
  - Create trade records
  - Skip duplicates
     │
     ▼
Response: { imported: N, skipped: M, errors: [] }
     │
     ▼
UI refreshes openTrades entity (SmartNgRX invalidate)
```

---

## External API Integration

### Yahoo Finance (Update Fields)

```
User triggers "Update from Yahoo Finance" in settings
     │
     ▼
POST /api/settings
     │
     ▼
Server iterates all active universe symbols
  For each symbol:
    Fetch distribution data from Yahoo Finance API
    Update universe record: last_price, distribution, ex_date
     │
     ▼
Long-polling response (may take 2-5 minutes for large watchlists)
Response: { updated: N, failed: M }
```

### cefconnect.com (Screener)

```
User opens /global/screener
     │
     ▼
POST /api/screener
     │
     ▼
Server fetches CEF data from cefconnect.com public API
Transforms response into screener row format
Upserts into screener table (cached)
     │
     ▼
Response streams screener rows to client
SmartNgRX stores screener entity rows
     │
     ▼
GlobalScreenerComponent renders table
```

---

## CUSIP Resolution Integration

CUSIP codes appear in Fidelity CSV exports. The server resolves CUSIPs to ticker symbols.

```
CSV import contains CUSIP (e.g., "12345678A")
     │
     ▼
Check cusip_cache table
     │ Found?
     ├──► Return cached symbol, update lastUsedAt
     │
     │ Not found?
     └──► Query OpenFIGI API: POST https://api.openfigi.com/v3/mapping
               │ Found?
               ├──► Cache result (source=OPENFIGI), return symbol
               │
               │ Not found in OpenFIGI?
               └──► Query Yahoo Finance symbol search
                         │ Found?
                         ├──► Cache result (source=YAHOO_FINANCE)
                         │
                         │ Still not found?
                         └──► Log to cusip_cache_audit, return null
```

---

## WebSocket / Real-Time

There is **no WebSocket** or real-time push in this application. All data is fetched on demand via SmartNgRX `loadByIds` calls.

For "live" updates to prices and distributions, the user manually triggers `POST /api/settings` to refresh from Yahoo Finance.

---

## Security Integration Points

### CORS

Backend enforces CORS:

- Dev: all `localhost:*` origins allowed
- Production: explicit `ALLOWED_ORIGINS` env var checked by `corsOriginHandler`
- Credentials: `true` required for cookie-based JWT transport

### CSP (Content Security Policy)

Fastify sets CSP header on every response:

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'nonce-<random>';
  style-src 'self' 'unsafe-inline';
  connect-src 'self' https://cognito-idp.us-east-1.amazonaws.com;
  img-src 'self' data:;
  frame-ancestors 'none';
```

### HSTS

```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

Set in production only (not in dev to avoid issues with HTTP).

---

## Database Connection

### Local Dev (SQLite)

```typescript
const adapter = new PrismaBetterSqlite3(new Database('./prisma/database.db', { fileMustExist: false }));
const prisma = new PrismaClient({ adapter });
```

SQLite WAL mode enabled for better concurrent reads.

### Production (PostgreSQL)

```typescript
// DATABASE_URL loaded from SSM
const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } },
});
```

Connection pool managed by Prisma (default 10 connections for PostgreSQL).

### Connection Retry Logic (`connectWithRetry`)

```typescript
async function connectWithRetry(maxAttempts = 5) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      await prisma.$connect();
      return;
    } catch (e) {
      if (i === maxAttempts - 1) throw e;
      await sleep(1000 * 2 ** i); // Exponential backoff
    }
  }
}
```
