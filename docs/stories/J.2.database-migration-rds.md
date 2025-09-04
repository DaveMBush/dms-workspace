# Story J.2: Database Migration to RDS PostgreSQL

## Status

Draft

## Story

**As a** backend developer,
**I want** to migrate from SQLite to PostgreSQL RDS with proper schema migration and data preservation,
**so that** the RMS application can run on AWS with a production-ready database that supports concurrent access and better performance.

## Acceptance Criteria

1. Update Prisma schema.prisma to use PostgreSQL provider with proper data types
2. Create Terraform module for RDS PostgreSQL instance with Multi-AZ deployment
3. Configure RDS subnet group, parameter group, and security group integration
4. Setup automated backups, maintenance windows, and monitoring
5. Create database migration scripts to transfer existing SQLite data to PostgreSQL
6. Update server application configuration for PostgreSQL connection strings
7. Add environment variable management for database credentials and connection
8. Implement connection pooling and retry logic for production reliability
9. Create database initialization and seeding scripts for new environments
10. Ensure the following commands run without errors:

- `pnpm format`
- `pnpm dupcheck`
- `pnpm nx run rms:test --code-coverage`
- `pnpm nx run server:build:production`
- `pnpm nx run server:test --code-coverage`
- `pnpm nx run server:lint`
- `pnpm nx run rms:lint`
- `pnpm nx run rms:build:production`
- `pnpm nx run rms-e2e:lint`

## Tasks / Subtasks

- [ ] **Task 0: Infrastructure Retrofit to Nx App Structure** (Prerequisite)

  - [ ] Move existing `/infrastructure/` directory to `/apps/infrastructure/`
  - [ ] Create `apps/infrastructure/project.json` with Nx targets (plan, deploy, destroy)
  - [ ] Update any active J.2 GitHub task references to use `apps/infrastructure/` paths
  - [ ] Test Nx commands work: `nx plan infrastructure`
  - [ ] Update all remaining J.x stories (J.3-J.7) to use `apps/infrastructure/` paths
  - [ ] Validate story cross-references and path consistency

- [ ] **Task 1: Update Prisma schema for PostgreSQL compatibility** (AC: 1, 6)

  - [ ] Change datasource provider from "sqlite" to "postgresql"
  - [ ] Update data types for PostgreSQL compatibility (DateTime, UUID, etc.)
  - [ ] Review and update @default values for PostgreSQL-specific functions
  - [ ] Test schema changes with `prisma db push` against local PostgreSQL
  - [ ] Update DATABASE_URL format for PostgreSQL connection strings

- [ ] **Task 2: Create RDS Terraform module** (AC: 2, 3, 4)

  - [ ] Create `apps/infrastructure/modules/rds/main.tf` with PostgreSQL RDS instance
  - [ ] Configure DB subnet group using private subnets from VPC module
  - [ ] Setup DB parameter group with optimized PostgreSQL settings
  - [ ] Integrate with security group allowing access only from ECS security group
  - [ ] Configure automated backups with 7-day retention period
  - [ ] Setup maintenance window during low-traffic hours

- [ ] **Task 3: Configure RDS security and networking** (AC: 3, 7)

  - [ ] Create RDS security group allowing PostgreSQL traffic (port 5432)
  - [ ] Restrict access to ECS security group and bastion host (if needed)
  - [ ] Setup VPC endpoints for RDS if required for enhanced security
  - [ ] Configure encryption at rest with AWS KMS key
  - [ ] Setup connection string parameter in AWS Systems Manager
  - [ ] Add RDS monitoring role for CloudWatch metrics

- [ ] **Task 4: Implement data migration strategy** (AC: 5, 9)

  - [ ] Create migration script to export SQLite data to JSON/CSV format
  - [ ] Build PostgreSQL import script using Prisma client
  - [ ] Add data validation and integrity checking in migration process
  - [ ] Create rollback procedures in case of migration issues
  - [ ] Test migration process with development database copy
  - [ ] Create seeding script for fresh PostgreSQL databases

- [ ] **Task 5: Update server configuration for PostgreSQL** (AC: 6, 8)

  - [ ] Update `apps/server/src/app/prisma/prisma-client.ts` for connection pooling
  - [ ] Modify database connection configuration for production environment
  - [ ] Add retry logic and connection error handling
  - [ ] Implement graceful degradation for database connectivity issues
  - [ ] Update environment variable parsing for PostgreSQL URLs
  - [ ] Add database health check endpoint

- [ ] **Task 6: Environment variable and secrets management** (AC: 7)

  - [ ] Setup AWS Systems Manager Parameter Store for database configuration
  - [ ] Create environment-specific parameter naming convention
  - [ ] Update server startup to fetch parameters from AWS SSM
  - [ ] Add local development .env.example for PostgreSQL connection
  - [ ] Document environment variable requirements and formats
  - [ ] Implement secrets rotation strategy for database passwords

- [ ] **Task 7: Testing and validation** (AC: 1, 5, 8)
  - [ ] Create integration tests for PostgreSQL database operations
  - [ ] Test all existing API endpoints against PostgreSQL database
  - [ ] Validate data migration accuracy and completeness
  - [ ] Test connection pooling and concurrent access scenarios
  - [ ] Validate backup and recovery procedures
  - [ ] Performance testing with PostgreSQL vs SQLite baseline

## Dev Notes

### Previous Story Context

**Dependencies:** Story J.1 must be completed first, as this story requires the VPC, security groups, and IAM roles established in the infrastructure foundation.

### Data Models and Architecture

**Source: [prisma/schema.prisma]**

- Current SQLite schema with String @id @default(uuid()) patterns
- DateTime fields using SQLite-compatible formats
- Models: accounts, universe, trades, divDeposits, risk_group, settings

