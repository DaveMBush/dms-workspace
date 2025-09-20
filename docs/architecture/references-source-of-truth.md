# References (source of truth)

## Database Schemas

- SQLite schema: `prisma/schema.prisma`
- PostgreSQL schema: `prisma/schema.postgresql.prisma`
- Database client: `apps/server/src/app/prisma/prisma-client.ts`

## Backend API Routes

- Screener refresh: `apps/server/src/app/routes/screener/index.ts`
- Screener rows: `apps/server/src/app/routes/screener/rows/index.ts`
- Universe CRUD: `apps/server/src/app/routes/universe/index.ts`
- Universe sync (planned): `apps/server/src/app/routes/universe/sync-from-screener/index.ts`
- Settings (manual universe): `apps/server/src/app/routes/settings/index.ts`
- Settings/update (refresh): `apps/server/src/app/routes/settings/update/index.ts`

## Authentication & Middleware

- Authentication middleware: `apps/server/src/app/middleware/is-authenticated.function.ts`
- JWT utilities: `apps/server/src/app/utils/extract-token-from-header.function.ts`
- Rate limiting: `apps/server/src/app/middleware/handle-rate-limiting.function.ts`

## Frontend Components

- Universe store: `apps/rms/src/app/store/universe/universe-effect.service.ts`
- Universe data service: `apps/rms/src/app/global/global-universe/universe-data.service.ts`
- Universe settings: `apps/rms/src/app/universe-settings/*`
- Screener component: `apps/rms/src/app/global/screener/screener.ts`

## Environment Configuration

- Development: `apps/rms/src/environments/environment.ts`
- Docker: `apps/rms/src/environments/environment.docker.ts`
- Production: `apps/rms/src/environments/environment.prod.ts`
- Proxy config: `apps/rms/proxy.conf.json`

## Build & Deployment

- Docker compose: `docker-compose.local.yml`
- Server Dockerfile: `apps/server/Dockerfile`
- Frontend Dockerfile: `apps/rms/Dockerfile`
- Infrastructure: `apps/infrastructure/environments/`
