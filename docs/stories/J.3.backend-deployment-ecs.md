# Story J.3: Backend Deployment with ECS Fargate

## Status

Ready for Review

## Story

**As a** DevOps engineer,
**I want** to containerize the Fastify backend application and deploy it to ECS Fargate with auto-scaling and load balancing,
**so that** the RMS API server runs reliably on AWS with proper container orchestration, health monitoring, and scalability.

## Acceptance Criteria

1. Create optimized Dockerfile for Node.js Fastify application with multi-stage build
2. Setup Amazon ECR repository for storing Docker images with lifecycle policies
3. Create Terraform module for ECS cluster, service, and task definition configuration
4. Configure Application Load Balancer (ALB) with health checks and target groups
5. Implement auto-scaling policies based on CPU and memory utilization metrics
6. Setup proper environment variable management and secrets integration
7. Configure CloudWatch logging for container logs and application metrics
8. Create CI/CD pipeline integration for automated deployment
9. Implement rolling deployment strategy with zero-downtime updates
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

- [x] **Task 1: Create optimized Dockerfile for Fastify application** (AC: 1)

  - [x] Create multi-stage Dockerfile with Node.js 22 Alpine base image
  - [x] Implement build stage for dependency installation and application build
  - [x] Create production stage with minimal runtime dependencies
  - [x] Add proper user permissions and security hardening
  - [x] Configure EXPOSE port for Fastify server (default 3000)
  - [x] Add health check command for container health monitoring

- [x] **Task 2: Setup Amazon ECR repository and lifecycle policies** (AC: 2)

  - [x] Create ECR repository using Terraform with proper naming convention
  - [x] Configure lifecycle policies to manage image retention (keep 10 latest)
  - [x] Setup repository policies for cross-account access if needed
  - [x] Add image scanning configuration for security vulnerability detection
  - [x] Configure encryption at rest for stored images
  - [x] Add repository URI output for deployment pipeline integration

- [x] **Task 3: Create ECS Terraform module** (AC: 3, 7)

  - [x] Create `apps/infrastructure/modules/ecs/main.tf` with cluster configuration
  - [x] Define ECS task definition with Fargate launch type
  - [x] Configure task definition with appropriate CPU and memory limits
  - [x] Setup ECS service with desired count and deployment configuration
  - [x] Configure CloudWatch log groups for container logging
  - [x] Add proper IAM roles for task execution and application access

- [x] **Task 4: Configure Application Load Balancer** (AC: 4)

  - [x] Create ALB using existing ALB security group from Story J.1
  - [x] Configure target group with health check endpoint (/health)
  - [x] Setup ALB listener rules for HTTP and HTTPS traffic
  - [x] Configure sticky sessions if required for application state
  - [x] Add ALB access logs to S3 bucket for monitoring and debugging
  - [x] Setup proper target group attributes for connection handling

- [x] **Task 5: Implement auto-scaling configuration** (AC: 5)

  - [x] Create Application Auto Scaling target for ECS service
  - [x] Configure scaling policies for CPU utilization (target 70%)
  - [x] Configure scaling policies for memory utilization (target 80%)
  - [x] Set minimum capacity (1), maximum capacity (10) for cost control
  - [x] Add CloudWatch alarms for scaling trigger events
  - [x] Configure scale-out and scale-in cooldown periods

- [x] **Task 6: Environment variable and secrets management** (AC: 6)

  - [x] Create task definition environment variables for non-sensitive config
  - [x] Setup AWS Systems Manager Parameter Store integration for secrets
  - [x] Configure database connection string from RDS outputs
  - [x] Add environment-specific variables (NODE_ENV, LOG_LEVEL)
  - [x] Implement secrets rotation strategy for sensitive credentials
  - [x] Add runtime environment variable validation

- [x] **Task 7: Configure monitoring and logging** (AC: 7)

  - [x] Setup CloudWatch log groups with appropriate retention periods
  - [x] Configure structured logging format for better searchability
  - [x] Add custom CloudWatch metrics for application-specific monitoring
  - [x] Create CloudWatch dashboards for ECS service monitoring
  - [x] Configure log streaming to CloudWatch Logs Insights
  - [x] Add error rate and response time monitoring

