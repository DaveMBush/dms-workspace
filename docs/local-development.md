# Local Development and Deployment

This guide explains two approaches for working with the DMS Workspace locally:

1. **Local Development**: Traditional development with `pnpm nx serve` (SQLite, no Docker required)
2. **Local Deployment**: Full containerized stack with Docker Compose (PostgreSQL + LocalStack + Backend)

## Local Development (Traditional)

For day-to-day development work:

```bash
# Standard development - uses SQLite, no Docker needed
pnpm nx serve server

# Frontend development
pnpm nx serve dms
```

This approach:

- ✅ Fast startup and iteration
- ✅ Uses SQLite for simplicity
- ✅ No Docker dependencies
- ✅ Standard Nx workflow

## Local Deployment (Containerized)

For testing the full production-like stack locally:

### Overview

The local deployment environment provides:

- **LocalStack**: Emulates AWS services (S3, SSM Parameter Store, Cognito)
- **PostgreSQL**: Local database instance
- **PgAdmin**: Database management interface (optional)
- **Environment Configuration**: Seamless switching between local and cloud environments

## Prerequisites

- Docker and Docker Compose installed
- Node.js 20+ and pnpm
- Nx CLI (`npm install -g nx`)

## Quick Start

### 1. Start Local Services

```bash
# Start LocalStack and PostgreSQL
./scripts/start-local-dev.sh
```

This script will:

- Start Docker containers for LocalStack and PostgreSQL
- Initialize AWS services in LocalStack
- Set up database with proper schema
- Display connection information

### 2. Start Backend Application

```bash
# Start the backend in local mode
pnpm nx serve server:local
```

The backend will connect to:

- Local PostgreSQL database
- LocalStack for AWS services
- Use environment variables from `.env.local`

### 3. Stop Services

```bash
# Stop all services
./scripts/stop-local-dev.sh
```

## Configuration Files

### Environment Files

- **`.env`**: Default SQLite configuration (unchanged)
- **`.env.local`**: Local Docker environment configuration
- **`.env.example`**: Template for other environments

### Docker Configuration

- **`docker-compose.local.yml`**: Defines LocalStack and PostgreSQL services
- **`scripts/localstack-init.sh`**: Initializes AWS services in LocalStack
- **`scripts/postgres-init.sql`**: PostgreSQL database initialization

## Service Details

### LocalStack Services

**Port**: 4566
**Services**: S3, SSM Parameter Store, Cognito
**Dashboard**: https://app.localstack.cloud (optional web UI)

#### S3 Configuration

- Bucket: `dms-local-bucket`
- Endpoint: `http://localhost:4566`

#### SSM Parameter Store

Parameters created automatically:

- `/dms/local/database-url`
- `/dms/local/database-password`
- `/dms/local/cognito-user-pool-id`
- `/dms/local/cognito-user-pool-client-id`
- `/dms/local/cognito-jwt-issuer`
- `/dms/local/aws-region`

#### Cognito

- User Pool: `dms-local-pool`
- User Pool ID: `us-east-1_LOCAL123`
- Client ID: `local-client-id-123`

### PostgreSQL Database

**Port**: 5432
**Database**: `dms_local`
**User**: `dms_user`
**Password**: `dms_password`

### PgAdmin (Optional)

**Port**: 8080
**Email**: `admin@dms.local`
**Password**: `admin`

To enable PgAdmin:

```bash
docker-compose -f docker-compose.local.yml --profile admin up -d
```

## Nx Commands

### Server Commands

```bash
# Development (SQLite)
pnpm nx serve server

# Local (PostgreSQL + LocalStack)
pnpm nx serve server:local

# Production build
pnpm nx build server:production
```

### Database Commands

```bash
# Generate Prisma client for PostgreSQL
export DATABASE_PROVIDER=postgresql
export DATABASE_URL=postgresql://dms_user:dms_password@localhost:5432/dms_local?schema=public
pnpm prisma generate

# Run migrations
pnpm prisma migrate deploy

# Reset database
pnpm prisma db push --force-reset
```

## Switching Between Environments

The application automatically detects the environment based on:

1. `NODE_ENV=local` - Uses LocalStack and PostgreSQL
2. `NODE_ENV=development` - Uses SQLite (default)
3. `NODE_ENV=production` - Uses AWS cloud services

No code changes are required to switch environments.

## AWS SDK Configuration

The AWS configuration automatically detects LocalStack:

```typescript
// Automatic LocalStack detection
if (process.env.NODE_ENV === 'local') {
  // Uses http://localhost:4566 endpoints
  // Uses test credentials
}
```

## Troubleshooting

### Services Not Starting

```bash
# Check Docker status
docker info

# Check container logs
docker-compose -f docker-compose.local.yml logs

# Restart services
docker-compose -f docker-compose.local.yml restart
```

### Database Connection Issues

```bash
# Test PostgreSQL connection
docker-compose -f docker-compose.local.yml exec postgres psql -U dms_user -d dms_local -c "SELECT version();"

# Reset database
pnpm prisma db push --force-reset
```

### LocalStack Issues

```bash
# Check LocalStack health
curl http://localhost:4566/health

# View LocalStack logs
docker-compose -f docker-compose.local.yml logs localstack

# List S3 buckets
aws --endpoint-url=http://localhost:4566 s3 ls

# List SSM parameters
aws --endpoint-url=http://localhost:4566 ssm describe-parameters
```

### Port Conflicts

If ports 4566, 5432, or 8080 are in use:

1. Stop conflicting services
2. Modify `docker-compose.local.yml` port mappings
3. Update corresponding environment variables

## Performance Notes

- **First startup**: LocalStack initialization takes 60-90 seconds
- **Subsequent startups**: Services start in 10-20 seconds
- **Database**: PostgreSQL provides better performance than SQLite for development
- **Persistence**: Data persists between container restarts

## Development Workflow

1. **Start local services**: `./scripts/start-local-dev.sh`
2. **Start backend**: `pnpm nx serve server:local`
3. **Develop features**: Edit code, services auto-reload
4. **Test with local AWS services**: Use LocalStack endpoints
5. **Stop services**: `./scripts/stop-local-dev.sh`

## Integration with Existing Workflow

This local environment:

- ✅ Maintains compatibility with existing cloud development
- ✅ Follows Nx workspace patterns
- ✅ Uses same Prisma schema and migrations
- ✅ Preserves all existing serve targets
- ✅ No changes to production deployment

## Security Notes

- Local credentials are test values only
- LocalStack data is not encrypted
- Use only for development, never production
- Database passwords are visible in configuration files

## Next Steps

- Set up frontend to use local backend
- Configure CI/CD to test against local environment
- Add integration tests using LocalStack services
- Set up database seeding for consistent test data
