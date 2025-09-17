# Story N.2: Single AZ Deployment Configuration

## Status

Ready for Development

## Story

**As a** single-user application owner,
**I want** to deploy all infrastructure components in a single Availability Zone,
**so that** I can reduce redundancy costs by ~$20-30/month while accepting reduced availability for my personal use case.

## Acceptance Criteria

1. Configure VPC with subnets in single AZ (us-east-1a) instead of multi-AZ
2. Update ECS service to run tasks in single AZ only
3. Modify RDS configuration for single AZ deployment (no Multi-AZ redundancy)
4. Update load balancer configuration to operate in single AZ
5. Ensure all infrastructure components are deployed in us-east-1a
6. Document availability trade-offs and recovery procedures for single AZ risks
7. Implement automated backups and recovery procedures for single AZ deployment
8. Update monitoring to account for single point of failure scenarios
9. Ensure the following commands run without errors:

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

- [ ] **Task 1: Modify VPC configuration for single AZ** (AC: 1, 5)

  - [ ] Update `availability_zones` variable to use only `["us-east-1a"]`
  - [ ] Modify subnet creation to deploy in single AZ
  - [ ] Update route table associations for single AZ
  - [ ] Ensure Internet Gateway and routing work correctly
  - [ ] Update VPC module variables and outputs

- [ ] **Task 2: Update ECS configuration for single AZ deployment** (AC: 2, 5)

  - [ ] Modify ECS service configuration to use single AZ subnet
  - [ ] Update ECS cluster configuration for single AZ
  - [ ] Ensure service discovery works within single AZ
  - [ ] Configure ECS task placement strategies for single AZ
  - [ ] Update auto-scaling policies for single AZ constraints

- [ ] **Task 3: Configure RDS for single AZ deployment** (AC: 3, 5)

  - [ ] Set `multi_az = false` in RDS configuration
  - [ ] Configure RDS subnet group for single AZ
  - [ ] Update RDS security groups for single AZ access
  - [ ] Configure automated backups with point-in-time recovery
  - [ ] Set up backup retention policy (7-14 days minimum)

- [ ] **Task 4: Update Load Balancer for single AZ** (AC: 4, 5)

  - [ ] Configure ALB to operate in single public subnet
  - [ ] Update ALB target group for single AZ targets
  - [ ] Ensure ALB health checks work with single AZ ECS tasks
  - [ ] Update ALB security groups for single AZ deployment
  - [ ] Configure ALB logging and monitoring for single AZ

- [ ] **Task 5: Implement backup and recovery procedures** (AC: 6, 7)

  - [ ] Document single AZ availability trade-offs
  - [ ] Create automated database backup procedures
  - [ ] Implement infrastructure state backup procedures
  - [ ] Create disaster recovery runbook for AZ outages
  - [ ] Document procedures for scaling back to multi-AZ if needed

- [ ] **Task 6: Update monitoring and alerting** (AC: 8)
  - [ ] Configure CloudWatch alarms for single AZ scenarios
  - [ ] Update monitoring dashboards for single AZ metrics
  - [ ] Implement health checks that account for single AZ deployment
  - [ ] Configure alerting for AZ-specific issues
  - [ ] Add monitoring for backup and recovery processes

## Dev Notes

### Previous Story Context

This story depends on Story N.1 (Eliminate NAT Gateway Dependency) and continues the cost optimization for single-user deployment.

### Data Models and Architecture

**Current Architecture (Multi-AZ):**

```
us-east-1a:          us-east-1b:
├── Public Subnet    ├── Public Subnet
├── Private Subnet   ├── Private Subnet
├── ECS Tasks        ├── ECS Tasks
├── RDS Primary      ├── RDS Standby
└── ALB Target       └── ALB Target
```

**Target Architecture (Single AZ):**

```
us-east-1a:
├── Public Subnet
├── ECS Tasks
├── RDS Single AZ
└── ALB (single subnet)

Cost Savings:
- No cross-AZ data transfer charges
- No Multi-AZ RDS standby costs
- Simplified networking reduces operational overhead
```

### File Locations

**Primary Files to Modify:**

1. `/apps/infrastructure/modules/vpc/main.tf` - Single AZ subnet configuration
2. `/apps/infrastructure/modules/vpc/variables.tf` - Update default AZ configuration
3. `/apps/infrastructure/modules/rds/main.tf` - Disable Multi-AZ configuration
4. `/apps/infrastructure/modules/ecs/main.tf` - Single AZ deployment
5. `/apps/infrastructure/modules/alb/main.tf` - Single subnet ALB
6. `/apps/infrastructure/environments/dev/main.tf` - Single AZ development config

**Primary Files to Create:**

1. `/docs/architecture/single-az-deployment.md` - Architecture documentation
2. `/docs/runbooks/disaster-recovery-single-az.md` - DR procedures
3. `/scripts/backup-single-az.sh` - Automated backup script

