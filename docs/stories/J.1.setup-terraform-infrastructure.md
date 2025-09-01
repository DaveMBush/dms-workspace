# Story J.1: Setup Terraform Infrastructure Foundation

## Status

Draft

## Story

**As a** DevOps engineer,  
**I want** to establish the core AWS infrastructure foundation using Terraform,  
**so that** I can deploy the RMS application to AWS with Infrastructure as Code best practices and proper state management.

## Acceptance Criteria

1. Create `infrastructure/` directory structure with Terraform modules and environments
2. Configure Terraform AWS provider with version constraints and required_version
3. Setup S3 backend for Terraform state with DynamoDB table for state locking
4. Define VPC with public and private subnets across 2 Availability Zones
5. Create Internet Gateway and NAT Gateways for proper network routing
6. Configure security groups for web traffic, application traffic, and database access
7. Setup IAM roles and policies for ECS tasks, RDS access, and CloudWatch logging
8. Include terraform.tfvars.example file with all configurable variables
9. Add .gitignore rules for Terraform state files and sensitive variables

## Tasks / Subtasks

- [ ] **Task 1: Create Terraform directory structure and configuration** (AC: 1, 2)

  - [ ] Create `infrastructure/` root directory with modules and environments
  - [ ] Setup `versions.tf` with Terraform and AWS provider version constraints
  - [ ] Create `main.tf` with AWS provider configuration and common tags
  - [ ] Add `variables.tf` and `outputs.tf` files for core infrastructure
  - [ ] Setup environment-specific directories (dev, staging, prod)

- [ ] **Task 2: Configure Terraform state management** (AC: 3)

  - [ ] Create S3 bucket for Terraform state storage with versioning
  - [ ] Setup DynamoDB table for Terraform state locking
  - [ ] Configure backend.tf with S3 backend configuration
  - [ ] Add bucket policies for state file security and access control
  - [ ] Document state management procedures and recovery process

- [ ] **Task 3: Design and implement VPC networking** (AC: 4, 5)

  - [ ] Create VPC module with configurable CIDR blocks
  - [ ] Define public subnets (2 AZs) for load balancers and NAT gateways
  - [ ] Define private subnets (2 AZs) for ECS tasks and RDS instances
  - [ ] Create Internet Gateway for public subnet internet access
  - [ ] Setup NAT Gateways in each AZ for private subnet outbound traffic
  - [ ] Configure route tables for public and private subnet routing

- [ ] **Task 4: Configure security groups for application tiers** (AC: 6)

  - [ ] Create ALB security group (HTTP/HTTPS from internet)
  - [ ] Create ECS security group (HTTP from ALB, outbound for database)
  - [ ] Create RDS security group (PostgreSQL from ECS only)
  - [ ] Create VPC endpoints security group for AWS services
  - [ ] Add security group rules with principle of least privilege
  - [ ] Document security group purposes and traffic flows

- [ ] **Task 5: Setup IAM roles and policies** (AC: 7)

  - [ ] Create ECS task execution role with ECR and CloudWatch permissions
  - [ ] Create ECS task role with RDS, S3, and application-specific permissions
  - [ ] Create RDS monitoring role for CloudWatch metrics and logs
  - [ ] Setup CloudFront and S3 access roles for frontend deployment
  - [ ] Create least-privilege policies for each service interaction
  - [ ] Add assume role policies with proper trust relationships

- [ ] **Task 6: Create variable configuration and documentation** (AC: 8, 9)
  - [ ] Create `terraform.tfvars.example` with all configurable variables
  - [ ] Add variable descriptions and validation rules where applicable
  - [ ] Setup `.gitignore` to exclude state files and `terraform.tfvars`
  - [ ] Document variable purposes and default values
  - [ ] Add environment-specific variable examples

## Dev Notes

### Previous Story Context

This is the first story in Epic J, establishing the foundational infrastructure for AWS deployment.

### Data Models and Architecture

**Source: [Epic J: AWS Deployment Infrastructure]**

