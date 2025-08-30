# Story J.3: Backend Deployment with ECS Fargate

## Status
Draft

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

## Tasks / Subtasks

- [ ] **Task 1: Create optimized Dockerfile for Fastify application** (AC: 1)
  - [ ] Create multi-stage Dockerfile with Node.js 22 Alpine base image
  - [ ] Implement build stage for dependency installation and application build
  - [ ] Create production stage with minimal runtime dependencies
  - [ ] Add proper user permissions and security hardening
  - [ ] Configure EXPOSE port for Fastify server (default 3000)
  - [ ] Add health check command for container health monitoring

- [ ] **Task 2: Setup Amazon ECR repository and lifecycle policies** (AC: 2)
  - [ ] Create ECR repository using Terraform with proper naming convention
  - [ ] Configure lifecycle policies to manage image retention (keep 10 latest)
  - [ ] Setup repository policies for cross-account access if needed
  - [ ] Add image scanning configuration for security vulnerability detection
  - [ ] Configure encryption at rest for stored images
  - [ ] Add repository URI output for deployment pipeline integration

- [ ] **Task 3: Create ECS Terraform module** (AC: 3, 7)
  - [ ] Create `infrastructure/modules/ecs/main.tf` with cluster configuration
  - [ ] Define ECS task definition with Fargate launch type
  - [ ] Configure task definition with appropriate CPU and memory limits
  - [ ] Setup ECS service with desired count and deployment configuration
  - [ ] Configure CloudWatch log groups for container logging
  - [ ] Add proper IAM roles for task execution and application access

- [ ] **Task 4: Configure Application Load Balancer** (AC: 4)
  - [ ] Create ALB using existing ALB security group from Story J.1
  - [ ] Configure target group with health check endpoint (/health)
  - [ ] Setup ALB listener rules for HTTP and HTTPS traffic
  - [ ] Configure sticky sessions if required for application state
  - [ ] Add ALB access logs to S3 bucket for monitoring and debugging
  - [ ] Setup proper target group attributes for connection handling

- [ ] **Task 5: Implement auto-scaling configuration** (AC: 5)
  - [ ] Create Application Auto Scaling target for ECS service
  - [ ] Configure scaling policies for CPU utilization (target 70%)
  - [ ] Configure scaling policies for memory utilization (target 80%)
  - [ ] Set minimum capacity (1), maximum capacity (10) for cost control
  - [ ] Add CloudWatch alarms for scaling trigger events
  - [ ] Configure scale-out and scale-in cooldown periods

- [ ] **Task 6: Environment variable and secrets management** (AC: 6)
  - [ ] Create task definition environment variables for non-sensitive config
  - [ ] Setup AWS Systems Manager Parameter Store integration for secrets
  - [ ] Configure database connection string from RDS outputs
  - [ ] Add environment-specific variables (NODE_ENV, LOG_LEVEL)
  - [ ] Implement secrets rotation strategy for sensitive credentials
  - [ ] Add runtime environment variable validation

- [ ] **Task 7: Configure monitoring and logging** (AC: 7)
  - [ ] Setup CloudWatch log groups with appropriate retention periods
  - [ ] Configure structured logging format for better searchability
  - [ ] Add custom CloudWatch metrics for application-specific monitoring
  - [ ] Create CloudWatch dashboards for ECS service monitoring
  - [ ] Configure log streaming to CloudWatch Logs Insights
  - [ ] Add error rate and response time monitoring

- [ ] **Task 8: Create deployment pipeline integration** (AC: 8, 9)
  - [ ] Create build script for Docker image creation and tagging
  - [ ] Add ECR authentication and image push commands
  - [ ] Configure ECS service update with new task definition
  - [ ] Implement deployment rollback strategy for failed deployments
  - [ ] Add deployment success/failure notifications
  - [ ] Create deployment validation and smoke tests

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
3. `/infrastructure/modules/ecs/main.tf` - ECS cluster and service configuration
4. `/infrastructure/modules/ecs/variables.tf` - ECS module input variables
5. `/infrastructure/modules/ecs/outputs.tf` - ECS service information outputs
6. `/infrastructure/modules/alb/main.tf` - Application Load Balancer configuration
7. `/scripts/build-and-deploy.sh` - Deployment automation script
8. `/apps/server/src/app/routes/health/index.ts` - Health check endpoint

**Primary Files to Modify:**
1. `/apps/server/src/main.ts` - Add health check endpoint and graceful shutdown
2. `/infrastructure/environments/dev/main.tf` - Include ECS and ALB modules
3. `/apps/server/src/app/prisma/prisma-client.ts` - Add connection retry for ECS

**Test Files to Create:**
1. `/apps/server/src/app/routes/health/index.spec.ts` - Health check endpoint tests
2. `/infrastructure/modules/ecs/main.tf.spec.ts` - Terraform module tests
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

| Date | Version | Description | Author |
|------|---------|-------------|---------|
| 2024-08-30 | 1.0 | Initial story creation | Scrum Master Bob |

## Dev Agent Record
*This section will be populated by the development agent during implementation*

### Agent Model Used
*To be filled by dev agent*

### Debug Log References  
*To be filled by dev agent*

### Completion Notes List
*To be filled by dev agent*

### File List
*To be filled by dev agent*

## QA Results
*Results from QA Agent review will be populated here after implementation*