# Story N.1: Eliminate NAT Gateway Dependency

## Status

Ready for Development

## Story

**As a** cost-conscious developer deploying for single-user access,
**I want** to eliminate NAT Gateway costs by deploying ECS tasks in public subnets with proper security,
**so that** I can save ~$90-100/month while maintaining secure outbound internet access for my application.

## Acceptance Criteria

1. Modify ECS service to deploy tasks in public subnets with `assign_public_ip = true`
2. Configure security groups to restrict inbound traffic to ALB/CloudFront only
3. Ensure outbound internet access for ECR image pulls, AWS API calls, and external services
4. Remove NAT Gateway and associated Elastic IP resources from Terraform
5. Update private subnet route tables to use Internet Gateway directly for public subnets
6. Validate that ECS tasks can still pull images and communicate with AWS services
7. Ensure application functionality remains unchanged after deployment
8. Document security implications and mitigation strategies
9. Update deployment scripts to work with public subnet configuration
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

- [ ] **Task 1: Modify VPC configuration to remove NAT Gateway dependency** (AC: 4, 5)

  - [ ] Remove NAT Gateway resources from `modules/vpc/main.tf`
  - [ ] Remove Elastic IP resources associated with NAT Gateways
  - [ ] Update private route tables to route through Internet Gateway
  - [ ] Add conditional logic to enable/disable NAT Gateway via variable
  - [ ] Update VPC module outputs to reflect changes

- [ ] **Task 2: Update ECS configuration for public subnet deployment** (AC: 1, 6)

  - [ ] Modify ECS service network configuration to use public subnets
  - [ ] Set `assign_public_ip = true` for ECS tasks
  - [ ] Update ECS service to reference public subnet IDs instead of private
  - [ ] Ensure ECS tasks can reach ECR for image pulls
  - [ ] Test ECS task startup and health check functionality

- [ ] **Task 3: Configure security groups for public subnet access** (AC: 2, 3)

  - [ ] Create new security group for ECS tasks in public subnets
  - [ ] Configure inbound rules to allow traffic only from ALB security group
  - [ ] Configure outbound rules for HTTPS (443), HTTP (80), and DNS (53)
  - [ ] Add specific outbound rules for ECR, CloudWatch, and Systems Manager
  - [ ] Remove unused security group rules for NAT Gateway access

- [ ] **Task 4: Update infrastructure variables and environments** (AC: 8)

  - [ ] Add `enable_nat_gateway` variable set to `false` for cost optimization
  - [ ] Update development environment to use new configuration
  - [ ] Update staging and production environments with cost-optimized settings
  - [ ] Add documentation about security trade-offs in variable descriptions
  - [ ] Update terraform.tfvars.example with new recommended settings

- [ ] **Task 5: Validate deployment and functionality** (AC: 6, 7, 9)
  - [ ] Deploy infrastructure changes to development environment
  - [ ] Verify ECS tasks start successfully and maintain health
  - [ ] Test application functionality through load balancer
  - [ ] Verify outbound internet connectivity for external API calls
  - [ ] Update deployment scripts to work with public subnet configuration
  - [ ] Validate all acceptance criteria testing commands pass

## Dev Notes

### Previous Story Context

This is the first story in Epic N: Cost Optimization for Single-User Deployment. It builds on the existing infrastructure from Epic J while removing unnecessary redundancy and cost.

### Data Models and Architecture

**Current Architecture (Multi-AZ with NAT):**

```
Internet Gateway
├── Public Subnets (2 AZs) → ALB
├── NAT Gateways (2x ~$45/month each)
└── Private Subnets (2 AZs) → ECS Tasks
```

**Target Architecture (Public Subnet Direct):**

```
Internet Gateway
├── Public Subnets (1-2 AZs) → ALB + ECS Tasks
└── (No NAT Gateways - $90/month savings)
```

### File Locations

**Primary Files to Modify:**

