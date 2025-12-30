# Environment Configuration

This guide covers the configuration of environment variables and AWS parameters for DMS infrastructure deployment across different environments.

## Environment Overview

DMS supports three deployment environments:

- **Development** (`dev`) - Feature development and testing
- **Staging** (`staging`) - Pre-production integration testing
- **Production** (`prod`) - Live production environment

Each environment has its own configuration file and AWS resources.

## Configuration Files Structure

```
apps/infrastructure/
├── environments/
│   ├── dev/
│   │   └── terraform.tfvars
│   ├── staging/
│   │   └── terraform.tfvars
│   └── prod/
│       └── terraform.tfvars
├── terraform.tfvars.example
└── variables.tf
```

## Core Environment Variables

### Required Variables

All environments require these core variables:

```hcl
# apps/infrastructure/environments/{env}/terraform.tfvars

# Basic Configuration
project_name = "dms"
environment  = "dev"  # or "staging", "prod"
aws_region   = "us-east-1"

# Domain Configuration
domain_name    = "dms-dev.example.com"  # Environment-specific domain
api_subdomain  = "api-dev"              # API subdomain prefix

# Database Configuration
db_instance_class    = "db.t3.micro"    # Adjust for environment
db_allocated_storage = 20               # GB, adjust for environment
db_name             = "dms_dev"         # Environment-specific DB name
db_username         = "dms_admin"       # Database admin username

# Application Configuration
app_port        = 3000
app_environment = "development"  # or "staging", "production"

# Container Configuration
cpu_units    = 256   # Fargate CPU units
memory_units = 512   # Fargate memory in MB

# Monitoring Configuration
alert_emails = ["devops@example.com"]
```

### Optional Variables

```hcl
# Optional Configuration (with defaults)

# SSL Certificate (if using custom domain)
ssl_certificate_arn = "arn:aws:acm:us-east-1:123456789012:certificate/example"

# Backup Configuration
backup_retention_days = 7   # RDS backup retention
backup_window        = "03:00-04:00"  # UTC backup window

# Scaling Configuration
min_capacity = 1    # Minimum ECS tasks
max_capacity = 3    # Maximum ECS tasks
desired_count = 1   # Initial task count

# Network Configuration
availability_zones = ["us-east-1a", "us-east-1b"]
enable_nat_gateway = true

# Security Configuration
allowed_cidr_blocks = ["0.0.0.0/0"]  # Restrict in production

# Slack Notifications (optional)
slack_webhook_url = "https://hooks.slack.com/services/..."  # Sensitive
```

## Environment-Specific Configurations

### Development Environment

```hcl
# apps/infrastructure/environments/dev/terraform.tfvars

project_name = "dms"
environment  = "dev"
aws_region   = "us-east-1"

# Cost-optimized settings
db_instance_class    = "db.t3.micro"
db_allocated_storage = 20
cpu_units           = 256
memory_units        = 512
min_capacity        = 1
max_capacity        = 2
desired_count       = 1

# Development-specific
app_environment = "development"
domain_name     = "dms-dev.example.com"
api_subdomain   = "api-dev"
db_name         = "dms_dev"

# Relaxed security for development
allowed_cidr_blocks     = ["0.0.0.0/0"]
enable_deletion_protection = false
backup_retention_days   = 3

# Monitoring
alert_emails = ["dev-team@example.com"]
```

### Staging Environment

```hcl
# apps/infrastructure/environments/staging/terraform.tfvars

project_name = "dms"
environment  = "staging"
aws_region   = "us-east-1"

# Production-like sizing
db_instance_class    = "db.t3.small"
db_allocated_storage = 50
cpu_units           = 512
memory_units        = 1024
min_capacity        = 1
max_capacity        = 3
desired_count       = 1

# Staging-specific
app_environment = "staging"
domain_name     = "dms-staging.example.com"
api_subdomain   = "api-staging"
db_name         = "dms_staging"

# Production-like security
allowed_cidr_blocks        = ["10.0.0.0/8", "172.16.0.0/12"]
enable_deletion_protection = true
backup_retention_days      = 7

# Monitoring
alert_emails = ["devops@example.com", "qa-team@example.com"]
```

### Production Environment

```hcl
# apps/infrastructure/environments/prod/terraform.tfvars

project_name = "dms"
environment  = "prod"
aws_region   = "us-east-1"

# Production sizing
db_instance_class    = "db.t3.medium"
db_allocated_storage = 100
cpu_units           = 1024
memory_units        = 2048
min_capacity        = 2
max_capacity        = 10
desired_count       = 2

# Production configuration
app_environment = "production"
domain_name     = "dms.example.com"
api_subdomain   = "api"
db_name         = "dms_prod"

# Production security
allowed_cidr_blocks        = ["10.0.0.0/8"]  # VPN/office IPs only
enable_deletion_protection = true
backup_retention_days      = 30
multi_az                   = true

# Comprehensive monitoring
alert_emails = [
  "devops@example.com",
  "sre@example.com",
  "on-call@example.com"
]

# Slack notifications
slack_webhook_url = "https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX"
```

## Sensitive Variables Management

### AWS Systems Manager Parameter Store

For sensitive variables like database passwords and API keys:

```bash
# Store database password
aws ssm put-parameter \
  --name "/dms/dev/db_password" \
  --value "secure-random-password" \
  --type "SecureString" \
  --description "DMS dev database password"

# Store Slack webhook URL
aws ssm put-parameter \
  --name "/dms/prod/slack_webhook_url" \
  --value "https://hooks.slack.com/services/..." \
  --type "SecureString" \
  --description "DMS prod Slack webhook URL"
```

