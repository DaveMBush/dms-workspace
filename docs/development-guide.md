# Development Guide

## Prerequisites

| Tool    | Version         | Notes                                               |
| ------- | --------------- | --------------------------------------------------- |
| Node.js | ≥ 22            | Use nvm or fnm to manage versions                   |
| pnpm    | 10.x            | `npm install -g pnpm`                               |
| Nx CLI  | (use pnpm exec) | `pnpm exec nx <command>` or `pnpm dlx nx <command>` |

---

## Initial Setup

```bash
# Clone and install dependencies
git clone <repo-url>
cd dms-workspace
pnpm install

# Copy environment file
cp env.example .env
# Edit .env with your values (see Environment Variables section)
```

---

## Running the Development Stack

### Start Dev Server (Backend)

```bash
pnpm start:server
# or
pnpm exec nx serve server
```

Starts Fastify on `http://localhost:3000`
Database: `prisma/database.db` (SQLite, created automatically)
Auth: Real Cognito (or see mock auth below)

### Start Dev Server (Frontend)

```bash
pnpm start:dms-material
# or
pnpm exec nx serve dms-material
```

Starts Angular on `http://localhost:4201`
Proxies `/api/**` → `localhost:3000`
Uses `environments/environment.ts` → `useMockAuth: true`

### Start Both (Recommended)

Open two terminal windows, run `pnpm start:server` and `pnpm start:dms-material` simultaneously.

---

## Port Map

| Service             | Port | Purpose              |
| ------------------- | ---- | -------------------- |
| Frontend (dev)      | 4201 | Angular dev server   |
| Backend (dev)       | 3000 | Fastify API          |
| Frontend (e2e)      | 4301 | Angular e2e target   |
| Backend (e2e)       | 3001 | Fastify e2e target   |
| Frontend (Docker)   | 8080 | Nginx static serve   |
| Backend (Docker)    | 8000 | Fastify in container |
| PostgreSQL (Docker) | 5432 | PostgreSQL 16        |

---

## Environment Variables

Copy `env.example` to `.env`. All variables used by the server:

| Variable               | Required    | Default                     | Description                                  |
| ---------------------- | ----------- | --------------------------- | -------------------------------------------- |
| `DATABASE_URL`         | Yes         | `file:./prisma/database.db` | SQLite path or PostgreSQL connection string  |
| `PORT`                 | No          | `3000`                      | Server listen port                           |
| `NODE_ENV`             | No          | `development`               | `development`, `production`, `test`          |
| `OPENFIGI_API_KEY`     | Recommended | —                           | OpenFIGI API key for CUSIP→symbol resolution |
| `COGNITO_USER_POOL_ID` | Prod only   | —                           | AWS Cognito user pool ID                     |
| `COGNITO_CLIENT_ID`    | Prod only   | —                           | AWS Cognito app client ID                    |
| `AWS_REGION`           | Prod only   | `us-east-1`                 | AWS region                                   |
| `ALLOWED_ORIGINS`      | Prod only   | —                           | Comma-separated CORS origin allowlist        |
| `SESSION_SECRET`       | Prod only   | —                           | Cookie signing secret                        |
| `CSRF_SECRET`          | Prod only   | —                           | CSRF token signing key                       |

---

## Database Management

### Run Migrations (SQLite — dev)

```bash
pnpm exec prisma migrate dev
# or with custom name:
pnpm exec prisma migrate dev --name add-new-column
```

### Open Prisma Studio (DB Browser)

```bash
pnpm exec prisma studio
```

### Reset Database (clears all data)

```bash
pnpm exec prisma migrate reset
```

### Generate Prisma Client

```bash
pnpm exec prisma generate
```

This is run automatically on `pnpm install` via the `postinstall` npm hook.

---

## Running Tests

### Unit Tests — All

```bash
pnpm exec nx run-many -t test
# or:
pnpm test
```

### Unit Tests — Affected (since git branch)

```bash
pnpm exec nx affected -t test
```

### Unit Tests — Single App

```bash
pnpm exec nx test dms-material
pnpm exec nx test server
```

### Unit Tests — Single File

```bash
pnpm exec nx test dms-material --testFile=src/app/shared/components/confirm-dialog/confirm-dialog.component.spec.ts
```

### Unit Tests — Watch Mode

```bash
pnpm exec nx test dms-material --watch
```

### E2E Tests

```bash
# Must have e2e backend running first (port 3001)
pnpm exec nx serve server --configuration=e2e &

# Run all E2E specs
pnpm exec nx e2e dms-material-e2e

# Run specific spec file
pnpm exec nx e2e dms-material-e2e --grep "universe"
```

### Code Coverage

```bash
pnpm exec nx run-many -t test --coverage
```

Coverage output written to `coverage/apps/`.

---

## Building

### Build Frontend

```bash
pnpm exec nx build dms-material
# Output: dist/apps/dms-material/
```

### Build Backend

```bash
pnpm exec nx build server
# Output: dist/apps/server/
```

### Build All

```bash
pnpm exec nx run-many -t build
```

---

## Linting