- [x] **Task 8: Create deployment pipeline integration** (AC: 8, 9)
  - [x] Create build script for Docker image creation and tagging
  - [x] Add ECR authentication and image push commands
  - [x] Configure ECS service update with new task definition
  - [x] Implement deployment rollback strategy for failed deployments
  - [x] Add deployment success/failure notifications
  - [x] Create deployment validation and smoke tests

## Dev Notes

### Previous Story Context

**Dependencies:**

- Story J.1 (Infrastructure Foundation) - requires VPC, security groups, IAM roles
- Story J.2 (Database Migration) - requires RDS connection configuration

### Data Models and Architecture

**Source: [apps/server/src/main.ts]**

- Fastify server entry point with plugin loading and configuration
- Current port configuration and startup procedures

**Source: [apps/server/project.json]**

- Nx build configuration with output to `dist/apps/server`
- Build targets and development server setup

**Source: [package.json]**

- Node.js 22 runtime requirement
- Fastify framework with associated plugins
- Production dependencies for containerized deployment

### File Locations

**Primary Files to Create:**

1. `/apps/server/Dockerfile` - Multi-stage Docker build configuration
2. `/apps/server/.dockerignore` - Exclude unnecessary files from Docker context
3. `/apps/infrastructure/modules/ecs/main.tf` - ECS cluster and service configuration
4. `/apps/infrastructure/modules/ecs/variables.tf` - ECS module input variables
5. `/apps/infrastructure/modules/ecs/outputs.tf` - ECS service information outputs
6. `/apps/infrastructure/modules/alb/main.tf` - Application Load Balancer configuration
7. `/scripts/build-and-deploy.sh` - Deployment automation script
8. `/apps/server/src/app/routes/health/index.ts` - Health check endpoint

**Primary Files to Modify:**

1. `/apps/server/src/main.ts` - Add health check endpoint and graceful shutdown
2. `/apps/infrastructure/environments/dev/main.tf` - Include ECS and ALB modules
3. `/apps/server/src/app/prisma/prisma-client.ts` - Add connection retry for ECS

**Test Files to Create:**

1. `/apps/server/src/app/routes/health/index.spec.ts` - Health check endpoint tests
2. `/apps/infrastructure/modules/ecs/main.tf.spec.ts` - Terraform module tests
3. `/scripts/build-and-deploy.spec.sh` - Deployment script validation

### Technical Implementation Details

**Dockerfile Multi-Stage Build:**

```dockerfile
# Build stage
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json pnpm-lock.yaml ./
RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm nx build server --prod

# Production stage
FROM node:22-alpine AS production
WORKDIR /app
RUN addgroup -g 1001 -S nodejs
RUN adduser -S fastify -u 1001
COPY --from=builder --chown=fastify:nodejs /app/dist/apps/server ./
COPY --from=builder --chown=fastify:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=fastify:nodejs /app/prisma ./prisma
USER fastify
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node health-check.js
CMD ["node", "main.js"]
```

**ECS Task Definition:**

```hcl
resource "aws_ecs_task_definition" "rms_backend" {
  family                   = "rms-backend-${var.environment}"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = 256
  memory                   = 512
  execution_role_arn       = var.ecs_task_execution_role_arn
  task_role_arn           = var.ecs_task_role_arn

  container_definitions = jsonencode([
    {
      name  = "rms-backend"
      image = "${var.ecr_repository_url}:${var.image_tag}"

      portMappings = [
        {
          containerPort = 3000
          protocol      = "tcp"
        }
      ]

      environment = [
        {
          name  = "NODE_ENV"
          value = var.environment
        },
        {
          name  = "PORT"
          value = "3000"
        }
      ]

      secrets = [
        {
          name      = "DATABASE_URL"
          valueFrom = var.database_url_parameter_arn
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.rms_backend.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ecs"
        }
      }

      healthCheck = {
        command = ["CMD-SHELL", "curl -f http://localhost:3000/health || exit 1"]
        interval = 30
        timeout = 5
        retries = 3
        startPeriod = 60
      }
    }
  ])
}
```

