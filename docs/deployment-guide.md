# Deployment Guide

## Environments Overview

| Environment  | Frontend                  | Backend                  | Database                      | Auth                    |
| ------------ | ------------------------- | ------------------------ | ----------------------------- | ----------------------- |
| Local Dev    | Angular dev server (4201) | Fastify (3000)           | SQLite (`prisma/database.db`) | Mock (bypasses Cognito) |
| Local Docker | Nginx container (8080)    | Fastify container (8000) | PostgreSQL 16 container       | Mock                    |
| E2E Test     | Angular e2e build (4301)  | Fastify e2e (3001)       | `test-database.db` (SQLite)   | Mock                    |
| Production   | AWS S3 + CloudFront       | AWS App Runner / ECS     | AWS RDS PostgreSQL 16         | AWS Cognito             |

---

## Local Development (SQLite)

No Docker required. SQLite database is auto-created at `prisma/database.db`.

```bash
# 1. Install dependencies
pnpm install

# 2. Set up environment
cp env.example .env
# No database URL needed — defaults to SQLite

# 3. Run migrations
pnpm exec prisma migrate dev

# 4. Start backend
pnpm start:server          # Port 3000

# 5. Start frontend (separate terminal)
pnpm start:dms-material    # Port 4201
```

Open `http://localhost:4201`. Mock auth is active — no login required.

---

## Local Docker Stack

Uses `docker-compose.local.yml` for a fully containerized local stack with PostgreSQL.

### Prerequisites

- Docker Desktop or Docker Engine + Compose Plugin
- `.env` file with valid database credentials

### Starting the Stack

```bash
# Start all services
docker-compose -f docker-compose.local.yml up

# Start in background
docker-compose -f docker-compose.local.yml up -d

# View logs
docker-compose -f docker-compose.local.yml logs -f

# Stop
docker-compose -f docker-compose.local.yml down

# Stop and remove volumes (clears database)
docker-compose -f docker-compose.local.yml down -v
```

### Services and Ports

| Service    | Internal Port | External Port | Image                                             |
| ---------- | ------------- | ------------- | ------------------------------------------------- |
| `postgres` | 5432          | 5432          | `postgres:16-alpine`                              |
| `server`   | 3000          | 8000          | Built from `apps/server/` Dockerfile              |
| `frontend` | 80            | 8080          | Built from `apps/dms-material/` Dockerfile, nginx |

Access at `http://localhost:8080`.

### Docker Compose Configuration (`docker-compose.local.yml`)

Key environment variables passed to the `server` container:

```yaml
environment:
  DATABASE_URL: postgresql://dms:dms_password@postgres:5432/dms
  NODE_ENV: production
  PORT: 3000
  CORS_ORIGIN: http://localhost:8080
```

### Database (PostgreSQL)

When using Docker, the app uses `prisma/schema.postgresql.prisma` and PostgreSQL-specific migrations in `prisma/migrations-postgresql/`.

```bash
# Run PostgreSQL migrations (when container is running)
pnpm exec prisma migrate deploy --schema prisma/schema.postgresql.prisma

# Connect to PostgreSQL (from host)
psql postgresql://dms:dms_password@localhost:5432/dms
```

---

## E2E Test Environment

E2E tests run against a dedicated test stack with a separate SQLite database.

### Setup

```bash
# Create the test database with baseline schema + seed
node tools/create-test-db.js
# Creates: prisma/test-database.db

# Start backend in E2E mode (port 3001)
pnpm exec nx serve server --configuration=e2e
# Uses: DATABASE_URL=file:./prisma/test-database.db, PORT=3001

# Start frontend in E2E mode (port 4301) — separate terminal
pnpm exec nx serve dms-material --configuration=e2e
```

### Running E2E Tests

```bash
pnpm exec nx e2e dms-material-e2e
```

Playwright targets:

- Frontend: `http://localhost:4301` (Chrome), `http://127.0.0.1:4301` (Firefox — IPv6 workaround)
- Backend: `http://localhost:3001`

### E2E Database Seeding

E2E helper files seed the database directly via Prisma before each test:

```typescript
// helpers/shared-prisma-client.helper.ts
import { PrismaClient } from '@prisma/client';
export const e2ePrisma = new PrismaClient({
  datasources: { db: { url: 'file:./prisma/test-database.db' } },
});

// In test file:
test.beforeEach(async () => {
  await e2ePrisma.accounts.createMany({ data: seedAccounts });
});
test.afterEach(async () => {
  await e2ePrisma.accounts.deleteMany();
});
```

---

## Production Deployment

### Infrastructure Overview

