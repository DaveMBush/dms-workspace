# RMS Security Best Practices Guide

This document outlines comprehensive security best practices, configurations, and procedures for the RMS (Risk Management System) application on AWS.

## Table of Contents

1. [Security Overview](#security-overview)
2. [Network Security](#network-security)
3. [Identity and Access Management](#identity-and-access-management)
4. [Application Security](#application-security)
5. [Data Protection](#data-protection)
6. [Infrastructure Security](#infrastructure-security)
7. [Monitoring and Compliance](#monitoring-and-compliance)
8. [Incident Response](#incident-response)
9. [Security Testing](#security-testing)
10. [Compliance Requirements](#compliance-requirements)

## Security Overview

The RMS application implements a defense-in-depth security strategy with multiple layers of protection:

### Security Architecture Layers

```
┌─────────────────────────────────────────────────────────┐
│                    Internet/Users                       │
└─────────────────────┬───────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────┐
│                  Edge Security                          │
│               WAF + CloudFront                          │
└─────────────────────┬───────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────┐
│                Network Security                         │
│         VPC + Security Groups + NACLs                   │
└─────────────────────┬───────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────┐
│              Application Security                       │
│        Authentication + Authorization + Validation      │
└─────────────────────┬───────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────┐
│                 Data Security                           │
│           Encryption + Access Controls                  │
└─────────────────────────────────────────────────────────┘
```

### Security Principles

1. **Zero Trust**: Never trust, always verify
2. **Least Privilege**: Minimum necessary permissions
3. **Defense in Depth**: Multiple security layers
4. **Encryption Everywhere**: Data at rest and in transit
5. **Continuous Monitoring**: Real-time threat detection
6. **Incident Response**: Prepared response procedures

## Network Security

### VPC Configuration

#### Network Architecture

```
Internet Gateway
       │
   ┌───▼────┐
   │  WAF   │ (Web Application Firewall)
   └────────┘
       │
   ┌───▼────────────────────────┐
   │     Public Subnets         │
   │  ┌─────────┐ ┌─────────┐  │
   │  │  AZ-1a  │ │  AZ-1b  │  │
   │  │   ALB   │ │   ALB   │  │
   │  │  NAT-GW │ │  NAT-GW │  │
   │  └─────────┘ └─────────┘  │
   └────────────────────────────┘
   ┌───▼────────────────────────┐
   │    Private Subnets         │
   │  ┌─────────┐ ┌─────────┐  │
   │  │  AZ-1a  │ │  AZ-1b  │  │
   │  │   ECS   │ │   ECS   │  │
   │  └─────────┘ └─────────┘  │
   └────────────────────────────┘
   ┌───▼────────────────────────┐
   │     Data Subnets           │
   │  ┌─────────┐ ┌─────────┐  │
   │  │  AZ-1a  │ │  AZ-1b  │  │
   │  │   RDS   │ │   RDS   │  │
   │  └─────────┘ └─────────┘  │
   └────────────────────────────┘
```

#### Security Groups Configuration

**ALB Security Group (rms-alb-sg)**:

```hcl
resource "aws_security_group" "alb" {
  name_prefix = "rms-alb-sg"
  vpc_id      = aws_vpc.main.id

  # HTTPS traffic from internet
  ingress {
    description = "HTTPS from Internet"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # HTTP redirect to HTTPS
  ingress {
    description = "HTTP redirect"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # All outbound traffic to ECS
  egress {
    description     = "To ECS tasks"
    from_port       = 0
    to_port         = 65535
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs_tasks.id]
  }

  tags = {
    Name = "rms-alb-sg"
  }
}
```

**ECS Tasks Security Group (rms-ecs-sg)**:

```hcl
resource "aws_security_group" "ecs_tasks" {
  name_prefix = "rms-ecs-sg"
  vpc_id      = aws_vpc.main.id

  # Application port from ALB only
  ingress {
    description     = "Application port from ALB"
    from_port       = var.app_port
    to_port         = var.app_port
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  # Outbound to RDS
  egress {
    description     = "To RDS"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.rds.id]
  }

  # Outbound HTTPS for external APIs
  egress {
    description = "HTTPS for external APIs"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "rms-ecs-sg"
  }
}
```

**RDS Security Group (rms-rds-sg)**:

```hcl
resource "aws_security_group" "rds" {
  name_prefix = "rms-rds-sg"
  vpc_id      = aws_vpc.main.id

  # PostgreSQL from ECS only
  ingress {
    description     = "PostgreSQL from ECS"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs_tasks.id]
  }

  # No outbound rules (default deny)
  tags = {
    Name = "rms-rds-sg"
  }
}
```

### Web Application Firewall (WAF)

#### WAF Configuration

```hcl
resource "aws_wafv2_web_acl" "rms_waf" {
  name  = "rms-waf-${var.environment}"
  scope = "CLOUDFRONT"

  default_action {
    allow {}
  }

  # SQL Injection Protection
  rule {
    name     = "AWSManagedRulesSQLiRuleSet"
    priority = 1

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesSQLiRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "SQLInjectionRule"
      sampled_requests_enabled   = true
    }
  }

  # Cross-Site Scripting Protection
  rule {
    name     = "AWSManagedRulesKnownBadInputsRuleSet"
    priority = 2

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesKnownBadInputsRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "XSSProtectionRule"
      sampled_requests_enabled   = true
    }
  }

  # Rate Limiting
  rule {
    name     = "RateLimitRule"
    priority = 3

    action {
      block {}
    }

    statement {
      rate_based_statement {
        limit              = 1000
        aggregate_key_type = "IP"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "RateLimitRule"
      sampled_requests_enabled   = true
    }
  }

  # Geo-blocking (if required)
  rule {
    name     = "GeoBlockingRule"
    priority = 4

    action {
      block {}
    }

    statement {
      geo_match_statement {
        country_codes = ["CN", "RU"] # Block specific countries
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "GeoBlockingRule"
      sampled_requests_enabled   = true
    }
  }

  tags = {
    Name        = "rms-waf-${var.environment}"
    Environment = var.environment
  }
}
```

### Network Access Control Lists (NACLs)

```hcl
# Public subnet NACL
resource "aws_network_acl" "public" {
  vpc_id     = aws_vpc.main.id
  subnet_ids = aws_subnet.public[*].id

  # Inbound rules
  ingress {
    protocol   = "tcp"
    rule_no    = 100
    action     = "allow"
    cidr_block = "0.0.0.0/0"
    from_port  = 80
    to_port    = 80
  }

  ingress {
    protocol   = "tcp"
    rule_no    = 110
    action     = "allow"
    cidr_block = "0.0.0.0/0"
    from_port  = 443
    to_port    = 443
  }

  # Ephemeral ports for return traffic
  ingress {
    protocol   = "tcp"
    rule_no    = 120
    action     = "allow"
    cidr_block = "0.0.0.0/0"
    from_port  = 1024
    to_port    = 65535
  }

  # Outbound rules
  egress {
    protocol   = "tcp"
    rule_no    = 100
    action     = "allow"
    cidr_block = aws_vpc.main.cidr_block
    from_port  = 0
    to_port    = 65535
  }

  egress {
    protocol   = "tcp"
    rule_no    = 110
    action     = "allow"
    cidr_block = "0.0.0.0/0"
    from_port  = 80
    to_port    = 80
  }

  egress {
    protocol   = "tcp"
    rule_no    = 120
    action     = "allow"
    cidr_block = "0.0.0.0/0"
    from_port  = 443
    to_port    = 443
  }

  tags = {
    Name = "rms-public-nacl"
  }
}
```

## Identity and Access Management

### IAM Roles and Policies

#### ECS Task Role

```hcl
resource "aws_iam_role" "ecs_task_role" {
  name = "rms-ecs-task-role-${var.environment}"

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

resource "aws_iam_role_policy" "ecs_task_policy" {
  name = "rms-ecs-task-policy"
  role = aws_iam_role.ecs_task_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      # CloudWatch Logs
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:${var.aws_region}:${data.aws_caller_identity.current.account_id}:log-group:/aws/ecs/rms-backend-${var.environment}:*"
      },
      # X-Ray Tracing
      {
        Effect = "Allow"
        Action = [
          "xray:PutTraceSegments",
          "xray:PutTelemetryRecords"
        ]
        Resource = "*"
      },
      # Systems Manager for secrets
      {
        Effect = "Allow"
        Action = [
          "ssm:GetParameters",
          "ssm:GetParameter",
          "ssm:GetParametersByPath"
        ]
        Resource = [
          "arn:aws:ssm:${var.aws_region}:${data.aws_caller_identity.current.account_id}:parameter/rms/${var.environment}/*"
        ]
      },
      # KMS for decryption
      {
        Effect = "Allow"
        Action = [
          "kms:Decrypt"
        ]
        Resource = [
          aws_kms_key.rms.arn
        ]
      }
    ]
  })
}
```

#### Deployment Role (CI/CD)

```hcl
resource "aws_iam_role" "deployment_role" {
  name = "rms-deployment-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:user/ci-cd-user"
        }
        Condition = {
          StringEquals = {
            "sts:ExternalId" = var.deployment_external_id
          }
        }
      }
    ]
  })
}

resource "aws_iam_role_policy" "deployment_policy" {
  name = "rms-deployment-policy"
  role = aws_iam_role.deployment_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      # ECS deployment permissions
      {
        Effect = "Allow"
        Action = [
          "ecs:UpdateService",
          "ecs:DescribeServices",
          "ecs:RegisterTaskDefinition",
          "ecs:DescribeTaskDefinition"
        ]
        Resource = "*"
        Condition = {
          StringEquals = {
            "aws:ResourceTag/Project" = "rms"
          }
        }
      },
      # ECR permissions
      {
        Effect = "Allow"
        Action = [
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
          "ecr:GetAuthorizationToken"
        ]
        Resource = "*"
      },
      # S3 deployment permissions
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:PutObjectAcl",
          "s3:GetObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.frontend.arn,
          "${aws_s3_bucket.frontend.arn}/*"
        ]
      },
      # CloudFront invalidation
      {
        Effect = "Allow"
        Action = [
          "cloudfront:CreateInvalidation",
          "cloudfront:GetInvalidation"
        ]
        Resource = aws_cloudfront_distribution.main.arn
      }
    ]
  })
}
```

### Multi-Factor Authentication

#### MFA Policy for Admin Users

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowViewAccountInfo",
      "Effect": "Allow",
      "Action": ["iam:GetAccountPasswordPolicy", "iam:ListVirtualMFADevices"],
      "Resource": "*"
    },
    {
      "Sid": "AllowManageOwnPasswords",
      "Effect": "Allow",
      "Action": ["iam:ChangePassword", "iam:GetUser"],
      "Resource": "arn:aws:iam::*:user/${aws:username}"
    },
    {
      "Sid": "AllowManageOwnMFA",
      "Effect": "Allow",
      "Action": ["iam:CreateVirtualMFADevice", "iam:DeleteVirtualMFADevice", "iam:ListMFADevices", "iam:EnableMFADevice", "iam:ResyncMFADevice"],
      "Resource": ["arn:aws:iam::*:mfa/${aws:username}", "arn:aws:iam::*:user/${aws:username}"]
    },
    {
      "Sid": "DenyAllExceptUnlessSignedInWithMFA",
      "Effect": "Deny",
      "NotAction": ["iam:CreateVirtualMFADevice", "iam:EnableMFADevice", "iam:GetUser", "iam:ListMFADevices", "iam:ListVirtualMFADevices", "iam:ResyncMFADevice", "sts:GetSessionToken"],
      "Resource": "*",
      "Condition": {
        "BoolIfExists": {
          "aws:MultiFactorAuthPresent": "false"
        }
      }
    }
  ]
}
```

## Application Security

### Authentication and Authorization

#### JWT Configuration

```typescript
// JWT configuration with security best practices
import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';

interface JWTConfig {
  accessTokenSecret: string;
  refreshTokenSecret: string;
  accessTokenExpiry: string;
  refreshTokenExpiry: string;
  issuer: string;
  audience: string;
}

const jwtConfig: JWTConfig = {
  accessTokenSecret: process.env.JWT_ACCESS_SECRET!,
  refreshTokenSecret: process.env.JWT_REFRESH_SECRET!,
  accessTokenExpiry: '15m', // Short-lived access tokens
  refreshTokenExpiry: '7d', // Longer-lived refresh tokens
  issuer: 'rms-api',
  audience: 'rms-client',
};

// Generate secure random secret (for initialization)
export function generateSecureSecret(): string {
  return randomBytes(64).toString('hex');
}

// Create JWT token with security headers
export function createAccessToken(userId: string, roles: string[]): string {
  return jwt.sign(
    {
      sub: userId,
      roles: roles,
      type: 'access',
    },
    jwtConfig.accessTokenSecret,
    {
      expiresIn: jwtConfig.accessTokenExpiry,
      issuer: jwtConfig.issuer,
      audience: jwtConfig.audience,
      algorithm: 'HS256',
    }
  );
}

// Verify JWT with additional security checks
export function verifyAccessToken(token: string): any {
  try {
    return jwt.verify(token, jwtConfig.accessTokenSecret, {
      issuer: jwtConfig.issuer,
      audience: jwtConfig.audience,
      algorithms: ['HS256'],
    });
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}
```

#### Role-Based Access Control (RBAC)

```typescript
// RBAC middleware implementation
interface Permission {
  resource: string;
  action: string;
}

interface Role {
  name: string;
  permissions: Permission[];
}

const roles: Record<string, Role> = {
  admin: {
    name: 'admin',
    permissions: [{ resource: '*', action: '*' }],
  },
  analyst: {
    name: 'analyst',
    permissions: [
      { resource: 'risk-assessment', action: 'read' },
      { resource: 'risk-assessment', action: 'create' },
      { resource: 'risk-assessment', action: 'update' },
      { resource: 'reports', action: 'read' },
    ],
  },
  viewer: {
    name: 'viewer',
    permissions: [
      { resource: 'risk-assessment', action: 'read' },
      { resource: 'reports', action: 'read' },
    ],
  },
};

// Authorization middleware
export function requirePermission(resource: string, action: string) {
  return (request: FastifyRequest, reply: FastifyReply, done: Function) => {
    const user = request.user; // Set by authentication middleware

    if (!user || !user.roles) {
      reply.status(401).send({ error: 'Authentication required' });
      return;
    }

    const hasPermission = user.roles.some((roleName: string) => {
      const role = roles[roleName];
      if (!role) return false;

      return role.permissions.some((permission) => (permission.resource === '*' || permission.resource === resource) && (permission.action === '*' || permission.action === action));
    });

    if (!hasPermission) {
      reply.status(403).send({ error: 'Insufficient permissions' });
      return;
    }

    done();
  };
}
```

### Input Validation and Sanitization

#### Request Validation Schema

```typescript
// Comprehensive input validation using JSON Schema
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const ajv = new Ajv({ allErrors: true, removeAdditional: true });
addFormats(ajv);

// Risk assessment schema
const riskAssessmentSchema = {
  type: 'object',
  required: ['title', 'description', 'riskLevel'],
  additionalProperties: false,
  properties: {
    title: {
      type: 'string',
      minLength: 1,
      maxLength: 200,
      pattern: '^[a-zA-Z0-9\\s\\-_.,()]+$', // Prevent XSS
    },
    description: {
      type: 'string',
      minLength: 1,
      maxLength: 2000,
      pattern: '^[a-zA-Z0-9\\s\\-_.,()\\n]+$',
    },
    riskLevel: {
      type: 'string',
      enum: ['low', 'medium', 'high', 'critical'],
    },
    probability: {
      type: 'number',
      minimum: 0,
      maximum: 1,
    },
    impact: {
      type: 'number',
      minimum: 0,
      maximum: 10,
    },
    category: {
      type: 'string',
      enum: ['operational', 'financial', 'strategic', 'compliance'],
    },
    metadata: {
      type: 'object',
      additionalProperties: false,
      properties: {
        tags: {
          type: 'array',
          items: {
            type: 'string',
            pattern: '^[a-zA-Z0-9\\-_]+$',
          },
          maxItems: 10,
        },
      },
    },
  },
};

// Validation middleware
export function validateRequest(schema: object) {
  const validate = ajv.compile(schema);

  return (request: FastifyRequest, reply: FastifyReply, done: Function) => {
    const valid = validate(request.body);

    if (!valid) {
      reply.status(400).send({
        error: 'Validation failed',
        details: validate.errors,
      });
      return;
    }

    done();
  };
}
```

#### SQL Injection Prevention

```typescript
// Secure database queries using Prisma
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: ['query', 'error', 'warn'],
  errorFormat: 'pretty',
});

// Safe parameterized queries
export async function getRiskAssessments(
  userId: string,
  filters: {
    category?: string;
    riskLevel?: string;
    limit?: number;
    offset?: number;
  }
) {
  // Prisma automatically handles parameterization
  return await prisma.riskAssessment.findMany({
    where: {
      userId: userId, // Parameterized
      category: filters.category, // Safe enum value
      riskLevel: filters.riskLevel, // Safe enum value
      // Additional WHERE conditions are automatically parameterized
    },
    take: Math.min(filters.limit || 50, 100), // Limit result size
    skip: filters.offset || 0,
    select: {
      id: true,
      title: true,
      description: true,
      riskLevel: true,
      createdAt: true,
      updatedAt: true,
      // Explicitly select fields (don't return sensitive data)
    },
  });
}

// Raw query with explicit parameterization (when needed)
export async function getCustomReport(userId: string, reportType: string) {
  // Validate reportType against whitelist
  const allowedReportTypes = ['monthly', 'quarterly', 'annual'];
  if (!allowedReportTypes.includes(reportType)) {
    throw new Error('Invalid report type');
  }

  return await prisma.$queryRaw`
    SELECT 
      DATE_TRUNC('month', created_at) as month,
      COUNT(*) as assessment_count,
      AVG(CASE 
        WHEN risk_level = 'low' THEN 1
        WHEN risk_level = 'medium' THEN 2  
        WHEN risk_level = 'high' THEN 3
        WHEN risk_level = 'critical' THEN 4
      END) as avg_risk_score
    FROM risk_assessments 
    WHERE user_id = ${userId}
      AND created_at >= NOW() - INTERVAL '1 year'
    GROUP BY DATE_TRUNC('month', created_at)
    ORDER BY month DESC
  `;
}
```

### HTTPS and Security Headers

#### Security Headers Configuration

```typescript
// Security headers middleware
import { FastifyReply, FastifyRequest } from 'fastify';

export function securityHeaders() {
  return (request: FastifyRequest, reply: FastifyReply, done: Function) => {
    // HTTPS Strict Transport Security
    reply.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');

    // Content Security Policy
    reply.header(
      'Content-Security-Policy',
      [
        "default-src 'self'",
        "script-src 'self' 'unsafe-eval'", // Angular requires unsafe-eval
        "style-src 'self' 'unsafe-inline'", // Angular/PrimeNG inline styles
        "img-src 'self' data: https:",
        "font-src 'self' https:",
        "connect-src 'self' https://api.rms.example.com",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ].join('; ')
    );

    // Prevent MIME type sniffing
    reply.header('X-Content-Type-Options', 'nosniff');

    // XSS Protection
    reply.header('X-XSS-Protection', '1; mode=block');

    // Frame Options
    reply.header('X-Frame-Options', 'DENY');

    // Referrer Policy
    reply.header('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Permissions Policy
    reply.header('Permissions-Policy', ['camera=()', 'microphone=()', 'geolocation=()', 'interest-cohort=()'].join(', '));

    done();
  };
}
```

## Data Protection

### Encryption at Rest

#### RDS Encryption

```hcl
# RDS with encryption at rest
resource "aws_db_instance" "main" {
  identifier = "rms-db-${var.environment}"

  # Encryption configuration
  storage_encrypted   = true
  kms_key_id         = aws_kms_key.rds.arn

  # Backup encryption
  backup_retention_period = var.environment == "production" ? 30 : 7
  backup_window          = "03:00-04:00"
  maintenance_window     = "Sun:04:00-Sun:05:00"

  # Additional security
  deletion_protection = var.environment == "production" ? true : false
  skip_final_snapshot = var.environment != "production"

  tags = {
    Name        = "rms-db-${var.environment}"
    Environment = var.environment
    Encrypted   = "true"
  }
}

# KMS Key for RDS encryption
resource "aws_kms_key" "rds" {
  description             = "RMS RDS encryption key"
  deletion_window_in_days = 30

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "Enable IAM User Permissions"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      },
      {
        Sid    = "Allow RDS to use the key"
        Effect = "Allow"
        Principal = {
          Service = "rds.amazonaws.com"
        }
        Action = [
          "kms:Decrypt",
          "kms:GenerateDataKey",
          "kms:CreateGrant"
        ]
        Resource = "*"
      }
    ]
  })

  tags = {
    Name = "rms-rds-key"
  }
}
```

#### S3 Encryption

```hcl
# S3 bucket with encryption
resource "aws_s3_bucket" "frontend" {
  bucket = "rms-frontend-${var.environment}-${random_string.bucket_suffix.result}"

  tags = {
    Name        = "rms-frontend"
    Environment = var.environment
  }
}

# Enable versioning for security
resource "aws_s3_bucket_versioning" "frontend" {
  bucket = aws_s3_bucket.frontend.id
  versioning_configuration {
    status = "Enabled"
  }
}

# Server-side encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.s3.arn
    }
    bucket_key_enabled = true
  }
}