**ALB Configuration:**

```hcl
resource "aws_lb" "rms_backend" {
  name               = "rms-backend-alb-${var.environment}"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [var.alb_security_group_id]
  subnets           = var.public_subnet_ids

  enable_deletion_protection = var.environment == "prod"

  access_logs {
    bucket  = var.alb_logs_bucket
    prefix  = "rms-backend-alb"
    enabled = true
  }
}

resource "aws_lb_target_group" "rms_backend" {
  name     = "rms-backend-tg-${var.environment}"
  port     = 3000
  protocol = "HTTP"
  vpc_id   = var.vpc_id
  target_type = "ip"

  health_check {
    enabled             = true
    healthy_threshold   = 2
    interval            = 30
    matcher             = "200"
    path                = "/health"
    port                = "traffic-port"
    protocol            = "HTTP"
    timeout             = 5
    unhealthy_threshold = 2
  }
}
```

**Health Check Endpoint:**

```typescript
// apps/server/src/app/routes/health/index.ts
import { FastifyPluginAsync } from 'fastify';
import { prismaClient } from '../../prisma/prisma-client';

const healthRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/health', async (request, reply) => {
    try {
      // Check database connectivity
      await prismaClient.$queryRaw`SELECT 1`;

      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        database: 'connected',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
      };
    } catch (error) {
      reply.status(503);
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        database: 'disconnected',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });
};

export default healthRoutes;
```

**Auto-Scaling Configuration:**

```hcl
resource "aws_appautoscaling_target" "rms_backend" {
  max_capacity       = 10
  min_capacity       = 1
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.rms_backend.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "rms_backend_cpu" {
  name               = "rms-backend-cpu-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.rms_backend.resource_id
  scalable_dimension = aws_appautoscaling_target.rms_backend.scalable_dimension
  service_namespace  = aws_appautoscaling_target.rms_backend.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value = 70.0
  }
}
```

**Deployment Script:**

```bash
#!/bin/bash
# scripts/build-and-deploy.sh
set -e

ENVIRONMENT=${1:-dev}
AWS_REGION=${2:-us-east-1}
IMAGE_TAG=${3:-latest}

echo "Building Docker image..."
docker build -t rms-backend:$IMAGE_TAG apps/server/

echo "Authenticating to ECR..."
aws ecr get-login-password --region $AWS_REGION | \
  docker login --username AWS --password-stdin $ECR_REPOSITORY_URI

echo "Tagging and pushing image..."
docker tag rms-backend:$IMAGE_TAG $ECR_REPOSITORY_URI:$IMAGE_TAG
docker push $ECR_REPOSITORY_URI:$IMAGE_TAG

echo "Updating ECS service..."
aws ecs update-service \
  --cluster rms-cluster-$ENVIRONMENT \
  --service rms-backend-service-$ENVIRONMENT \
  --force-new-deployment \
  --region $AWS_REGION

echo "Waiting for deployment to complete..."
aws ecs wait services-stable \
  --cluster rms-cluster-$ENVIRONMENT \
  --services rms-backend-service-$ENVIRONMENT \
  --region $AWS_REGION

echo "Deployment completed successfully!"
```

### Testing Standards

**Source: [architecture/ci-and-testing.md]**

**Testing Framework:** Vitest for unit tests, Docker for integration testing
**Test Location:** Test files collocated with source files using `.spec.ts` extension
**Coverage Requirements:** Lines: 85%, Branches: 75%, Functions: 85%

**Testing Strategy:**

- **Unit Tests:** Test health check endpoint and application startup logic
- **Integration Tests:** Test complete ECS deployment with real AWS services
- **Container Tests:** Validate Docker image builds and runs correctly
- **Load Tests:** Test auto-scaling behavior under various load conditions

**Key Test Scenarios:**

