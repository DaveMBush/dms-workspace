# Deployment & configuration

## Environment Variables

### Core Configuration

- `DATABASE_URL` (existing) - Database connection string
- `DATABASE_PROVIDER` - Database type (sqlite/postgresql)
- `USE_SCREENER_FOR_UNIVERSE` (new) - Feature flag for screener sync
- `NODE_ENV` - Environment mode (development/local/production)
- `PORT` - Server port (default: 3000)
- `HOST` - Server host binding

### Authentication Configuration

- `COGNITO_USER_POOL_ID` - AWS Cognito User Pool ID (production)
- `COGNITO_USER_POOL_CLIENT_ID` - AWS Cognito Client ID (production)
- `AWS_REGION` - AWS region for Cognito (production)

## Environment-Specific Deployment

### Development Deployment

```bash
# Start development servers
pnpm nx serve dms      # Frontend: http://localhost:4200
pnpm nx serve server   # Backend: http://localhost:3000
```

**Configuration**:

- Database: SQLite (`DATABASE_PROVIDER=sqlite`)
- Auth: Mock (`useMockAuth: true`)
- Environment: `.env` file

### Docker Local Deployment

```bash
# Start full stack
docker-compose -f docker-compose.local.yml up
# Frontend: http://localhost:8080
# Backend: http://localhost:8000 (exposed)
# Database: PostgreSQL container
```

**Configuration**:

- Database: PostgreSQL (`DATABASE_PROVIDER=postgresql`)
- Auth: Mock (`useMockAuth: true`)
- Environment: Docker environment variables

### Production Deployment

**Configuration**:

- Database: PostgreSQL (AWS RDS)
- Auth: AWS Cognito (`useMockAuth: false`)
- Environment: Production environment variables
- Infrastructure: Terraform in `apps/infrastructure/`

## Scheduling

- Run GET `/api/screener` on a schedule (e.g., daily) to refresh sources.
- The user can invoke the sync on demand from the UI.

## Development Commands

### Quality Assurance (all must pass)

```bash
pnpm format              # Code formatting
pnpm dupcheck           # Duplicate code detection
pnpm nx run dms:test --code-coverage
pnpm nx run server:build:production
pnpm nx run server:test --code-coverage
pnpm nx run server:lint
pnpm nx run dms:lint
pnpm nx run dms:build:production
pnpm nx run dms-e2e:lint
```

### Development Servers

```bash
# Individual services
pnpm nx serve dms               # Frontend dev server
pnpm nx serve server            # Backend dev server

# All services
pnpm nx run-many --target=serve --all
```