# Block public access by default
resource "aws_s3_bucket_public_access_block" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
```

### Secrets Management

#### AWS Systems Manager Parameter Store

```hcl
# Database password in Parameter Store
resource "aws_ssm_parameter" "db_password" {
  name  = "/rms/${var.environment}/db_password"
  type  = "SecureString"
  value = var.db_password
  key_id = aws_kms_key.ssm.arn

  tags = {
    Environment = var.environment
    Service     = "rms"
  }
}

# JWT secrets
resource "aws_ssm_parameter" "jwt_access_secret" {
  name  = "/rms/${var.environment}/jwt_access_secret"
  type  = "SecureString"
  value = var.jwt_access_secret
  key_id = aws_kms_key.ssm.arn

  tags = {
    Environment = var.environment
    Service     = "rms"
  }
}
```

#### Secrets Rotation

```typescript
// Automatic secret rotation implementation
import { SSMClient, GetParameterCommand, PutParameterCommand } from '@aws-sdk/client-ssm';
import { randomBytes } from 'crypto';

class SecretsManager {
  private ssmClient: SSMClient;
  private environment: string;

  constructor() {
    this.ssmClient = new SSMClient({ region: process.env.AWS_REGION });
    this.environment = process.env.NODE_ENV || 'development';
  }

  async getSecret(name: string): Promise<string> {
    const command = new GetParameterCommand({
      Name: `/rms/${this.environment}/${name}`,
      WithDecryption: true,
    });

    const response = await this.ssmClient.send(command);

    if (!response.Parameter?.Value) {
      throw new Error(`Secret ${name} not found`);
    }

    return response.Parameter.Value;
  }