### Environment Variable File (.env)

For local development, create a `.env` file in the project root:

```bash
# .env (DO NOT COMMIT TO VERSION CONTROL)

# Database
DB_PASSWORD=dev-password-here
DB_HOST=localhost
DB_PORT=5432
DB_NAME=dms_dev
DB_USER=dms_admin

# API Configuration
API_PORT=3000
NODE_ENV=development
JWT_SECRET=development-jwt-secret

# External Services
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
```

**Important**: Add `.env` to `.gitignore` to prevent committing sensitive data.

## Domain and SSL Configuration

### Custom Domain Setup

If using a custom domain:

1. **Register domain** or use existing domain in Route53
2. **Create SSL certificate** in AWS Certificate Manager:

```bash
# Request SSL certificate
aws acm request-certificate \
  --domain-name "dms.example.com" \
  --subject-alternative-names "*.dms.example.com" \
  --validation-method DNS \
  --region us-east-1
```

3. **Add DNS validation** records to your domain
4. **Update terraform.tfvars** with certificate ARN:

```hcl
ssl_certificate_arn = "arn:aws:acm:us-east-1:123456789012:certificate/12345678-1234-1234-1234-123456789012"
```

### Without Custom Domain

DMS can be deployed without a custom domain using AWS-provided URLs:

```hcl
# Leave domain_name empty to use AWS-provided URLs
domain_name = ""
```

This will use:

- CloudFront distribution domain for frontend
- ALB DNS name for API

## Configuration Validation

### Validate Configuration Files

```bash
# Navigate to infrastructure directory
cd apps/infrastructure

# Validate Terraform syntax
terraform fmt -check
terraform validate

# Plan deployment to check configuration
terraform plan -var-file="environments/dev/terraform.tfvars"
```

### Required AWS Resources Check

Before deployment, ensure these AWS resources exist:

```bash
# Check S3 bucket for Terraform state
aws s3 ls s3://your-terraform-state-bucket

# Check DynamoDB table for locks
aws dynamodb describe-table --table-name dms-terraform-locks

# Verify SSL certificate (if using custom domain)
aws acm list-certificates --region us-east-1
```

## Environment Switching

### Using Terraform Workspaces

```bash
# Create workspace for environment
terraform workspace new dev
terraform workspace new staging
terraform workspace new prod

# Switch to environment
terraform workspace select dev

# Deploy to current workspace
terraform apply -var-file="environments/dev/terraform.tfvars"
```

### Using Directory Structure

```bash
# Deploy to specific environment
cd apps/infrastructure

# Development
terraform apply -var-file="environments/dev/terraform.tfvars"

# Staging
terraform apply -var-file="environments/staging/terraform.tfvars"

# Production
terraform apply -var-file="environments/prod/terraform.tfvars"
```

## Configuration Best Practices

### Security

1. **Never commit sensitive values** to version control
2. **Use AWS Parameter Store** for secrets
3. **Restrict CIDR blocks** in production
4. **Enable deletion protection** for production resources
5. **Use different AWS accounts** for production isolation

### Cost Optimization

1. **Right-size resources** for each environment
2. **Use smaller instances** for development
3. **Enable auto-scaling** to handle traffic spikes
4. **Set backup retention** appropriately per environment

### Monitoring

1. **Configure alerts** for all environments
2. **Use different notification channels** per environment
3. **Set appropriate thresholds** based on environment usage
4. **Enable detailed monitoring** for production

## Configuration Templates

### Quick Start Template

```bash
# Copy template and customize
cp apps/infrastructure/terraform.tfvars.example apps/infrastructure/environments/dev/terraform.tfvars

# Edit with your values
vim apps/infrastructure/environments/dev/terraform.tfvars
```

### Multi-Environment Script

Create a script to manage multiple environments:

```bash
#!/bin/bash
# scripts/deploy-environment.sh

ENVIRONMENT=$1

if [ -z "$ENVIRONMENT" ]; then
  echo "Usage: $0 <dev|staging|prod>"
  exit 1
fi

cd apps/infrastructure

terraform workspace select $ENVIRONMENT 2>/dev/null || terraform workspace new $ENVIRONMENT
terraform apply -var-file="environments/$ENVIRONMENT/terraform.tfvars"
```

## Troubleshooting

### Common Configuration Issues

**Invalid variable values:**

```bash
# Check variable definitions
terraform validate
terraform plan -var-file="environments/dev/terraform.tfvars"
```

**Missing sensitive parameters:**

```bash
# Check AWS Parameter Store
aws ssm get-parameters --names "/dms/dev/db_password" --with-decryption
```

**SSL certificate issues:**

```bash
# Check certificate status
aws acm describe-certificate --certificate-arn arn:aws:acm:...
```

### Validation Commands

```bash
# Format check
terraform fmt -check

# Configuration validation
terraform validate

# Plan without apply
terraform plan -var-file="environments/dev/terraform.tfvars"

# Show current configuration
terraform show
```

## Next Steps

After configuring environment variables:

1. [Infrastructure Deployment](infrastructure-deployment.md) - Deploy AWS infrastructure
2. [Application Deployment](application-deployment.md) - Deploy applications
3. [Post-Deployment Verification](post-deployment-verification.md) - Verify deployment

---

**Last Updated**: 2024-12-16
**Version**: 1.0
