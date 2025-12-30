# DMS AWS Deployment Guide

This directory contains comprehensive deployment documentation for the DMS (Document Management System) application on AWS.

## Quick Start

For immediate deployment, follow these steps:

1. [Prerequisites and Setup](terraform-setup.md)
2. [Environment Configuration](environment-setup.md)
3. [Infrastructure Deployment](infrastructure-deployment.md)
4. [Application Deployment](application-deployment.md)
5. [Post-Deployment Verification](post-deployment-verification.md)

## Documentation Structure

- **[terraform-setup.md](terraform-setup.md)** - Terraform installation and AWS CLI setup requirements
- **[environment-setup.md](environment-setup.md)** - Environment variable configuration and AWS parameter setup
- **[infrastructure-deployment.md](infrastructure-deployment.md)** - Step-by-step infrastructure deployment guide
- **[application-deployment.md](application-deployment.md)** - Application build and deployment procedures
- **[post-deployment-verification.md](post-deployment-verification.md)** - Deployment validation and health checks
- **[rollback-procedures.md](rollback-procedures.md)** - Emergency rollback procedures for failed deployments
- **[ci-cd-setup.md](ci-cd-setup.md)** - CI/CD pipeline configuration and usage
- **[deployment-checklist.md](deployment-checklist.md)** - Comprehensive deployment checklist

## Environment Support

The DMS application supports multiple deployment environments:

- **Development** - For feature development and testing
- **Staging** - Pre-production environment for integration testing
- **Production** - Live production environment

Each environment has its own configuration and deployment procedures documented in the respective guides.

## Architecture Overview

```
Internet → Route53 → CloudFront → S3 (Frontend)
Internet → Route53 → ALB → ECS Fargate (Backend) → RDS PostgreSQL
```

The DMS application follows a modern cloud-native architecture:

- **Frontend**: Angular 20 SPA hosted on CloudFront + S3
- **Backend**: Node.js Fastify API running on ECS Fargate
- **Database**: PostgreSQL on Amazon RDS
- **Monitoring**: CloudWatch + X-Ray for observability
- **Security**: VPC with public/private subnets, IAM roles, SSL/TLS encryption

## Support and Troubleshooting

- [Operations Runbook](../operations/runbook.md) - Daily operational procedures
- [Troubleshooting Guide](../operations/troubleshooting.md) - Common issues and solutions
- [Architecture Documentation](../architecture/README.md) - Detailed system architecture
- [Security Guide](../security/security-guide.md) - Security best practices

## Cost Estimation

**Monthly AWS costs (estimated):**

- Development: $15-25/month
- Production: $40-70/month

See [Cost Optimization Guide](../cost/optimization-guide.md) for detailed cost breakdown and optimization strategies.

## Getting Help

For deployment issues or questions:

1. Check the [Troubleshooting Guide](../operations/troubleshooting.md)
2. Review [Common Issues and Solutions](../operations/troubleshooting.md#common-deployment-issues)
3. Contact the DevOps team via Slack or email

## Contributing

When making changes to the deployment process:

1. Update the relevant documentation
2. Test changes in development environment first
3. Update deployment checklist if needed
4. Notify team of any breaking changes

---

**Last Updated**: 2024-12-16
**Version**: 1.0