### Technical Implementation Details

**VPC Single AZ Configuration:**

```hcl
variable "availability_zones" {
  description = "Availability zones for deployment"
  type        = list(string)
  default     = ["us-east-1a"]  # Single AZ for cost optimization
}

variable "enable_multi_az" {
  description = "Enable multi-AZ deployment for high availability"
  type        = bool
  default     = false  # Cost optimization for single user
}
```

**RDS Single AZ Configuration:**

```hcl
resource "aws_db_instance" "main" {
  identifier = "${var.project_name}-db-${var.environment}"

  # Single AZ configuration
  multi_az               = var.enable_multi_az
  availability_zone      = var.enable_multi_az ? null : var.availability_zones[0]

  # Enhanced backup configuration for single AZ
  backup_retention_period = 14  # Longer retention for single AZ
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"

  # Point-in-time recovery
  enabled_cloudwatch_logs_exports = ["postgresql"]

  tags = {
    Name = "${var.project_name}-db-${var.environment}"
    Deployment = "single-az"
  }
}
```

**ECS Single AZ Configuration:**

```hcl
resource "aws_ecs_service" "rms_backend" {
  name            = "${var.project_name}-backend-service-${var.environment}"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.rms_backend.arn
  desired_count   = var.desired_count

  # Single AZ placement
  placement_constraints {
    type       = "memberOf"
    expression = "attribute:ecs.availability-zone == ${var.availability_zones[0]}"
  }

  network_configuration {
    security_groups  = [var.ecs_security_group_id]
    subnets          = [var.public_subnet_ids[0]]  # Single subnet
    assign_public_ip = true
  }
}
```

**ALB Single AZ Configuration:**

```hcl
resource "aws_lb" "rms_backend" {
  name               = "rms-backend-alb-${var.environment}"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [var.alb_security_group_id]
  subnets           = [var.public_subnet_ids[0]]  # Single subnet

  # Single AZ specific configuration
  enable_cross_zone_load_balancing = false

  tags = {
    Name = "${var.project_name}-alb-${var.environment}"
    Deployment = "single-az"
  }
}
```

**Cost Analysis:**

```
Multi-AZ Costs (Current):
- Cross-AZ data transfer: ~$10-20/month
- RDS Multi-AZ standby: ~$50-100/month
- Additional EIP for second AZ: ~$3.60/month
Total Additional Cost: ~$63-123/month

Single AZ Costs:
- Cross-AZ data transfer: $0/month
- RDS Multi-AZ standby: $0/month
- Single AZ deployment: Base costs only
Estimated Monthly Savings: $60-120/month
```

**Availability Trade-offs:**

- **Risk**: Single point of failure at AZ level
- **Mitigation**: Automated backups, point-in-time recovery
- **Recovery Time**: 15-30 minutes for AZ failover vs 1-5 minutes for Multi-AZ
- **Acceptable for**: Single-user applications, development environments
- **Monitoring**: Enhanced monitoring for AZ health and backup status

**Backup Strategy:**

```bash
#!/bin/bash
# Enhanced backup for single AZ deployment

# Database backup
aws rds create-db-snapshot \
  --db-instance-identifier rms-db-dev \
  --db-snapshot-identifier rms-db-dev-$(date +%Y%m%d-%H%M%S)

# Infrastructure state backup
aws s3 cp infrastructure/terraform.tfstate \
  s3://rms-backups/terraform-state/$(date +%Y%m%d-%H%M%S).tfstate

# Application data backup if needed
# ... additional backup procedures
```

**Disaster Recovery Procedures:**

1. **AZ Outage Detection**: CloudWatch alarms trigger within 2-3 minutes
2. **Automated Response**:
   - Switch DNS to maintenance page
   - Initiate backup restoration in different AZ
3. **Manual Recovery**:
   - Deploy infrastructure in backup AZ (us-east-1b)
   - Restore RDS from latest snapshot
   - Update DNS to point to new deployment
4. **Recovery Time Objective (RTO)**: 30-60 minutes
5. **Recovery Point Objective (RPO)**: 5-15 minutes (backup frequency)

### Testing Standards

**Testing Framework:** Terraform validation, RDS backup testing, ECS deployment validation
**Test Location:** Infrastructure tests with single AZ scenarios
**Coverage Requirements:** All single AZ configurations must be validated

**Testing Strategy:**

- **Infrastructure Tests**: Validate single AZ deployment creates correct resources
- **Backup Tests**: Verify automated backup procedures work correctly
- **Recovery Tests**: Test disaster recovery procedures in non-production
- **Performance Tests**: Validate no performance degradation in single AZ

**Key Test Scenarios:**

- All infrastructure deploys successfully in single AZ
- RDS backups are created and can be restored
- ECS tasks remain healthy in single AZ configuration
- ALB health checks work with single AZ targets
- Application performance is unchanged
- Monitoring and alerting work correctly for single AZ

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
