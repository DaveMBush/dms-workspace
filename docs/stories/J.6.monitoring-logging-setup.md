# Story J.6: Monitoring and Logging Setup

## Status

Draft

## Story

**As a** DevOps engineer,
**I want** to implement comprehensive monitoring, logging, and alerting for the RMS AWS infrastructure and applications,
**so that** I can proactively identify issues, track performance metrics, and maintain system reliability with proper observability.

## Acceptance Criteria

1. Configure CloudWatch log groups for ECS containers, ALB, and application logs
2. Setup CloudWatch metrics and custom metrics for application performance monitoring
3. Create CloudWatch dashboards for infrastructure and application monitoring
4. Configure CloudWatch alarms for critical metrics (CPU, memory, error rates, latency)
5. Setup SNS topics and notifications for alert management
6. Implement structured logging format for better log analysis and searching
7. Configure log retention policies and cost optimization for log storage
8. Setup AWS X-Ray for distributed tracing and performance analysis
9. Create cost monitoring and budgeting alerts for AWS resource usage
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

- [ ] **Task 1: Configure CloudWatch log groups and retention** (AC: 1, 7)

  - [ ] Create log groups for ECS containers with appropriate retention periods
  - [ ] Setup ALB access logs with S3 storage and lifecycle policies
  - [ ] Configure CloudFront logs for frontend access patterns
  - [ ] Create RDS performance logs and slow query logging
  - [ ] Setup VPC Flow Logs for network traffic analysis
  - [ ] Configure log retention based on environment (dev: 7 days, prod: 90 days)

- [ ] **Task 2: Implement structured logging in applications** (AC: 6)

  - [ ] Update Fastify backend to use structured JSON logging format
  - [ ] Add correlation IDs for request tracing across services
  - [ ] Configure log levels and filtering for different environments
  - [ ] Add contextual information (user ID, session ID, request ID)
  - [ ] Implement log sampling for high-volume operations
  - [ ] Add security event logging for authentication and authorization

- [ ] **Task 3: Setup CloudWatch metrics and custom metrics** (AC: 2)

  - [ ] Configure ECS service metrics (CPU, memory, task count)
  - [ ] Setup ALB metrics (request count, latency, error rates)
  - [ ] Add RDS performance metrics (connections, CPU, disk I/O)
  - [ ] Create custom application metrics (business KPIs, user actions)
  - [ ] Configure CloudFront metrics (cache hit ratio, origin latency)
  - [ ] Setup billing and cost metrics for budget monitoring

- [ ] **Task 4: Create comprehensive CloudWatch dashboards** (AC: 3)

  - [ ] Build infrastructure overview dashboard (ECS, RDS, ALB, CloudFront)
  - [ ] Create application performance dashboard (response times, error rates)
  - [ ] Setup business metrics dashboard (user activity, feature usage)
  - [ ] Add cost and billing dashboard for resource optimization
  - [ ] Configure real-time monitoring dashboard for operations team
  - [ ] Create environment-specific dashboards (dev, staging, prod)

- [ ] **Task 5: Configure CloudWatch alarms and thresholds** (AC: 4)

  - [ ] Create high-priority alarms for service availability (>1% error rate)
  - [ ] Setup performance alarms for response time degradation (>2s avg)
  - [ ] Configure resource utilization alarms (CPU >80%, memory >85%)
  - [ ] Add database alarms (connection count, slow queries, deadlocks)
  - [ ] Create security alarms for suspicious activity patterns
  - [ ] Setup composite alarms for complex failure scenarios

- [ ] **Task 6: Setup SNS topics and notification routing** (AC: 5)

  - [ ] Create SNS topics for different alert severities (critical, warning, info)
  - [ ] Configure email notifications for development team
  - [ ] Setup Slack integration for real-time team notifications
  - [ ] Add PagerDuty integration for on-call escalation
  - [ ] Configure notification filtering to prevent alert fatigue
  - [ ] Setup notification templates and message formatting

- [ ] **Task 7: Implement AWS X-Ray distributed tracing** (AC: 8)

  - [ ] Enable X-Ray tracing for ECS containers and ALB
  - [ ] Add X-Ray SDK to Fastify backend application
  - [ ] Configure tracing for database operations and external API calls
  - [ ] Setup service map visualization for request flow analysis
  - [ ] Add custom annotations and metadata for business context
  - [ ] Configure sampling rules to control tracing overhead

