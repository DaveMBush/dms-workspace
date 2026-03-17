# Backend Architecture — server

## Application Bootstrap

**Entry point**: `apps/server/src/main.ts`

### Startup Sequence

```
1. validateEnvironmentVariables()   — Check all required env vars
2. initializeDatabaseUrl()          — Build DATABASE_URL from parts if not set directly
3. connectWithRetry()               — Try DB connection up to 5 times with exponential backoff
4. buildFastifyApp()                — Create and configure Fastify instance
5. fastify.listen({ port: 3000 })   — Start listening
6. SIGTERM/SIGINT handlers          — Graceful shutdown (close DB, drain connections)
```

**Port**: 3000 (dev) / from `PORT` env var
**Request timeout**: 28,800,000 ms (8 hours) — required for long-running Update Fields operations

---

## Fastify Application (`app.ts`)

### Plugin Registration

```typescript
// Registered in order:
await app.register(cors); // @fastify/cors
await app.register(cookie); // @fastify/cookie
await app.register(multipart); // @fastify/multipart
await app.register(sensible); // @fastify/sensible
await app.register(security); // Custom: CSRF, rate-limit, CSP, audit
await app.register(auth); // Custom: JWT preHandler
await app.register(autoload, {
  // Routes under /api
  dir: path.join(__dirname, 'routes'),
  options: { prefix: '/api' },
  ignoreFilter: (path) => path.includes('feature-flags'),
});
// Feature flags registered manually — no /api prefix:
await app.register(featureFlags); // Serves at GET /
```

---

## Plugin Details

### Auth Plugin (`plugins/auth.ts`)

- Adds a Fastify `preHandler` hook to all `routes/` routes
- Protected routes: all `/api/**` except `/api/csrf-token`, `/api/health`, `/api/health/detailed`
- Calls `authenticateJwt(request, reply)` — validates JWT from `Authorization: Bearer` header
- On success: sets `request.user = { sub, email, groups }` (FastifyRequest augmented)
- On failure: replies `401 Unauthorized`

### CORS Plugin (`plugins/cors.ts`)

- Production origin allowlist checked by `corsOriginHandler.function.ts`
- Dev: any `localhost` origin allowed
- Exposed headers include `x-table-state` (sort/filter response header)
- Credentials: `true` (required for cookie-based auth)

### Security Plugin (`plugins/security.ts`)

- **CSRF protection**: Token in `x-csrf-token` header; validated on mutating requests (POST, PUT, DELETE, PATCH)
  - `GET /api/csrf-token` returns a new token
  - `csrfTokenStore` is an in-memory `Map<token, expiresAt>`
- **Rate limiting**: Per-route config via `rate-limit-configs.constant.ts`; in-memory store per IP
  - Default: 100 req/15min
  - Auth routes: 10 attempts/15min
  - Import: 5 req/hour
- **Content Security Policy**: Set via `security-headers.function.ts` on every response
- **Audit logging**: `AuditLogService` records security events (auth failures, rate limit hits)

### JWT Authentication (`middleware/authenticate-jwt.function.ts`)

```typescript
async function authenticateJwt(request, reply) {
  const token = extractTokenFromHeader(request.headers.authorization);
  const payload = await validateJwtToken(token); // verify RS256 via JWKS
  request.user = extractUserFromPayload(payload);
}
```

JWKS key fetched from Cognito: `https://cognito-idp.<region>.amazonaws.com/<userPoolId>/.well-known/jwks.json`
Keys cached in memory to avoid per-request JWKS fetches.

---

## Route Architecture

All routes under `apps/server/src/app/routes/` are auto-loaded by `@fastify/autoload` with `/api` prefix.

### Route Handler Pattern

```typescript
// Standard SmartNgRX entity route
export default async function universeRoutes(fastify: FastifyInstance) {
  // Load by IDs — POST with string[] body
  fastify.post<{ Body: string[] }>('/', async (request, reply) => {
    const ids = request.body;
    const items = await prisma.universe.findMany({ where: { id: { in: ids } } });
    return reply.send(items);
  });

  // Update
  fastify.put<{ Body: Universe }>('/', async (request, reply) => {
    const item = request.body;
    const updated = await prisma.universe.update({ where: { id: item.id }, data: item });
    return reply.send(updated);
  });
  // ...
}
```

### Route Summary