**Source: [apps/server/src/app/prisma/prisma-client.ts]**

- Current Prisma client instantiation and connection management
- Need to add connection pooling for PostgreSQL production use

**Source: [Epic J Technical Notes]**

- Target RDS PostgreSQL for production database
- Multi-AZ deployment for high availability
- Automated backups and point-in-time recovery

### File Locations

**Primary Files to Create:**

1. `/apps/infrastructure/modules/rds/main.tf` - RDS PostgreSQL instance configuration
2. `/apps/infrastructure/modules/rds/variables.tf` - RDS module variables
3. `/apps/infrastructure/modules/rds/outputs.tf` - RDS connection information
4. `/scripts/migrate-sqlite-to-postgres.ts` - Data migration script
5. `/scripts/seed-postgres.ts` - Database seeding for new environments
6. `/apps/server/.env.example` - PostgreSQL environment variables template

**Primary Files to Modify:**

1. `/prisma/schema.prisma` - Update database provider and data types
2. `/apps/server/src/app/prisma/prisma-client.ts` - Add connection pooling
3. `/apps/server/src/main.ts` - Add database health checks
4. `/apps/infrastructure/environments/dev/main.tf` - Include RDS module

**Test Files to Create:**

1. `/apps/server/src/app/prisma/prisma-client.spec.ts` - Test PostgreSQL connections
2. `/scripts/migrate-sqlite-to-postgres.spec.ts` - Test migration process
3. `/apps/server/src/app/routes/database-health.spec.ts` - Test health checks

### Technical Implementation Details

**Prisma Schema Updates:**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model accounts {
  id          String        @id @default(uuid())
  name        String        @unique
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt
  deletedAt   DateTime?
  version     Int           @default(1)
  // ... rest of model
}
```

**RDS Terraform Configuration:**

```hcl
resource "aws_db_instance" "rms_postgres" {
  identifier     = "rms-postgres-${var.environment}"
  engine         = "postgres"
  engine_version = "15.4"
  instance_class = "db.t3.micro"

  allocated_storage     = 20
  max_allocated_storage = 100
  storage_encrypted     = true

  db_name  = "rms"
  username = "rms_user"
  password = var.db_password

  vpc_security_group_ids = [aws_security_group.rds.id]
  db_subnet_group_name   = aws_db_subnet_group.rms.name

  backup_retention_period = 7
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"

  skip_final_snapshot = var.environment == "dev"

  tags = var.common_tags
}
```

**Connection String Format:**

```typescript
// PostgreSQL connection string format
const DATABASE_URL = 'postgresql://username:password@hostname:5432/database_name';

// Connection pooling configuration
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  // Connection pool settings for production
  __internal: {
    engine: {
      binaryTargets: ['native', 'linux-arm64-openssl-1.1.x'],
    },
  },
});
```

**Migration Script Structure:**

```typescript
async function migrateSQLiteToPostgreSQL() {
  // 1. Connect to SQLite database
  // 2. Export all table data to temporary JSON files
  // 3. Connect to PostgreSQL database
  // 4. Import data using Prisma client with transaction
  // 5. Validate data integrity
  // 6. Log migration results
}
```

**AWS Systems Manager Integration:**

```typescript
import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';

async function getDatabaseUrl(): Promise<string> {
  if (process.env.NODE_ENV === 'development') {
    return process.env.DATABASE_URL || '';
  }

  const ssmClient = new SSMClient({ region: 'us-east-1' });
  const parameter = await ssmClient.send(
    new GetParameterCommand({
      Name: `/rms/${process.env.ENVIRONMENT}/database-url`,
      WithDecryption: true,
    })
  );

  return parameter.Parameter?.Value || '';
}
```

**Production Considerations:**

- Connection pooling with appropriate pool size (5-10 connections for small apps)
- Connection timeout and retry logic with exponential backoff
- Graceful handling of connection drops and database maintenance
- Read replicas for read-heavy workloads (future enhancement)
- Point-in-time recovery configuration for data protection

### Testing Standards

**Source: [architecture/ci-and-testing.md]**

**Testing Framework:** Vitest for Node.js testing, Testcontainers for database testing
**Test Location:** Test files collocated with source files using `.spec.ts` extension
**Coverage Requirements:** Lines: 85%, Branches: 75%, Functions: 85%

**Testing Strategy:**

- **Unit Tests:** Test Prisma client configuration and connection logic
- **Integration Tests:** Test complete database operations with real PostgreSQL
- **Migration Tests:** Test data migration accuracy and rollback procedures
- **Performance Tests:** Compare PostgreSQL performance with SQLite baseline

**Database Testing Patterns:**

- Use Docker PostgreSQL container for consistent test environment
- Test connection pooling under concurrent load
- Validate all CRUD operations work correctly
- Test transaction rollback and error handling scenarios

**Key Test Scenarios:**

- All existing API endpoints work with PostgreSQL
- Data migration preserves all records and relationships
- Connection pooling prevents connection exhaustion
- Database health checks detect and report issues properly
- Environment variable configuration works in all environments

**Performance Benchmarks:**

- Query response time should be <= SQLite + 20%
- Connection establishment time should be < 500ms
- Concurrent user capacity should support 50+ simultaneous connections
- Database backup/restore procedures complete within acceptable timeframes

## Change Log

| Date       | Version | Description            | Author           |
| ---------- | ------- | ---------------------- | ---------------- |
| 2024-08-30 | 1.0     | Initial story creation | Scrum Master Bob |

## Dev Agent Record

_This section will be populated by the development agent during implementation_

### Agent Model Used

_To be filled by dev agent_

### Debug Log References

_To be filled by dev agent_

### Completion Notes List

_To be filled by dev agent_

### File List

_To be filled by dev agent_

## QA Results

_Results from QA Agent review will be populated here after implementation_