- [ ] **Task 8: Setup cost monitoring and budgeting** (AC: 9)
  - [ ] Create AWS Budgets for monthly spending limits by service
  - [ ] Configure budget alerts for 80% and 100% thresholds
  - [ ] Setup cost anomaly detection for unusual spending patterns
  - [ ] Create cost allocation tags for better resource attribution
  - [ ] Add daily cost monitoring dashboard and reports
  - [ ] Configure automated cost optimization recommendations

## Dev Notes

### Previous Story Context

**Dependencies:**

- All previous stories J.1-J.5 - monitoring requires deployed infrastructure and applications
- Specifically needs ECS services, ALB, RDS, CloudFront distributions

### Data Models and Architecture

**Source: [apps/server/src/utils/logger.ts]**

- Existing logger implementation using Winston or similar framework
- Need to enhance for structured logging and CloudWatch integration

**Source: [Epic J Technical Notes]**

- CloudWatch as primary monitoring solution
- Cost-conscious approach with appropriate retention and sampling

### File Locations

**Primary Files to Create:**

1. `/apps/infrastructure/modules/monitoring/main.tf` - CloudWatch resources and alarms
2. `/apps/infrastructure/modules/monitoring/variables.tf` - Monitoring module variables
3. `/apps/infrastructure/modules/monitoring/outputs.tf` - Monitoring resource outputs
4. `/apps/infrastructure/modules/monitoring/dashboards.json` - Dashboard configurations
5. `/apps/server/src/utils/structured-logger.ts` - Enhanced logging utility
6. `/apps/server/src/middleware/tracing.ts` - X-Ray tracing middleware
7. `/scripts/setup-monitoring.sh` - Monitoring setup automation
8. `/monitoring/alerts.yaml` - Alert configuration definitions

**Primary Files to Modify:**

1. `/apps/server/src/utils/logger.ts` - Enhance with structured logging
2. `/apps/server/src/main.ts` - Add tracing and monitoring middleware
3. `/apps/infrastructure/environments/dev/main.tf` - Include monitoring module
4. `/apps/server/package.json` - Add X-Ray and monitoring dependencies

**Test Files to Create:**

1. `/apps/server/src/utils/structured-logger.spec.ts` - Test logging functionality
2. `/apps/server/src/middleware/tracing.spec.ts` - Test tracing implementation
3. `/e2e/monitoring-validation.spec.ts` - End-to-end monitoring tests

### Technical Implementation Details

**CloudWatch Log Groups Configuration:**

```hcl
resource "aws_cloudwatch_log_group" "ecs_application" {
  name              = "/aws/ecs/rms-backend-${var.environment}"
  retention_in_days = var.environment == "prod" ? 90 : 7

  tags = var.common_tags
}

resource "aws_cloudwatch_log_group" "alb_access" {
  name              = "/aws/applicationloadbalancer/rms-alb-${var.environment}"
  retention_in_days = var.environment == "prod" ? 30 : 7

  tags = var.common_tags
}

resource "aws_cloudwatch_log_group" "rds_performance" {
  name              = "/aws/rds/instance/rms-postgres-${var.environment}/postgresql"
  retention_in_days = var.environment == "prod" ? 30 : 7

  tags = var.common_tags
}
```

**Structured Logging Implementation:**

```typescript
// apps/server/src/utils/structured-logger.ts
import { createLogger, format, transports } from 'winston';
import { AsyncLocalStorage } from 'async_hooks';

interface LogContext {
  requestId: string;
  userId?: string;
  sessionId?: string;
  traceId?: string;
}

export class StructuredLogger {
  private logger: winston.Logger;
  private contextStorage = new AsyncLocalStorage<LogContext>();

  constructor() {
    this.logger = createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: format.combine(
        format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
        format.errors({ stack: true }),
        format.json(),
        format.printf((info) => {
          const context = this.contextStorage.getStore();
          return JSON.stringify({
            timestamp: info.timestamp,
            level: info.level.toUpperCase(),
            message: info.message,
            service: 'rms-backend',
            environment: process.env.NODE_ENV || 'development',
            ...context,
            ...info.meta,
            ...(info.stack && { stack: info.stack }),
          });
        })
      ),
      transports: [new transports.Console(), ...(process.env.NODE_ENV === 'production' ? [new transports.File({ filename: '/var/log/app.log' })] : [])],
    });
  }

  setContext(context: LogContext, callback: () => void) {
    this.contextStorage.run(context, callback);
  }

  info(message: string, meta?: any) {
    this.logger.info(message, { meta });
  }

  error(message: string, error?: Error, meta?: any) {
    this.logger.error(message, {
      meta: {
        ...meta,
        error: error
          ? {
              name: error.name,
              message: error.message,
              stack: error.stack,
            }
          : undefined,
      },
    });
  }

  warn(message: string, meta?: any) {
    this.logger.warn(message, { meta });
  }

  debug(message: string, meta?: any) {
    this.logger.debug(message, { meta });
  }
}

export const logger = new StructuredLogger();
```