  async rotateSecret(name: string, generateNew: () => string): Promise<void> {
    const newValue = generateNew();

    const command = new PutParameterCommand({
      Name: `/rms/${this.environment}/${name}`,
      Value: newValue,
      Type: 'SecureString',
      Overwrite: true,
      Description: `Rotated on ${new Date().toISOString()}`,
    });

    await this.ssmClient.send(command);

    // Log rotation (without exposing secret values)
    console.log(`Secret ${name} rotated successfully at ${new Date().toISOString()}`);
  }

  // Generate secure random secret
  generateRandomSecret(length: number = 64): string {
    return randomBytes(length).toString('hex');
  }
}

// Scheduled secret rotation (Lambda function)
export async function rotateSecrets(): Promise<void> {
  const secretsManager = new SecretsManager();

  try {
    // Rotate JWT access secret (monthly)
    await secretsManager.rotateSecret('jwt_access_secret', () => secretsManager.generateRandomSecret(64));

    // Rotate API keys (quarterly)
    await secretsManager.rotateSecret('external_api_key', () => secretsManager.generateRandomSecret(32));

    console.log('Secret rotation completed successfully');
  } catch (error) {
    console.error('Secret rotation failed:', error);
    throw error;
  }
}
```

## Infrastructure Security

### Container Security

#### Container Image Security

```dockerfile
# Secure Dockerfile for RMS backend
FROM node:22-alpine AS base

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S rms -u 1001

