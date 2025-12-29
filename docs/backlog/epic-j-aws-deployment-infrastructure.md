# Epic J: AWS Deployment Infrastructure

Goal: Deploy the DMS application to AWS using Infrastructure as Code (Terraform) for resume-worthy cloud deployment experience.

## Context

Currently the application runs locally with:

- **Frontend**: Angular 20 SPA (build: `apps/dms` → `dist/apps/dms`)
- **Backend**: Node.js Fastify API server (build: `apps/server` → `dist/apps/server`)
- **Database**: SQLite with Prisma (production will need PostgreSQL/MySQL)
- **Tech Stack**: Nx monorepo, pnpm, Node.js 22

User wants to deploy to AWS using Infrastructure as Code with the most popular framework (Terraform) for resume/career value.

## Technical Context

**Current Architecture:**

- Frontend: Angular SPA served via development server
- Backend: Fastify server on Node.js with SQLite
- Build outputs: Static files for frontend, Node.js app for backend
- No authentication currently implemented

**AWS Target Architecture:**

- **Frontend**: CloudFront + S3 for static hosting
- **Backend**: ECS Fargate containers or Lambda functions
- **Database**: RDS PostgreSQL
- **Infrastructure**: Terraform for IaC
- **Optional**: Route53 for custom domain, ALB for load balancing

## Story J1: Setup Terraform Infrastructure Foundation

Description: Initialize Terraform configuration for core AWS infrastructure including VPC, security groups, and IAM roles.

Acceptance Criteria:

- Create `apps/infrastructure/` directory with Terraform configuration
- Setup AWS provider and required versions
- Define VPC with public/private subnets across 2 AZs
- Configure security groups for web traffic, database access
- Setup IAM roles for ECS tasks and RDS access
- State management using S3 backend with DynamoDB locking
- Include terraform.tfvars.example for environment variables

Dependencies: AWS account setup, Terraform CLI installation

## Story J2: Database Migration to RDS PostgreSQL

Description: Migrate from SQLite to PostgreSQL and deploy RDS instance via Terraform.

Acceptance Criteria:

- Update Prisma schema for PostgreSQL compatibility
- Create Terraform configuration for RDS PostgreSQL instance
- Setup database security groups and subnet groups
- Configure automated backups and maintenance windows
- Create database migration scripts for existing data
- Update server configuration for PostgreSQL connection
- Document connection string format and environment variables

Dependencies: Story J1

## Story J3: Backend Deployment with ECS Fargate

Description: Containerize the Node.js backend and deploy to ECS Fargate using Terraform.

Acceptance Criteria:

- Create Dockerfile for the server application
- Build Docker image with production Node.js dependencies
- Setup ECR repository for container images
- Configure ECS cluster, service, and task definition via Terraform
- Setup Application Load Balancer with health checks
- Configure auto-scaling policies for the ECS service
- Environment variable management for database connection
- CI/CD pipeline integration (GitHub Actions or similar)

Dependencies: Stories J1, J2

## Story J4: Frontend Deployment to S3 + CloudFront

Description: Deploy Angular application to S3 with CloudFront CDN distribution via Terraform.

Acceptance Criteria:

- Configure S3 bucket for static website hosting
- Setup CloudFront distribution with S3 origin
- Configure proper caching headers and invalidation rules
- Handle Angular routing with proper error pages (index.html fallback)
- Setup HTTPS certificate via ACM (Certificate Manager)
- Configure CORS policies for API communication
- Automated deployment pipeline for frontend builds

Dependencies: Story J1, J3 (for API endpoint configuration)

## Story J5: Domain Setup and SSL Configuration

Description: Configure custom domain with Route53 and SSL certificates for both frontend and backend.

Acceptance Criteria:

- Setup Route53 hosted zone for custom domain
- Configure DNS records for frontend (A/AAAA to CloudFront)
- Configure DNS records for backend API (A/AAAA to ALB)
- Request and validate SSL certificates via ACM
- Configure certificate association with CloudFront and ALB
- Setup proper subdomain routing (e.g., app.domain.com, api.domain.com)
- Document DNS propagation and certificate validation process

Dependencies: Stories J3, J4

## Story J6: Monitoring and Logging Setup

Description: Implement CloudWatch monitoring, logging, and alerting for the deployed infrastructure.

Acceptance Criteria:

- Configure CloudWatch logs for ECS tasks and ALB
- Setup CloudWatch metrics for application performance
- Create CloudWatch dashboards for infrastructure monitoring
- Setup CloudWatch alarms for critical metrics (CPU, memory, errors)
- Configure SNS notifications for alerts
- Document log retention policies and monitoring procedures
- Cost monitoring and budgeting alerts

Dependencies: Stories J3, J4

## Story J7: Infrastructure Documentation and Runbook

Description: Create comprehensive documentation for deploying, maintaining, and troubleshooting the AWS infrastructure.

Acceptance Criteria:

- Document Terraform setup and deployment procedures
- Create runbook for common operational tasks
- Document environment variable configuration
- Include cost optimization recommendations
- Create troubleshooting guide for common issues
- Document backup and recovery procedures
- Include infrastructure diagrams and architecture decisions
- Security best practices documentation

Dependencies: Stories J1-J6

## Technical Notes

**Infrastructure as Code (Terraform):**

- Use Terraform modules for reusable components
- Organize by environment (dev, staging, prod)
- State file management with versioning
- Cost-conscious resource selection

**File Structure:**

```
apps/infrastructure/
├── modules/
│   ├── vpc/
│   ├── ecs/
│   ├── rds/
│   └── cloudfront/
├── environments/
│   ├── dev/
│   ├── staging/
│   └── prod/
└── shared/
```

**Deployment Pipeline:**

1. Build applications (frontend + backend)
2. Push Docker image to ECR
3. Deploy static files to S3
4. Update ECS service
5. Invalidate CloudFront cache

**Cost Considerations:**

- Use AWS Free Tier where possible
- Implement auto-scaling to minimize costs
- Regular cost monitoring and optimization
- Consider spot instances for development environments

**Resume Value:**

- Terraform experience (most popular IaC tool)
- AWS services: ECS, RDS, CloudFront, S3, Route53
- Container orchestration with Docker
- CI/CD pipeline implementation
- Infrastructure monitoring and alerting