**CloudWatch Alarms Configuration:**

```hcl
# High error rate alarm
resource "aws_cloudwatch_metric_alarm" "high_error_rate" {
  alarm_name          = "rms-high-error-rate-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "HTTPCode_Target_5XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = "300"
  statistic           = "Sum"
  threshold           = "10"
  alarm_description   = "High error rate detected"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  ok_actions          = [aws_sns_topic.alerts.arn]

  dimensions = {
    LoadBalancer = var.alb_arn_suffix
  }

  treat_missing_data = "notBreaching"
  tags               = var.common_tags
}

# High response time alarm
resource "aws_cloudwatch_metric_alarm" "high_response_time" {
  alarm_name          = "rms-high-response-time-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "3"
  metric_name         = "TargetResponseTime"
  namespace           = "AWS/ApplicationELB"
  period              = "300"
  statistic           = "Average"
  threshold           = "2.0"
  alarm_description   = "High response time detected"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  ok_actions          = [aws_sns_topic.alerts.arn]

  dimensions = {
    LoadBalancer = var.alb_arn_suffix
  }

  treat_missing_data = "notBreaching"
  tags               = var.common_tags
}

# ECS service CPU utilization
resource "aws_cloudwatch_metric_alarm" "ecs_cpu_high" {
  alarm_name          = "rms-ecs-cpu-high-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "ECS CPU utilization is high"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    ServiceName = var.ecs_service_name
    ClusterName = var.ecs_cluster_name
  }

  tags = var.common_tags
}
```

**CloudWatch Dashboard Configuration:**

```json
{
  "widgets": [
    {
      "type": "metric",
      "x": 0,
      "y": 0,
      "width": 12,
      "height": 6,
      "properties": {
        "metrics": [
          ["AWS/ApplicationELB", "RequestCount", "LoadBalancer", "${alb_name}"],
          [".", "HTTPCode_Target_2XX_Count", ".", "."],
          [".", "HTTPCode_Target_4XX_Count", ".", "."],
          [".", "HTTPCode_Target_5XX_Count", ".", "."]
        ],
        "view": "timeSeries",
        "stacked": false,
        "region": "${aws_region}",
        "title": "ALB Request Counts",
        "period": 300,
        "stat": "Sum"
      }
    },
    {
      "type": "metric",
      "x": 12,
      "y": 0,
      "width": 12,
      "height": 6,
      "properties": {
        "metrics": [["AWS/ApplicationELB", "TargetResponseTime", "LoadBalancer", "${alb_name}"]],
        "view": "timeSeries",
        "stacked": false,
        "region": "${aws_region}",
        "title": "Response Time",
        "period": 300,
        "stat": "Average"
      }
    },
    {
      "type": "metric",
      "x": 0,
      "y": 6,
      "width": 12,
      "height": 6,
      "properties": {
        "metrics": [
          ["AWS/ECS", "CPUUtilization", "ServiceName", "${ecs_service_name}", "ClusterName", "${ecs_cluster_name}"],
          [".", "MemoryUtilization", ".", ".", ".", "."]
        ],
        "view": "timeSeries",
        "stacked": false,
        "region": "${aws_region}",
        "title": "ECS Resource Utilization",
        "period": 300,
        "stat": "Average"
      }
    }
  ]
}
```

**X-Ray Tracing Middleware:**