| Method   | Path                               | Description                                                                     |
| -------- | ---------------------------------- | ------------------------------------------------------------------------------- |
| `GET`    | `/health`                          | Server health check                                                             |
| `GET`    | `/health/detailed`                 | DB health + metrics                                                             |
| `GET`    | `/api/csrf-token`                  | Get new CSRF token                                                              |
| `POST`   | `/api/auth/set-secure-cookie`      | Store JWT in HTTP-only cookie                                                   |
| `POST`   | `/api/auth/clear-cookies`          | Clear auth cookies                                                              |
| `POST`   | `/api/auth/revoke-token`           | Blacklist token                                                                 |
| `POST`   | `/api/top`                         | Bootstrap: accounts+universes+riskGroups+screens+holidays+divDepositTypes (IDs) |
| `POST`   | `/api/accounts`                    | Load accounts by IDs                                                            |
| `PUT`    | `/api/accounts`                    | Update account                                                                  |
| `POST`   | `/api/accounts/add`                | Create new account                                                              |
| `DELETE` | `/api/accounts/:id`                | Soft-delete account                                                             |
| `POST`   | `/api/accounts/indexes`            | Load child entities by account (paginated)                                      |
| `POST`   | `/api/universe`                    | Load universe entries by IDs                                                    |
| `PUT`    | `/api/universe`                    | Update universe entry                                                           |
| `POST`   | `/api/universe/add-symbol`         | Add new symbol                                                                  |
| `DELETE` | `/api/universe/:id`                | Remove symbol                                                                   |
| `GET`    | `/api/universe/all`                | All non-expired symbols (for autocomplete)                                      |
| `POST`   | `/api/universe/sync-from-screener` | Copy screener data into universe                                                |
| `POST`   | `/api/trades`                      | Load trades by IDs                                                              |
| `GET`    | `/api/trades/open`                 | All open trades                                                                 |
| `GET`    | `/api/trades/closed`               | All closed trades                                                               |
| `POST`   | `/api/screener`                    | Fetch screener data from cefconnect.com                                         |
| `POST`   | `/api/screener/rows`               | Load screener rows by IDs                                                       |
| `GET`    | `/api/summary`                     | Aggregated portfolio summary                                                    |
| `GET`    | `/api/summary/graph`               | Monthly distribution data for charting                                          |
| `GET`    | `/api/summary/years`               | Available years                                                                 |
| `GET`    | `/api/summary/months`              | Available months within a year                                                  |
| `POST`   | `/api/settings`                    | Batch update universe prices via Yahoo Finance                                  |
| `PUT`    | `/api/settings/update`             | Update individual settings                                                      |
| `POST`   | `/api/div-deposits`                | Load deposits by IDs                                                            |
| `PUT`    | `/api/div-deposits`                | Update deposit                                                                  |
| `POST`   | `/api/div-deposit-types`           | Load deposit types by IDs                                                       |
| `POST`   | `/api/risk-group`                  | Load risk groups by IDs                                                         |
| `PUT`    | `/api/risk-group`                  | Update risk group                                                               |
| `POST`   | `/api/import`                      | Import Fidelity CSV (multipart)                                                 |
| `GET`    | `/api/symbol/search`               | Search symbols by query string                                                  |
| `GET`    | `/api/logs`                        | List log files                                                                  |
| `DELETE` | `/api/logs/:filename`              | Delete log file                                                                 |
| `GET`    | `/`                                | Feature flags (no `/api` prefix)                                                |

---

## Sort/Filter Protocol

Server extracts table sort/filter state from the `x-table-state` request header.

```typescript
// parse-sort-filter-header.function.ts
function parseSortFilterHeader(request: FastifyRequest): AllTableState {
  const raw = request.headers['x-table-state'];
  if (!raw) return {};
  return JSON.parse(Buffer.from(raw as string, 'base64').toString());
}

// get-table-state.function.ts
function getTableState(allState: AllTableState, tableName: string): TableState | undefined {
  return allState[tableName];
}
```

Routes that support sort/filter call `parseSortFilterHeader(request)` and extract the relevant table state before building the Prisma query.

---

## Database Layer

### Prisma Client (`prisma/prisma-client.ts`)

- Singleton pattern: stored on `globalThis` to survive HMR in dev
- `PrismaBetterSqlite3` adapter wraps better-sqlite3 for synchronous SQLite access
- `createConnectionPoolConfig()` sets WAL mode + pragma tuning for SQLite
- Exported: `prisma`, `checkDatabaseHealth()`, `checkDatabaseHealthWithClient()`