```
Browser
  ↓ HTTPS
CloudFront (CDN) → S3 (Angular static files)
  ↓ /api/** proxy
App Runner / ECS Task (Fastify)
  ↓
RDS PostgreSQL 16 (Multi-AZ)
  ↓
AWS SSM Parameter Store (secrets)
AWS Cognito (auth)
```

### Frontend Deployment

```bash
# 1. Build production bundle
pnpm exec nx build dms-material --configuration=production
# Output: dist/apps/dms-material/browser/

# 2. Upload to S3
aws s3 sync dist/apps/dms-material/browser/ s3://<bucket-name>/ \
  --cache-control "no-cache" \
  --exclude "*.html"

aws s3 sync dist/apps/dms-material/browser/ s3://<bucket-name>/ \
  --cache-control "max-age=31536000" \
  --exclude "*.html" \
  --include "*.js" \
  --include "*.css"

# 3. Invalidate CloudFront
aws cloudfront create-invalidation \
  --distribution-id <distribution-id> \
  --paths "/*"
```

Angular production build uses `environments/environment.prod.ts`:

- `useMockAuth: false` → real Cognito
- `apiUrl: '/'` → same-origin requests (CloudFront routes `/api/**` to backend)

### Backend Deployment

```bash
# 1. Build server
pnpm exec nx build server --configuration=production
# Output: dist/apps/server/

# 2. Build Docker image
docker build -t dms-server:latest -f apps/server/Dockerfile .

# 3. Push to ECR
aws ecr get-login-password | docker login --username AWS --password-stdin <account>.dkr.ecr.<region>.amazonaws.com
docker tag dms-server:latest <account>.dkr.ecr.<region>.amazonaws.com/dms-server:latest
docker push <account>.dkr.ecr.<region>.amazonaws.com/dms-server:latest

# 4. Update App Runner / ECS service (triggers rolling deployment)
aws apprunner update-service --service-arn <arn>
```

### Required AWS SSM Parameters (Production)

All sensitive configuration is loaded from SSM at startup:

| SSM Parameter               | Description                                 |
| --------------------------- | ------------------------------------------- |
| `/dms/DATABASE_URL`         | PostgreSQL connection string (SecureString) |
| `/dms/COGNITO_USER_POOL_ID` | Cognito user pool ID                        |
| `/dms/COGNITO_CLIENT_ID`    | Cognito app client ID                       |
| `/dms/SESSION_SECRET`       | Cookie signing secret (SecureString)        |
| `/dms/CSRF_SECRET`          | CSRF token signing key (SecureString)       |
| `/dms/ALLOWED_ORIGINS`      | Comma-separated allowed CORS origins        |
| `/dms/OPENFIGI_API_KEY`     | OpenFIGI API key (SecureString)             |

### Production Environment Variables (set directly on container)

| Variable     | Value                        |
| ------------ | ---------------------------- |
| `NODE_ENV`   | `production`                 |
| `PORT`       | `3000`                       |
| `AWS_REGION` | `us-east-1` (or your region) |

### Database Migrations (Production)

```bash
# Apply pending migrations without resetting data
pnpm exec prisma migrate deploy --schema prisma/schema.postgresql.prisma
```

Run migrations **before** deploying the new server version. Migrations are additive and backward-compatible.

---

## Scripts

Deployment helper scripts in `scripts/`:

| Script                          | Purpose                                          |
| ------------------------------- | ------------------------------------------------ |
| `scripts/build-and-deploy.sh`   | Full build + S3 upload + CloudFront invalidation |
| `scripts/deploy-frontend.sh`    | Frontend-only S3 deploy                          |
| `scripts/backup-database.sh`    | Database backup to S3                            |
| `scripts/daily-health-check.sh` | Scheduled health-check ping                      |

---

## Health Checks

```bash
# Basic health
curl http://localhost:3000/health
# Response: { "status": "ok" }

# Detailed health (includes DB status)
curl http://localhost:3000/health/detailed
# Response: { "status": "ok", "database": "connected", "uptime": 12345 }
```

Production load balancers/App Runner use `GET /health` as the health check endpoint.

---

## Rollback Procedure

See `docs/rollback-runbook/` for detailed rollback procedures.

Quick rollback:

1. Re-deploy previous Docker image (ECR tag `previous` or Git SHA)
2. If migration was applied: restore RDS from automated snapshot
3. Re-upload previous frontend build to S3
4. Invalidate CloudFront

---

## Monitoring & Alerts

See `docs/monitoring-and-alerts.md` for full monitoring setup.

Key metrics to monitor:

- `GET /health` response time (< 100ms)
- Error rate on `POST /api/top` (bootstrap failures)
- JWT auth failure rate (Cognito issues)
- Database connection pool (PostgreSQL max_connections)
- CUSIP cache hit rate (indicates Yahoo Finance API health)
