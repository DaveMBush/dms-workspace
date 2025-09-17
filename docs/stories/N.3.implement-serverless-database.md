# Story N.3: Implement Serverless Database Solution

## Status

Ready for Development

## Story

**As a** single-user application owner,
**I want** to replace the planned standard RDS PostgreSQL with Aurora Serverless v2,
**so that** I can save ~$50-80/month by automatically scaling database capacity to zero during idle periods.

## Acceptance Criteria

1. Configure Aurora Serverless v2 cluster to replace standard RDS PostgreSQL
2. Set minimum capacity to 0.5 ACU (Aurora Capacity Units) for cost optimization
3. Configure auto-pause after 5-10 minutes of inactivity for single-user scenario
4. Update application connection handling to manage serverless cold starts gracefully
5. Implement connection pooling with retry logic for serverless database connections
6. Migrate existing SQLite data to Aurora Serverless PostgreSQL
7. Configure automated backups with point-in-time recovery for serverless cluster
8. Update monitoring and alerting for serverless-specific metrics
9. Ensure application performance remains acceptable with cold start considerations
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

- [ ] **Task 1: Configure Aurora Serverless v2 infrastructure** (AC: 1, 2, 3, 7)

  - [ ] Create Aurora Serverless v2 cluster using Terraform
  - [ ] Configure minimum capacity at 0.5 ACU and maximum at 2 ACU
  - [ ] Set auto-pause delay to 300 seconds (5 minutes) for cost optimization
  - [ ] Configure cluster subnet group for single AZ deployment
  - [ ] Setup automated backups with 7-day retention for serverless cluster
  - [ ] Configure encryption at rest for serverless database

- [ ] **Task 2: Update database security and networking** (AC: 1)

  - [ ] Create security group for Aurora Serverless cluster
  - [ ] Configure VPC security groups to allow ECS access to Aurora
  - [ ] Update RDS subnet groups for Aurora Serverless deployment
  - [ ] Configure enhanced monitoring for serverless-specific metrics
  - [ ] Setup CloudWatch log exports for serverless PostgreSQL logs

- [ ] **Task 3: Implement connection pooling and retry logic** (AC: 4, 5)

  - [ ] Update Prisma configuration for serverless database connections
  - [ ] Implement connection pooling with PgBouncer or application-level pooling
  - [ ] Add retry logic for cold start scenarios (connection timeouts)
  - [ ] Configure connection timeout and retry parameters
  - [ ] Add graceful handling of serverless scaling events

- [ ] **Task 4: Migrate data from SQLite to Aurora Serverless** (AC: 6)

  - [ ] Create data migration script from SQLite to PostgreSQL
  - [ ] Implement schema migration using Prisma migrations
  - [ ] Create data validation procedures for migration verification
  - [ ] Setup rollback procedures in case migration fails
  - [ ] Test migration process in development environment

- [ ] **Task 5: Update application configuration** (AC: 4, 5, 9)

  - [ ] Update environment variables for Aurora Serverless connection
  - [ ] Configure Prisma client for serverless database specifics
  - [ ] Implement health check endpoint that handles cold starts
  - [ ] Add application-level caching to reduce database load
  - [ ] Update error handling for serverless-specific scenarios

- [ ] **Task 6: Configure monitoring and alerting** (AC: 8)
  - [ ] Setup CloudWatch metrics for Aurora Serverless capacity scaling
  - [ ] Configure alarms for cold start frequency and duration
  - [ ] Monitor database connection pool metrics
  - [ ] Setup cost monitoring for Aurora Serverless usage
  - [ ] Create dashboard for serverless database performance

## Dev Notes

### Previous Story Context

This story depends on Stories N.1 (NAT Gateway) and N.2 (Single AZ) and is part of the cost optimization epic for single-user deployment.

### Data Models and Architecture

**Current Plan (Standard RDS):**

```
Standard RDS PostgreSQL:
├── db.t3.micro instance (~$13/month base)
├── 20GB storage (~$2.50/month)
├── Always-on compute costs
└── Multi-AZ would add ~$50-100/month
Total: ~$60-115/month
```

**Target Architecture (Aurora Serverless v2):**

```
Aurora Serverless v2:
├── 0.5 ACU minimum when active (~$0.06/hour when running)
├── Auto-pause after 5 minutes idle
├── 20GB storage (~$2.50/month)
├── Capacity scaling: 0.5-2 ACU based on load
└── Pay-per-use model
Total: ~$10-25/month (based on usage patterns)
```