```bash
# All apps
pnpm exec nx run-many -t lint

# Single app
pnpm exec nx lint dms-material

# Fix auto-fixable issues
pnpm exec nx lint dms-material --fix
```

### Key ESLint Rules

| Rule                                        | Enforcement                                   |
| ------------------------------------------- | --------------------------------------------- |
| `@smarttools/no-anonymous-functions`        | Error — all callbacks must be named functions |
| `import/order` (via `eslint-plugin-import`) | Error — strict import ordering enforced       |
| `sonarjs/cognitive-complexity`              | Warning — max complexity 15                   |
| `unicorn/no-array-for-each`                 | Error — use `for...of` instead                |
| `unicorn/prefer-module`                     | Error — ESM only, no `require()`              |
| `no-console`                                | Error — use the logger service                |

---

## Code Conventions

### Angular Code Style

All Angular code must follow:

```typescript
// ✅ Correct: standalone component, OnPush, inject()
@Component({
  selector: 'dms-my-component',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `...`,
})
export class MyComponent {
  private readonly service = inject(MyService);
  protected readonly value = input<string>();
  protected readonly changed = output<string>();
}

// ❌ Wrong: no constructor injection, no NgModules, no zone-based CD
@Component({ ... })
export class MyComponent {
  constructor(private service: MyService) {}  // ❌
}
```

### Named Functions Rule

All callbacks, arrow functions in reactive chains, and event handlers must be named:

```typescript
// ✅ Correct
const items = array.map((item) => transformItem(item));
const filtered = array.filter((x) => isValidItem(x));

// ❌ Wrong (anonymous inline arrow)
const items = array.map((item) => ({ ...item, processed: true }));
```

### TypeScript Conventions

- `interface` preferred over `type` for object shapes
- `readonly` on all service injections and signal store properties
- `as const` for constant tuples and string unions
- No `any` — use `unknown` and type narrowing
- Explicit return types on all public/exported functions

### Import Order (enforced by ESLint)

```typescript
// 1. Angular imports
import { Component, inject } from '@angular/core';
import { MatButton } from '@angular/material/button';

// 2. Third-party imports
import { SmartEntityDefinition } from '@smarttools/smart-signals';

// 3. Workspace imports (tsconfig aliases)
import { Universe } from '../../store/universe/universe.interface';

// 4. Relative imports
import { MyService } from './my.service';
```

---

## Project Structure Conventions

### Adding a New Feature Module

1. Create directory: `apps/dms-material/src/app/<feature>/`
2. Create component: `<feature>.component.ts`
3. Add route in `app.routes.ts` with lazy loading
4. Create service if needed: `<feature>-component.service.ts`
5. If using SmartNgRX entity: add definition + effect service under `store/<entity>/`

### Adding a New API Route

1. Create directory: `apps/server/src/app/routes/<route>/`
2. Create `index.ts` exporting default async function (`FastifyPluginAsync`)
3. Add Prisma queries to match the SmartNgRX entity pattern (POST with IDs array)
4. Add rate-limit config entry in `rate-limit-configs.constant.ts`
5. Add route to this `api-contracts.md` documentation

### Adding a New Prisma Model

1. Edit `prisma/schema.prisma` (and `prisma/schema.postgresql.prisma`)
2. Run `pnpm exec prisma migrate dev --name <description>`
3. Update `prisma/schema.production.prisma` if needed
4. Run `pnpm exec prisma generate`

---

## Debugging

### Backend Debug

The `server` project.json includes a `serve` target with `inspect` flag:

```bash
pnpm exec nx serve server --inspect
# Attach VS Code debugger to port 9229
```

### Frontend Debug

Use browser DevTools. Angular DevTools extension recommended for signal debugging and component tree inspection.

### Prisma Queries

Enable Prisma query logging:

```typescript
// prisma-client.ts — temporarily add:
const prisma = new PrismaClient({ log: ['query', 'info', 'warn', 'error'] });
```

### E2E Debug

```bash
# Run Playwright with headed browser and slow-motion
pnpm exec nx e2e dms-material-e2e --headed --slow-mo=500

# Open Playwright UI mode
pnpm exec nx e2e dms-material-e2e --ui
```

---

## Mock Authentication (Dev Mode)

In dev (`environments/environment.ts`), `useMockAuth: true` causes the app to use `MockAuthService` and `MockProfileService`. This bypasses all Cognito calls.

To test real Cognito auth flows locally:

1. Set `useMockAuth: false` in `environments/environment.ts`
2. Provide valid `COGNITO_USER_POOL_ID` and `COGNITO_CLIENT_ID` in `.env`
3. Ensure your user exists in the Cognito user pool

---

## Nx Useful Commands

```bash
# Show project graph (visual dependency tree)
pnpm exec nx graph

# Show what's affected by current branch changes
pnpm exec nx affected --base=main

# Run only affected tests
pnpm exec nx affected -t test --base=main

# Generate code (future generators)
pnpm exec nx generate @nx/angular:component my-component --project=dms-material

# View cached task output
pnpm exec nx show project dms-material
```