### Database URL Construction

```
Local dev:   file:./database.db
Docker:      postgresql://user:pass@localhost:5432/dms
Production:  Value of DATABASE_URL env var (from AWS SSM or CI secret)
```

### Query Patterns

All entities use consistent patterns:

- **Soft delete**: `deletedAt?` — never `DELETE`, always `UPDATE { deletedAt: new Date() }`
- **Optimistic locking**: `version` field incremented on update; conflict = 409 Conflict
- **UUID PKs**: All entities use `cuid()` via Prisma default
- **Timestamps**: `createdAt` (default now), `updatedAt` (auto-update)

---

## Security Architecture

### Defense in Depth

```
Request
  ↓
CORS validation (origin allowlist)
  ↓
Rate limiting (per-IP, per-route)
  ↓
CSRF validation (token header check for mutations)
  ↓
JWT authentication (RS256 via Cognito JWKS)
  ↓
Route handler
  ↓
Audit log entry (for sensitive operations)
  ↓
CSP + security headers on response
```

### Token Management

- JWT stored in HTTP-only `Secure` cookie (no JavaScript access)
- Cookie set by Node.js server via `POST /api/auth/set-secure-cookie`
- Token blacklist: in-memory `Set<jti>` for revoked tokens
- Token refresh: handled by frontend `TokenRefreshService` (Amplify `fetchAuthSession()`)

### CSRF Protection

- CSRF tokens issued by `GET /api/csrf-token`
- Angular `SecurityService` stores token and sends as `x-csrf-token` header
- Server validates header on all POST/PUT/DELETE requests
- Tokens expire after 1 hour; idle cleanup removes expired tokens
- Auth endpoints and CSRF endpoint are excluded from CSRF check

---

## AWS Integration

### SSM Parameter Store

Production config is loaded from AWS SSM at startup:

```typescript
// aws-config.ts
const params = await ssm.getParameters({
  Names: ['/dms/DATABASE_URL', '/dms/COGNITO_USER_POOL_ID', '/dms/COGNITO_CLIENT_ID'],
  WithDecryption: true,
});
```

Parameters set in environment variables after loading.

### Cognito

- User pool and client ID loaded from SSM (or env vars for Docker/dev)
- JWKS fetched from: `https://cognito-idp.<region>.amazonaws.com/<userPoolId>/.well-known/jwks.json`
- JWT claims: `sub` (user ID), `email`, `cognito:groups`
- Groups used for role-based authorization (future)

---

## External API Integration

### Yahoo Finance (Settings Update)

- Route: `POST /api/settings` — triggers bulk fetch for all active universe symbols
- `distribution-api.function.ts` fetches distribution data
- Results merged back into `universe` table
- Long-running: can take minutes for large watchlists (hence 8-hour request timeout)

### cefconnect.com (Screener)

- Route: `POST /api/screener` — proxies request to CEF Connect public API
- Transforms response into `screener` records
- CEF Connect data: distribution rate, yield, premium/discount, category, etc.
- `POST /api/universe/sync-from-screener` merges screener data into universe table

---

## Logging

### Server Logs

- Fastify built-in `pino` logger (via `fastify({ logger: true })`)
- `apps/server/src/utils/structured-logger.ts` — structured JSON format
- Log files written to `logs/` directory
- `GET /api/logs` returns list of log files; `DELETE /api/logs/:filename` removes one

### Audit Log (`services/audit-log.service.ts`)

- Singleton service, `AuditLogServiceInstance` exported
- Logs: auth failures, token revocations, rate limit hits, CSRF violations
- Written to structured JSON log with timestamp, event type, user, IP

---

## Error Handling

- `@fastify/sensible` provides `httpErrors.*` helpers (`notFound()`, `unauthorized()`, `badRequest()`, etc.)
- Route handlers throw sensible errors; Fastify serializes them as RFC 7807 Problem Details
- Unhandled exceptions: caught by Fastify's error hook, logged, 500 returned
- Prisma errors: `P2025` (not found) → 404; `P2002` (unique constraint) → 409

---

## Testing

**Framework**: Vitest 4.0.9 with `node` environment

Unit tests for:

- Individual utility functions (JWT validation, header parsing, URL builders)
- Route handler logic (with Fastify `inject()` for fake HTTP)
- Service layer (AuditLog, CUSIP cache cleanup)
- Prisma query helpers (via in-memory SQLite)

Pattern: `inject()` method from `fastify` for route-level integration tests without network.