### File Locations

**Primary Files to Create:**

1. `/apps/infrastructure/modules/aurora-serverless/main.tf` - Aurora Serverless v2 cluster
2. `/apps/infrastructure/modules/aurora-serverless/variables.tf` - Serverless module variables
3. `/apps/infrastructure/modules/aurora-serverless/outputs.tf` - Cluster connection information
4. `/apps/server/src/app/database/serverless-connection.ts` - Serverless connection handling
5. `/scripts/migrate-to-aurora.sh` - Data migration script
6. `/docs/architecture/aurora-serverless-design.md` - Architecture documentation

**Primary Files to Modify:**

1. `/apps/server/src/app/prisma/prisma-client.ts` - Update for serverless configuration
2. `/apps/server/src/app/routes/health/index.ts` - Handle cold starts in health checks
3. `/apps/infrastructure/main.tf` - Replace RDS module with Aurora Serverless
4. `/apps/server/src/environments/environment.prod.ts` - Update database configuration

### Technical Implementation Details

**Aurora Serverless v2 Configuration:**

```hcl
resource "aws_rds_cluster" "aurora_serverless" {
  cluster_identifier      = "${var.project_name}-aurora-${var.environment}"
  engine                 = "aurora-postgresql"
  engine_mode            = "provisioned"
  engine_version         = "13.7"
  database_name          = var.database_name
  master_username        = var.database_username
  manage_master_user_password = true

  # Serverless v2 scaling configuration
  serverlessv2_scaling_configuration {
    max_capacity = var.max_capacity  # 2 ACU max for single user
    min_capacity = var.min_capacity  # 0.5 ACU minimum
  }

  # Auto-pause configuration
  auto_pause               = true
  seconds_until_auto_pause = 300  # 5 minutes

  # Single AZ configuration
  db_subnet_group_name   = aws_db_subnet_group.aurora.name
  vpc_security_group_ids = [aws_security_group.aurora.id]

  # Backup configuration
  backup_retention_period = 7
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"

  # Monitoring and logging
  enabled_cloudwatch_logs_exports = ["postgresql"]
  monitoring_interval             = 60
  monitoring_role_arn            = aws_iam_role.rds_enhanced_monitoring.arn

  # Encryption
  storage_encrypted = true
  kms_key_id       = aws_kms_key.aurora.arn

  tags = {
    Name = "${var.project_name}-aurora-${var.environment}"
    Type = "serverless-v2"
  }
}

resource "aws_rds_cluster_instance" "aurora_instance" {
  identifier         = "${var.project_name}-aurora-instance-${var.environment}"
  cluster_identifier = aws_rds_cluster.aurora_serverless.id
  instance_class     = "db.serverless"
  engine             = aws_rds_cluster.aurora_serverless.engine
  engine_version     = aws_rds_cluster.aurora_serverless.engine_version

  tags = {
    Name = "${var.project_name}-aurora-instance-${var.environment}"
  }
}
```

**Serverless Connection Handling:**

```typescript
// apps/server/src/app/database/serverless-connection.ts
import { PrismaClient } from '@prisma/client';

export class ServerlessConnection {
  private static instance: PrismaClient;
  private static readonly maxRetries = 3;
  private static readonly retryDelay = 1000; // 1 second

  static async getInstance(): Promise<PrismaClient> {
    if (!this.instance) {
      this.instance = new PrismaClient({
        datasources: {
          db: {
            url: process.env.DATABASE_URL,
          },
        },
        log: ['error', 'warn'],
      });

      // Connect with retry logic for cold starts
      await this.connectWithRetry();
    }

    return this.instance;
  }

  private static async connectWithRetry(attempt = 1): Promise<void> {
    try {
      await this.instance.$connect();
      console.log('Database connected successfully');
    } catch (error) {
      console.warn(`Database connection attempt ${attempt} failed:`, error);

      if (attempt < this.maxRetries) {
        console.log(`Retrying in ${this.retryDelay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, this.retryDelay));
        return this.connectWithRetry(attempt + 1);
      }

      throw new Error(`Failed to connect to database after ${this.maxRetries} attempts`);
    }
  }

  static async healthCheck(): Promise<boolean> {
    try {
      const client = await this.getInstance();
      await client.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      console.error('Database health check failed:', error);
      return false;
    }
  }

  static async disconnect(): Promise<void> {
    if (this.instance) {
      await this.instance.$disconnect();
    }
  }
}
```

**Updated Health Check with Cold Start Handling:**

```typescript
// apps/server/src/app/routes/health/index.ts
import { FastifyPluginAsync } from 'fastify';
import { ServerlessConnection } from '../../database/serverless-connection';

const healthRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/health', async (request, reply) => {
    const startTime = Date.now();

    try {
      // Health check with cold start tolerance
      const dbHealthy = await ServerlessConnection.healthCheck();
      const responseTime = Date.now() - startTime;

      if (dbHealthy) {
        return {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          database: 'connected',
          responseTime: `${responseTime}ms`,
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          serverless: {
            coldStart: responseTime > 2000, // Indicate if this was likely a cold start
            responseTime: responseTime,
          },
        };
      } else {
        reply.status(503);
        return {
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          database: 'disconnected',
          responseTime: `${responseTime}ms`,
          error: 'Database health check failed',
        };
      }
    } catch (error) {
      const responseTime = Date.now() - startTime;
      reply.status(503);
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        database: 'error',
        responseTime: `${responseTime}ms`,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });
};

export default healthRoutes;
```

**Data Migration Script:**

```bash
#!/bin/bash
# scripts/migrate-to-aurora.sh
set -e

ENVIRONMENT=${1:-dev}
BACKUP_FILE="sqlite-backup-$(date +%Y%m%d-%H%M%S).sql"

echo "Starting migration from SQLite to Aurora Serverless..."

# 1. Backup current SQLite data
echo "Creating SQLite backup..."
sqlite3 apps/server/prisma/dev.db .dump > $BACKUP_FILE

# 2. Apply Prisma migrations to Aurora
echo "Applying Prisma migrations to Aurora..."
DATABASE_URL=$AURORA_DATABASE_URL pnpm prisma migrate deploy

# 3. Transform and import data
echo "Transforming and importing data..."
# Custom data transformation script here
python scripts/transform-sqlite-to-postgres.py $BACKUP_FILE $AURORA_DATABASE_URL

# 4. Verify migration
echo "Verifying migration..."
DATABASE_URL=$AURORA_DATABASE_URL pnpm prisma db seed

echo "Migration completed successfully!"
echo "Backup saved as: $BACKUP_FILE"
```

**Cost Analysis:**

```
Standard RDS (Current Plan):
- db.t3.micro: $13.32/month (always on)
- 20GB GP2 storage: $2.50/month
- Backup storage: $1-2/month
- Total: ~$17-20/month minimum (single AZ)
- Multi-AZ would double compute costs

Aurora Serverless v2:
- 0.5 ACU minimum: $0.063/hour when active
- Auto-pause: $0/hour when paused
- Storage: $0.12/GB/month (Aurora storage)
- Backup: $0.021/GB/month

Single User Usage Pattern:
- Active 2-4 hours/day: ~$4-8/month compute
- 20GB storage: ~$2.40/month
- Backups: ~$0.50/month
- Total: ~$7-11/month

Estimated Monthly Savings: $6-14/month vs single AZ RDS
                          $50-100/month vs multi-AZ RDS
```

**Performance Considerations:**

- **Cold Start Latency**: 15-30 seconds for first request after pause
- **Warm Performance**: Similar to standard RDS once warmed up
- **Scaling**: Automatic scaling from 0.5 to 2 ACU based on load
- **Connection Handling**: Requires retry logic for cold starts
- **Monitoring**: Enhanced monitoring for scaling events

### Testing Standards

**Testing Framework:** Database migration validation, connection testing, performance testing
**Test Location:** Database tests with serverless-specific scenarios
**Coverage Requirements:** All database operations must work with serverless configuration

**Testing Strategy:**

- **Migration Tests**: Validate data migration from SQLite to Aurora
- **Connection Tests**: Test connection pooling and retry logic
- **Performance Tests**: Validate cold start and warm performance
- **Cost Tests**: Monitor actual usage costs vs estimates

**Key Test Scenarios:**

- Database migration completes without data loss
- Application handles cold starts gracefully
- Connection pooling works correctly with serverless scaling
- Auto-pause and auto-resume function as expected
- Performance is acceptable for single-user workload
- Cost monitoring shows expected savings

## Change Log

| Date       | Version | Description            | Author            |
| ---------- | ------- | ---------------------- | ----------------- |
| 2024-09-16 | 1.0     | Initial story creation | BMad Orchestrator |

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