- Target architecture: CloudFront + S3 (frontend), ECS Fargate (backend), RDS PostgreSQL
- Current local setup: Angular 20 SPA + Fastify Node.js API + SQLite database
- Nx monorepo with build outputs: `dist/apps/rms` (frontend), `dist/apps/server` (backend)

**Source: [package.json]**

- Tech stack: Angular 20, Fastify, Node.js 22, Prisma ORM
- Build commands: `nx run rms:build`, `nx run server:build`
- Package manager: pnpm

### File Locations

**Primary Files to Create:**

1. `/infrastructure/versions.tf` - Terraform and provider version constraints
2. `/infrastructure/main.tf` - AWS provider and common configuration
3. `/infrastructure/variables.tf` - Input variables for infrastructure
4. `/infrastructure/outputs.tf` - Output values for other modules
5. `/infrastructure/backend.tf` - S3 backend configuration
6. `/infrastructure/modules/vpc/main.tf` - VPC module implementation
7. `/infrastructure/modules/security/main.tf` - Security groups and IAM roles
8. `/infrastructure/environments/dev/main.tf` - Development environment config
9. `/infrastructure/terraform.tfvars.example` - Example variable configuration
10. `/infrastructure/.gitignore` - Terraform-specific ignore rules

### Technical Implementation Details

**Directory Structure:**

```
infrastructure/
├── modules/
│   ├── vpc/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   ├── security/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   └── networking/
│       ├── main.tf
│       ├── variables.tf
│       └── outputs.tf
├── environments/
│   ├── dev/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── terraform.tfvars
│   ├── staging/
│   └── prod/
├── versions.tf
├── main.tf
├── variables.tf
├── outputs.tf
├── backend.tf
├── terraform.tfvars.example
└── .gitignore
```

**Terraform Version Configuration:**

```hcl
terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}
```

**VPC Configuration:**

```hcl
# CIDR blocks for RMS application
variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "Availability zones for subnets"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b"]
}
```

**Security Group Rules:**

```hcl
# ALB security group - Internet facing
resource "aws_security_group" "alb" {
  name_prefix = "rms-alb-"
  vpc_id      = var.vpc_id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
```

**IAM Role Configuration:**

```hcl
# ECS Task Execution Role
resource "aws_iam_role" "ecs_task_execution" {
  name = "rms-ecs-task-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })
}
```

**State Management:**

- S3 bucket with versioning enabled for state storage
- DynamoDB table for state locking to prevent concurrent modifications
- Encryption at rest and in transit for state files
- Cross-region replication for disaster recovery

**Cost Optimization Considerations:**

- Use t3.micro/t3.small instances for development
- Single NAT Gateway for development (multi-AZ for production)
- VPC endpoints for AWS services to reduce data transfer costs
- CloudWatch log retention periods to control storage costs

### Testing Standards

**Source: [architecture/ci-and-testing.md]**

**Testing Framework:** Terratest for infrastructure testing
**Test Location:** `infrastructure/test/` directory for Terraform tests
**Coverage Requirements:** All modules should have basic smoke tests

**Testing Strategy:**

- **Unit Tests:** Test individual Terraform modules with terratest
- **Integration Tests:** Test complete infrastructure deployment
- **Security Tests:** Validate security group rules and IAM policies
- **Cost Tests:** Validate resource configurations stay within budget

**Test Scenarios:**

- VPC and subnet creation across multiple AZs
- Security group rules allow only intended traffic
- IAM roles have minimum required permissions
- State backend configuration works correctly
- Variable validation prevents invalid configurations

**Infrastructure Validation:**

```bash
# Terraform validation commands
terraform fmt -check=true -recursive
terraform validate
terraform plan -detailed-exitcode
```

**Security Testing:**

- Use checkov or tfsec for Terraform security scanning
- Validate no hardcoded secrets in configurations
- Check for overly permissive security groups
- Verify encryption is enabled for all applicable resources

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