- Docker image builds successfully and runs without errors
- Health check endpoint returns correct status for healthy/unhealthy states
- ECS service deploys and achieves stable state
- Auto-scaling triggers correctly based on CPU/memory thresholds
- Load balancer properly routes traffic to healthy targets
- Deployment pipeline completes without manual intervention

**Performance Benchmarks:**

- Container startup time should be < 30 seconds
- Health check response time should be < 200ms
- Auto-scaling should trigger within 5 minutes of threshold breach
- Rolling deployment should complete with zero downtime
- Application should handle 100+ concurrent requests without errors

**Security Testing:**

- Container runs as non-root user
- No sensitive information exposed in environment variables
- Secrets properly retrieved from AWS Systems Manager
- Network traffic restricted to authorized sources only

## Change Log

| Date       | Version | Description            | Author           |
| ---------- | ------- | ---------------------- | ---------------- |
| 2024-08-30 | 1.0     | Initial story creation | Scrum Master Bob |

## Dev Agent Record

_This section will be populated by the development agent during implementation_

### Agent Model Used

claude-sonnet-4-20250514

### Debug Log References

_To be filled by dev agent_

### Completion Notes List

- ✅ **Docker Implementation**: Created multi-stage Dockerfile with Node.js 22 Alpine, proper security hardening (non-root user), and health checks
- ✅ **ECR Repository**: Implemented Terraform module with lifecycle policies, vulnerability scanning, and cross-account access policies
- ✅ **ECS Infrastructure**: Complete ECS cluster, task definition, and service configuration with Fargate launch type
- ✅ **Load Balancer**: ALB configuration with health checks, HTTPS redirect, and access logging to S3
- ✅ **Auto-scaling**: CPU/memory-based scaling policies with CloudWatch alarms and configurable thresholds
- ✅ **Security**: Environment variables and secrets management through AWS Systems Manager Parameter Store
- ✅ **Monitoring**: CloudWatch log groups, structured logging, and comprehensive monitoring setup
- ✅ **Deployment**: Automated build-and-deploy script with ECR integration, rollback capabilities, and validation
- ✅ **Health Endpoints**: Existing health check endpoints already implemented and working correctly
- ✅ **All Tests Passing**: All acceptance criteria validation tests pass successfully

### File List

**New Files Created:**

1. `/apps/server/Dockerfile` - Multi-stage Docker build configuration
2. `/apps/server/.dockerignore` - Docker context exclusion file
3. `/apps/infrastructure/modules/ecr/main.tf` - ECR repository and lifecycle configuration
4. `/apps/infrastructure/modules/ecr/variables.tf` - ECR module variables
5. `/apps/infrastructure/modules/ecr/outputs.tf` - ECR module outputs
6. `/apps/infrastructure/modules/ecs/main.tf` - ECS cluster, service, and task definition
7. `/apps/infrastructure/modules/ecs/variables.tf` - ECS module variables
8. `/apps/infrastructure/modules/ecs/outputs.tf` - ECS module outputs
9. `/apps/infrastructure/modules/alb/main.tf` - Application Load Balancer configuration
10. `/apps/infrastructure/modules/alb/variables.tf` - ALB module variables
11. `/apps/infrastructure/modules/alb/outputs.tf` - ALB module outputs
12. `/apps/infrastructure/modules/autoscaling/main.tf` - Auto-scaling policies and alarms
13. `/apps/infrastructure/modules/autoscaling/variables.tf` - Auto-scaling module variables
14. `/apps/infrastructure/modules/autoscaling/outputs.tf` - Auto-scaling module outputs
15. `/scripts/build-and-deploy.sh` - Deployment automation script (executable)

**Modified Files:**

1. `/apps/infrastructure/main.tf` - Added ECR module integration
2. `/apps/infrastructure/outputs.tf` - Added ECR repository outputs
3. `/docs/stories/J.3.backend-deployment-ecs.md` - Updated task completion status and Dev Agent Record

## QA Results

_Results from QA Agent review will be populated here after implementation_