1. `/apps/infrastructure/modules/vpc/main.tf` - Remove NAT Gateway resources
2. `/apps/infrastructure/modules/vpc/variables.tf` - Add enable_nat_gateway variable
3. `/apps/infrastructure/modules/ecs/main.tf` - Update network configuration
4. `/apps/infrastructure/modules/security/main.tf` - Update security groups
5. `/apps/infrastructure/environments/dev/main.tf` - Set enable_nat_gateway = false
6. `/apps/infrastructure/terraform.tfvars.example` - Update recommendations

**Primary Files to Create:**

1. `/docs/architecture/cost-optimization-security.md` - Document security implications
2. `/apps/infrastructure/modules/vpc/outputs.tf` - Update outputs for public subnets

### Technical Implementation Details

**VPC Configuration Changes:**

```hcl
# Remove NAT Gateway resources
# resource "aws_eip" "nat" { ... } # REMOVE
# resource "aws_nat_gateway" "main" { ... } # REMOVE

# Update route table for private subnets to not use NAT
resource "aws_route_table" "private" {
  count = var.enable_nat_gateway ? length(var.availability_zones) : 0
  # ... existing configuration only when NAT is enabled
}
```

**ECS Service Configuration:**

```hcl
resource "aws_ecs_service" "rms_backend" {
  # ... existing configuration

  network_configuration {
    security_groups  = [var.ecs_security_group_id]
    subnets          = var.public_subnet_ids  # Changed from private_subnet_ids
    assign_public_ip = true                   # Changed from false
  }
}
```

**Security Group Configuration:**

```hcl
resource "aws_security_group" "ecs_public" {
  name_prefix = "rms-ecs-public-"
  vpc_id      = var.vpc_id

  # Inbound: Only from ALB
  ingress {
    from_port       = 3000
    to_port         = 3000
    protocol        = "tcp"
    security_groups = [var.alb_security_group_id]
  }

  # Outbound: HTTPS for AWS services and external APIs
  egress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Outbound: HTTP for package downloads during deployment
  egress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Outbound: DNS resolution
  egress {
    from_port   = 53
    to_port     = 53
    protocol    = "udp"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
```

**Cost Analysis:**

```
NAT Gateway Costs (Current):
- 2x NAT Gateways @ $0.045/hour = $65.70/month
- 2x Elastic IPs @ $0.005/hour = $7.30/month
- Data processing @ $0.045/GB (variable)
Total Fixed Cost: ~$73/month minimum

After Elimination:
- NAT Gateway costs: $0/month
- Potential data transfer savings: Variable
- Estimated Monthly Savings: $70-90/month
```

**Security Considerations:**

- ECS tasks will have public IP addresses but restricted security groups
- No inbound internet access except through ALB
- Outbound access controlled via security group rules
- Same security posture as private subnets with NAT, but more cost-effective
- Consider VPC Flow Logs for monitoring if needed

**Testing Strategy:**

- Deploy to development environment first
- Validate ECS task health and connectivity
- Test application functionality through ALB
- Monitor CloudWatch logs for any connectivity issues
- Validate ECR pulls and AWS API calls work correctly

### Testing Standards

**Source: [architecture/ci-and-testing.md]**

**Testing Framework:** Terraform plan/apply validation, ECS service health checks
**Test Location:** Infrastructure tests in `apps/infrastructure/test/` directory
**Coverage Requirements:** All modified Terraform modules must validate successfully

**Testing Strategy:**

- **Infrastructure Tests:** Validate Terraform plan shows NAT Gateway removal
- **Connectivity Tests:** Verify ECS tasks can reach required external services
- **Security Tests:** Validate security group rules are correctly applied
- **Application Tests:** Ensure application functionality remains unchanged

**Key Test Scenarios:**

- ECS tasks start successfully in public subnets
- Application health checks pass consistently
- Outbound HTTPS connections work for AWS services
- Inbound connections only work through ALB
- Container image pulls from ECR work correctly
- No degradation in application performance or functionality

**Cost Validation:**

- AWS Cost Explorer shows reduction in NAT Gateway charges
- No increase in data transfer costs due to configuration
- Overall monthly cost reduction of $70-90 achieved

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