# Security updates
RUN apk update && apk upgrade && \
    apk add --no-cache dumb-init && \
    rm -rf /var/cache/apk/*

WORKDIR /app

# Copy package files
COPY package*.json pnpm-lock.yaml ./

# Install dependencies
RUN npm install -g pnpm@^8.0.0 && \
    pnpm install --frozen-lockfile --production && \
    pnpm store prune

# Copy application code
COPY --chown=rms:nodejs . .

# Build application
RUN pnpm build

# Remove development dependencies and source code
RUN pnpm install --frozen-lockfile --production && \
    rm -rf src/ *.ts tsconfig.json && \
    pnpm store prune

# Switch to non-root user
USER rms

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

EXPOSE 3000

CMD ["node", "dist/main.js"]
```

#### Container Scanning

```bash
#!/bin/bash
# scripts/container-security-scan.sh

IMAGE_NAME="rms-backend"
IMAGE_TAG=${1:-latest}
FULL_IMAGE="$IMAGE_NAME:$IMAGE_TAG"

echo "Starting security scan for $FULL_IMAGE..."

# Scan with Trivy
echo "Running Trivy vulnerability scan..."
trivy image --severity HIGH,CRITICAL --format table $FULL_IMAGE

# Scan with Docker Scout (if available)
if command -v docker &> /dev/null; then
    echo "Running Docker Scout scan..."
    docker scout cves $FULL_IMAGE
fi

# Custom security checks
echo "Running custom security checks..."

# Check for non-root user
if docker run --rm $FULL_IMAGE whoami | grep -q "root"; then
    echo "❌ WARNING: Container running as root user"
    exit 1
else
    echo "✅ Container running as non-root user"
fi

# Check for security updates
echo "Checking for security updates..."
docker run --rm $FULL_IMAGE sh -c "apk list --upgradable 2>/dev/null | grep -i security" || echo "No security updates needed"

echo "Security scan completed"
```

### Infrastructure as Code Security

#### Terraform Security Scanning

```bash
#!/bin/bash
# scripts/terraform-security-scan.sh

echo "Running Terraform security scans..."

# tfsec scanning
echo "Running tfsec scan..."
tfsec apps/infrastructure/ --format json --out tfsec-results.json

# Checkov scanning
echo "Running Checkov scan..."
checkov -d apps/infrastructure/ --framework terraform --output json --output-file checkov-results.json

# terrascan
echo "Running Terrascan scan..."
terrascan scan -d apps/infrastructure/ -o json > terrascan-results.json

# Custom security validation
echo "Running custom security validations..."

# Check for hardcoded secrets
if grep -r "password\|secret\|key" apps/infrastructure/ --include="*.tf" | grep -v "variable\|data\|random"; then
    echo "❌ WARNING: Potential hardcoded secrets found"
    exit 1
fi

# Check for public resources
if grep -r "0.0.0.0/0" apps/infrastructure/ --include="*.tf" | grep -v "80\|443"; then
    echo "❌ WARNING: Potentially insecure public access found"
    exit 1
fi

echo "Terraform security scan completed"
```

## Monitoring and Compliance

### Security Monitoring

#### CloudWatch Security Dashboard

```hcl
resource "aws_cloudwatch_dashboard" "security" {
  dashboard_name = "RMS-Security-${var.environment}"

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        width  = 12
        height = 6
        properties = {
          metrics = [
            ["AWS/WAF", "BlockedRequests", "WebACL", aws_wafv2_web_acl.rms_waf.name],
            [".", "AllowedRequests", ".", "."]
          ]
          period = 300
          stat   = "Sum"
          region = var.aws_region
          title  = "WAF Blocked vs Allowed Requests"
        }
      },
      {
        type   = "log"
        width  = 12
        height = 6
        properties = {
          query = "SOURCE '/aws/ecs/rms-backend-${var.environment}'\n| fields @timestamp, @message\n| filter @message like /ERROR/\n| sort @timestamp desc\n| limit 100"
          region = var.aws_region
          title  = "Application Errors"
        }
      },
      {
        type   = "metric"
        width  = 12
        height = 6
        properties = {
          metrics = [
            ["AWS/ApplicationELB", "HTTPCode_Target_4XX_Count", "LoadBalancer", aws_lb.main.arn_suffix],
            [".", "HTTPCode_Target_5XX_Count", ".", "."]
          ]
          period = 300
          stat   = "Sum"
          region = var.aws_region
          title  = "HTTP Error Rates"
        }
      }
    ]
  })
}
```

#### Security Alerts

```hcl
# CloudWatch Alarms for security events
resource "aws_cloudwatch_metric_alarm" "high_4xx_errors" {
  alarm_name          = "rms-high-4xx-errors-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name        = "HTTPCode_Target_4XX_Count"
  namespace          = "AWS/ApplicationELB"
  period             = "300"
  statistic          = "Sum"
  threshold          = "50"
  alarm_description  = "High number of 4XX errors - possible security probe"
  alarm_actions      = [aws_sns_topic.alerts.arn]

  dimensions = {
    LoadBalancer = aws_lb.main.arn_suffix
  }
}

resource "aws_cloudwatch_metric_alarm" "waf_blocked_requests" {
  alarm_name          = "rms-waf-high-blocked-requests-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name        = "BlockedRequests"
  namespace          = "AWS/WAFV2"
  period             = "300"
  statistic          = "Sum"
  threshold          = "100"
  alarm_description  = "High number of blocked requests - possible attack"
  alarm_actions      = [aws_sns_topic.security_alerts.arn]

  dimensions = {
    WebACL = aws_wafv2_web_acl.rms_waf.name
  }
}
```

### Compliance Monitoring

#### AWS Config Rules

```hcl
# AWS Config for compliance monitoring
resource "aws_config_configuration_recorder" "rms" {
  name     = "rms-config-recorder"
  role_arn = aws_iam_role.config.arn

  recording_group {
    all_supported                 = true
    include_global_resource_types = true
  }
}

# Config rules for security compliance
resource "aws_config_config_rule" "s3_bucket_public_access_prohibited" {
  name = "s3-bucket-public-access-prohibited"

  source {
    owner             = "AWS"
    source_identifier = "S3_BUCKET_PUBLIC_ACCESS_PROHIBITED"
  }

  depends_on = [aws_config_configuration_recorder.rms]
}

resource "aws_config_config_rule" "rds_storage_encrypted" {
  name = "rds-storage-encrypted"

  source {
    owner             = "AWS"
    source_identifier = "RDS_STORAGE_ENCRYPTED"
  }

  depends_on = [aws_config_configuration_recorder.rms]
}

resource "aws_config_config_rule" "encrypted_volumes" {
  name = "encrypted-volumes"

  source {
    owner             = "AWS"
    source_identifier = "ENCRYPTED_VOLUMES"
  }

  depends_on = [aws_config_configuration_recorder.rms]
}
```

## Incident Response

### Security Incident Response Plan

#### Incident Classification

| Severity     | Description               | Response Time | Examples                                            |
| ------------ | ------------------------- | ------------- | --------------------------------------------------- |
| **Critical** | Active security breach    | 15 minutes    | Data exfiltration, system compromise                |
| **High**     | Potential security threat | 1 hour        | Failed authentication attempts, suspicious activity |
| **Medium**   | Security policy violation | 4 hours       | Configuration drift, expired certificates           |
| **Low**      | Minor security issue      | 24 hours      | Informational alerts, policy updates                |

#### Incident Response Procedures

```bash
#!/bin/bash
# scripts/security-incident-response.sh

INCIDENT_ID=${1:-$(date +%Y%m%d-%H%M%S)}
SEVERITY=${2:-"medium"}
INCIDENT_TYPE=${3:-"unknown"}

echo "=== SECURITY INCIDENT RESPONSE ==="
echo "Incident ID: $INCIDENT_ID"
echo "Severity: $SEVERITY"
echo "Type: $INCIDENT_TYPE"
echo "Timestamp: $(date)"

# 1. Immediate containment for critical incidents
if [ "$SEVERITY" = "critical" ]; then
    echo "CRITICAL INCIDENT - Initiating immediate containment..."

    # Block suspicious IP addresses
    # aws wafv2 update-ip-set --scope CLOUDFRONT --id suspicious-ips --addresses

    # Scale down services to minimal capacity
    aws ecs update-service \
        --cluster rms-cluster-prod \
        --service rms-backend-service-prod \
        --desired-count 1

    # Enable enhanced logging
    aws logs put-retention-policy \
        --log-group-name "/aws/ecs/rms-backend-prod" \
        --retention-in-days 90
fi

# 2. Evidence collection
echo "Collecting evidence..."
mkdir -p "incident-$INCIDENT_ID"

# Collect CloudTrail logs
aws logs filter-log-events \
    --log-group-name "CloudTrail/RMS" \
    --start-time $(($(date +%s) - 3600))000 \
    --output json > "incident-$INCIDENT_ID/cloudtrail.json"

# Collect application logs
aws logs filter-log-events \
    --log-group-name "/aws/ecs/rms-backend-prod" \
    --start-time $(($(date +%s) - 3600))000 \
    --filter-pattern "ERROR" \
    --output json > "incident-$INCIDENT_ID/app-errors.json"

# Collect WAF logs
aws logs filter-log-events \
    --log-group-name "/aws/wafv2/rms-waf" \
    --start-time $(($(date +%s) - 3600))000 \
    --output json > "incident-$INCIDENT_ID/waf-logs.json"

# 3. Notification
echo "Sending notifications..."
aws sns publish \
    --topic-arn "arn:aws:sns:us-east-1:123456789012:rms-security-alerts" \
    --message "Security incident $INCIDENT_ID ($SEVERITY) detected. Response initiated." \
    --subject "RMS Security Incident - $INCIDENT_ID"

# 4. Create incident ticket
echo "Creating incident documentation..."
cat > "incident-$INCIDENT_ID/incident-report.md" << EOF
# Security Incident Report - $INCIDENT_ID

## Incident Details
- **ID**: $INCIDENT_ID
- **Severity**: $SEVERITY
- **Type**: $INCIDENT_TYPE
- **Detection Time**: $(date)
- **Response Time**: $(date)

## Timeline
- $(date): Incident detected and response initiated

## Actions Taken
- Evidence collected
- Notifications sent
- [Add additional actions here]

## Next Steps
- [ ] Forensic analysis
- [ ] Root cause analysis
- [ ] Remediation planning
- [ ] Lessons learned
EOF

echo "Security incident response initiated. Incident ID: $INCIDENT_ID"
echo "Evidence collected in: incident-$INCIDENT_ID/"
```

### Security Playbooks

#### Compromised Credentials Playbook

```bash
#!/bin/bash
# playbooks/compromised-credentials.sh

USER_ID=${1}
CREDENTIAL_TYPE=${2:-"access-key"}

echo "=== COMPROMISED CREDENTIALS PLAYBOOK ==="
echo "User ID: $USER_ID"
echo "Credential Type: $CREDENTIAL_TYPE"

# 1. Immediately disable credentials
case "$CREDENTIAL_TYPE" in
    "access-key")
        echo "Disabling access keys for user $USER_ID..."
        aws iam list-access-keys --user-name "$USER_ID" \
            --query 'AccessKeyMetadata[].AccessKeyId' --output text | \
            xargs -I {} aws iam update-access-key --user-name "$USER_ID" --access-key-id {} --status Inactive
        ;;
    "password")
        echo "Resetting password for user $USER_ID..."
        aws iam update-login-profile --user-name "$USER_ID" --password-reset-required
        ;;
    "mfa")
        echo "Deactivating MFA devices for user $USER_ID..."
        aws iam list-mfa-devices --user-name "$USER_ID" \
            --query 'MFADevices[].SerialNumber' --output text | \
            xargs -I {} aws iam deactivate-mfa-device --user-name "$USER_ID" --serial-number {}
        ;;
esac

# 2. Audit recent activity
echo "Auditing recent activity..."
aws logs filter-log-events \
    --log-group-name "CloudTrail/RMS" \
    --start-time $(($(date +%s) - 86400))000 \
    --filter-pattern "{ $.userIdentity.userName = \"$USER_ID\" }" \
    --output table

# 3. Check for privilege escalation
echo "Checking for privilege escalation..."
aws iam get-user-policy --user-name "$USER_ID" || echo "No inline policies"
aws iam list-attached-user-policies --user-name "$USER_ID"

# 4. Generate new credentials (if authorized)
read -p "Generate new credentials for $USER_ID? (y/N): " -n 1 -r
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Generating new access key..."
    aws iam create-access-key --user-name "$USER_ID"
fi

echo "Compromised credentials playbook completed"
```

## Security Testing

### Penetration Testing

#### Automated Security Testing

```bash
#!/bin/bash
# scripts/security-testing.sh

ENVIRONMENT=${1:-staging}
TARGET_URL="https://api-$ENVIRONMENT.rms.example.com"

echo "=== RMS Security Testing Suite ==="
echo "Environment: $ENVIRONMENT"
echo "Target: $TARGET_URL"

# 1. OWASP ZAP Scanning
if command -v zap-baseline.py &> /dev/null; then
    echo "Running OWASP ZAP baseline scan..."
    zap-baseline.py -t "$TARGET_URL" -r zap-report.html
else
    echo "OWASP ZAP not available, skipping..."
fi

# 2. SSL/TLS Testing
echo "Testing SSL/TLS configuration..."
if command -v testssl &> /dev/null; then
    testssl --quiet --color 0 "$TARGET_URL" > ssl-test-results.txt
else
    echo "testssl.sh not available, using openssl..."
    echo | openssl s_client -connect $(echo $TARGET_URL | sed 's/https:\/\///'):443 -servername $(echo $TARGET_URL | sed 's/https:\/\///') 2>&1 | openssl x509 -noout -dates
fi

# 3. HTTP Security Headers
echo "Checking security headers..."
curl -I "$TARGET_URL" | grep -E "(Strict-Transport-Security|Content-Security-Policy|X-Frame-Options|X-Content-Type-Options)"

# 4. Authentication Testing
echo "Testing authentication endpoints..."

# Test rate limiting
echo "Testing rate limiting..."
for i in {1..20}; do
    curl -s -w "%{http_code}\n" -o /dev/null "$TARGET_URL/auth/login" \
        -X POST \
        -H "Content-Type: application/json" \
        -d '{"email":"test@example.com","password":"wrongpassword"}'
done | sort | uniq -c

# 5. Input Validation Testing
echo "Testing input validation..."

# SQL Injection attempts (should all fail)
curl -s -w "Status: %{http_code}\n" "$TARGET_URL/api/risk-assessments" \
    -H "Authorization: Bearer invalid-token" \
    -G -d "category='; DROP TABLE users; --"

# XSS attempts (should be blocked)
curl -s -w "Status: %{http_code}\n" "$TARGET_URL/api/risk-assessments" \
    -H "Authorization: Bearer invalid-token" \
    -X POST \
    -H "Content-Type: application/json" \
    -d '{"title":"<script>alert(\"xss\")</script>","description":"test"}'

echo "Security testing completed"
echo "Review results in: zap-report.html, ssl-test-results.txt"
```

### Vulnerability Management

#### Automated Vulnerability Scanning

```yaml
# .github/workflows/security-scan.yml
name: Security Scan

on:
  schedule:
    - cron: '0 2 * * *' # Daily at 2 AM
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  security-scan:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          scan-ref: '.'
          format: 'sarif'
          output: 'trivy-results.sarif'
          severity: 'CRITICAL,HIGH'

      - name: Upload Trivy scan results
        uses: github/codeql-action/upload-sarif@v2
        if: always()
        with:
          sarif_file: 'trivy-results.sarif'

      - name: Run Snyk to check for vulnerabilities
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          args: --severity-threshold=high

      - name: Run tfsec
        uses: aquasecurity/tfsec-action@v1.0.0
        with:
          soft_fail: true

      - name: Run Checkov
        uses: bridgecrewio/checkov-action@master
        with:
          directory: apps/infrastructure/
          framework: terraform
          soft_fail: true
```

## Compliance Requirements

### Data Privacy Compliance

#### GDPR Compliance Measures

1. **Data Minimization**: Collect only necessary data
2. **Right to Access**: Provide data export functionality
3. **Right to Erasure**: Implement data deletion procedures
4. **Data Protection Impact Assessment**: Regular privacy reviews
5. **Privacy by Design**: Built-in privacy protections

```typescript
// GDPR compliance implementation
export class GDPRService {
  // Right to access - export user data
  async exportUserData(userId: string): Promise<object> {
    const userData = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        riskAssessments: true,
        auditLogs: true,
        // Include all user-related data
      },
    });

    // Remove sensitive internal fields
    return {
      personal_data: {
        id: userData.id,
        email: userData.email,
        created_at: userData.createdAt,
        // ... other personal data
      },
      risk_assessments: userData.riskAssessments.map((ra) => ({
        id: ra.id,
        title: ra.title,
        description: ra.description,
        created_at: ra.createdAt,
      })),
      // ... other user data
    };
  }

  // Right to erasure - delete user data
  async deleteUserData(userId: string): Promise<void> {
    // Anonymize data that must be retained for legal reasons
    await prisma.$transaction([
      // Delete personal data
      prisma.user.update({
        where: { id: userId },
        data: {
          email: `deleted-${Date.now()}@deleted.com`,
          firstName: 'Deleted',
          lastName: 'User',
          deletedAt: new Date(),
        },
      }),

      // Delete or anonymize related data
      prisma.riskAssessment.updateMany({
        where: { userId: userId },
        data: {
          userId: null, // Anonymize
          title: 'Deleted Assessment',
          description: 'Data deleted per GDPR request',
        },
      }),
    ]);

    // Log the deletion for audit purposes
    await this.auditLog('DATA_DELETION', {
      userId: userId,
      timestamp: new Date(),
      reason: 'GDPR_RIGHT_TO_ERASURE',
    });
  }

  private async auditLog(event: string, data: object): Promise<void> {
    await prisma.auditLog.create({
      data: {
        event: event,
        data: JSON.stringify(data),
        timestamp: new Date(),
      },
    });
  }
}
```

### SOC 2 Compliance

#### Security Controls Documentation

1. **Logical and Physical Access Controls**

   - Multi-factor authentication required
   - Role-based access control implemented
   - Regular access reviews conducted

2. **System Operations**

   - Change management procedures documented
   - System monitoring and alerting configured
   - Incident response procedures established

3. **Risk Management**
   - Risk assessments conducted annually
   - Security policies updated regularly
   - Vendor risk assessments performed

---

**Last Updated**: 2024-12-16  
**Version**: 1.0  
**Next Review**: 2025-06-16  
**Compliance Officer**: security@example.com