```typescript
// apps/server/src/middleware/tracing.ts
import * as AWSXRay from 'aws-xray-sdk-core';
import { FastifyRequest, FastifyReply } from 'fastify';

// Configure X-Ray
AWSXRay.config([AWSXRay.plugins.ECSPlugin, AWSXRay.plugins.ElasticBeanstalkPlugin]);

export const tracingMiddleware = async (request: FastifyRequest, reply: FastifyReply) => {
  const segment = AWSXRay.getSegment();

  if (segment) {
    // Add request metadata
    segment.addAnnotation('method', request.method);
    segment.addAnnotation('url', request.url);
    segment.addAnnotation('user_agent', request.headers['user-agent'] || '');

    // Add custom business context
    if (request.headers.authorization) {
      segment.addAnnotation('authenticated', true);
    }

    // Add request ID for correlation
    const requestId = request.id || `req-${Date.now()}-${Math.random()}`;
    segment.addAnnotation('request_id', requestId);
    request.requestId = requestId;
  }
};

export const captureDBQuery = (query: string, params?: any[]) => {
  const segment = AWSXRay.getSegment();
  if (segment) {
    const subsegment = segment.addNewSubsegment('database_query');
    subsegment.addAnnotation('query_type', query.split(' ')[0].toUpperCase());
    subsegment.addMetadata('query', { sql: query, params });

    return {
      close: (error?: Error) => {
        if (error) {
          subsegment.addError(error);
        }
        subsegment.close();
      },
    };
  }
  return { close: () => {} };
};
```

**Cost Monitoring Configuration:**

```hcl
resource "aws_budgets_budget" "monthly_cost" {
  name         = "rms-monthly-budget-${var.environment}"
  budget_type  = "COST"
  limit_amount = var.environment == "prod" ? "100" : "20"
  limit_unit   = "USD"
  time_unit    = "MONTHLY"
  time_period_start = "2024-01-01_00:00"

  cost_filters = {
    Service = [
      "Amazon Elastic Compute Cloud - Compute",
      "Amazon Relational Database Service",
      "Amazon Simple Storage Service",
      "Amazon CloudFront"
    ]
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                 = 80
    threshold_type            = "PERCENTAGE"
    notification_type         = "ACTUAL"
    subscriber_email_addresses = [var.notification_email]
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                 = 100
    threshold_type            = "PERCENTAGE"
    notification_type          = "FORECASTED"
    subscriber_email_addresses = [var.notification_email]
  }
}

resource "aws_ce_anomaly_detector" "cost_anomaly" {
  name     = "rms-cost-anomaly-${var.environment}"
  type     = "DIMENSIONAL"
  frequency = "DAILY"

  dimension_key = "SERVICE"
  match_options = ["EQUALS"]
  values        = ["EC2-Instance", "RDS", "S3", "CloudFront"]

  tags = var.common_tags
}
```

**SNS Topic and Notifications:**

```hcl
resource "aws_sns_topic" "alerts" {
  name = "rms-alerts-${var.environment}"

  tags = var.common_tags
}

resource "aws_sns_topic_subscription" "email_alerts" {
  count     = length(var.alert_emails)
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = var.alert_emails[count.index]
}

# Slack webhook subscription (if Slack URL provided)
resource "aws_sns_topic_subscription" "slack_alerts" {
  count     = var.slack_webhook_url != "" ? 1 : 0
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "https"
  endpoint  = var.slack_webhook_url
}
```

### Testing Standards

**Source: [architecture/ci-and-testing.md]**

**Testing Framework:** Jest/Vitest for unit tests, custom scripts for monitoring validation
**Test Location:** Test files collocated with source files using `.spec.ts` extension
**Coverage Requirements:** All monitoring components should have validation tests

**Testing Strategy:**

- **Unit Tests:** Test logging functionality and tracing middleware
- **Integration Tests:** Test CloudWatch metrics and alarm functionality
- **Monitoring Tests:** Validate dashboards display correct data
- **Alert Tests:** Test notification delivery and escalation

**Key Test Scenarios:**

- Structured logging produces correct JSON format
- X-Ray traces are captured and transmitted correctly
- CloudWatch alarms trigger when thresholds are exceeded
- Notifications are delivered to correct channels
- Dashboards display real-time metrics accurately
- Cost alerts trigger at configured thresholds

**Performance Benchmarks:**

- Logging overhead should be < 5% of request processing time
- Tracing should add < 10ms to request latency
- Metric collection should not impact application performance
- Alert notification latency should be < 5 minutes

**Monitoring Validation:**

- All services have appropriate health checks
- Error rates and response times are within acceptable ranges
- Resource utilization metrics are collected and displayed
- Cost metrics are accurate and up-to-date

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
