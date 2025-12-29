# Story J.5: Domain Setup and SSL Configuration

## Status

Draft

## Story

**As a** DevOps engineer,
**I want** to configure a custom domain with Route53 DNS and SSL certificates for both frontend and backend services,
**so that** the DMS application is accessible via professional domain names with secure HTTPS encryption and proper DNS management.

## Acceptance Criteria

1. Setup Route53 hosted zone for custom domain with proper NS record configuration
2. Request and validate SSL certificates via AWS Certificate Manager (ACM) for domain and subdomains
3. Configure DNS records for frontend application (A/AAAA records pointing to CloudFront)
4. Configure DNS records for backend API (A/AAAA records pointing to Application Load Balancer)
5. Setup proper subdomain routing (app.domain.com for frontend, api.domain.com for backend)
6. Configure certificate association with CloudFront distribution and ALB
7. Implement domain validation automation and certificate renewal monitoring
8. Add health checks and monitoring for DNS resolution and SSL certificate status
9. Document DNS propagation procedures and certificate management processes
10. Ensure the following commands run without errors:

- `pnpm format`
- `pnpm dupcheck`
- `pnpm nx run dms:test --code-coverage`
- `pnpm nx run server:build:production`
- `pnpm nx run server:test --code-coverage`
- `pnpm nx run server:lint`
- `pnpm nx run dms:lint`
- `pnpm nx run dms:build:production`
- `pnpm nx run dms-e2e:lint`

## Tasks / Subtasks

- [ ] **Task 1: Setup Route53 hosted zone and domain configuration** (AC: 1)

  - [ ] Create Route53 hosted zone using Terraform for custom domain
  - [ ] Configure NS records and delegate domain to Route53 name servers
  - [ ] Setup domain health checks for DNS resolution monitoring
  - [ ] Configure DNSSEC if required for enhanced security
  - [ ] Add domain registration monitoring and renewal alerts
  - [ ] Document name server configuration for domain registrar

- [ ] **Task 2: Request and validate SSL certificates** (AC: 2, 7)

  - [ ] Create ACM certificate requests for primary domain and subdomains
  - [ ] Configure DNS validation method for automated certificate validation
  - [ ] Setup certificate for CloudFront in us-east-1 region (required)
  - [ ] Setup certificate for ALB in application deployment region
  - [ ] Add Subject Alternative Names (SAN) for www subdomain and wildcard
  - [ ] Configure automatic certificate renewal and monitoring

- [ ] **Task 3: Configure frontend DNS records** (AC: 3, 5)

  - [ ] Create A and AAAA records for primary domain pointing to CloudFront
  - [ ] Configure www subdomain with redirect to primary domain
  - [ ] Setup app subdomain for application access if required
  - [ ] Add DNS health checks for frontend domain resolution
  - [ ] Configure proper TTL values for DNS records (300-900 seconds)
  - [ ] Test DNS propagation and resolution from multiple locations

- [ ] **Task 4: Configure backend API DNS records** (AC: 4, 5)

  - [ ] Create A and AAAA records for API subdomain pointing to ALB
  - [ ] Configure api.domain.com subdomain for backend API access
  - [ ] Setup health checks for API domain resolution and SSL validation
  - [ ] Add monitoring for API endpoint availability through domain
  - [ ] Configure DNS failover and backup strategies if required
  - [ ] Test API accessibility through custom domain

- [ ] **Task 5: Associate certificates with AWS services** (AC: 6)

  - [ ] Update CloudFront distribution to use ACM certificate
  - [ ] Update ALB listeners to use SSL certificate for HTTPS traffic
  - [ ] Configure HTTPS-only policies and HTTP to HTTPS redirects
  - [ ] Setup proper SSL/TLS security policies (TLS 1.2+)
  - [ ] Validate certificate chain and intermediate certificates
  - [ ] Test SSL configuration with SSL testing tools

- [ ] **Task 6: Implement monitoring and health checks** (AC: 8)

  - [ ] Create CloudWatch alarms for certificate expiration monitoring
  - [ ] Setup Route53 health checks for domain and subdomain availability
  - [ ] Configure SNS notifications for SSL certificate and DNS issues
  - [ ] Add monitoring for DNS query response times and resolution failures
  - [ ] Create dashboards for domain and certificate status monitoring
  - [ ] Setup automated testing for SSL configuration and domain access

- [ ] **Task 7: Environment-specific domain configuration** (AC: 5, 9)

  - [ ] Configure development subdomain (dev.app.domain.com)
  - [ ] Setup staging subdomain (staging.app.domain.com)
  - [ ] Configure environment-specific SSL certificates if required
  - [ ] Document domain naming conventions and environment mapping
  - [ ] Add environment variable configuration for domain endpoints
  - [ ] Create deployment scripts for domain-specific configurations

- [ ] **Task 8: Security and compliance configuration** (AC: 9)
  - [ ] Configure HSTS headers for enhanced security
  - [ ] Setup certificate transparency monitoring
  - [ ] Add domain security policies (CAA records)
  - [ ] Configure proper CORS policies for cross-domain requests
  - [ ] Implement security scanning for SSL configuration
  - [ ] Document security best practices and compliance requirements

## Dev Notes

### Previous Story Context

**Dependencies:**

- Story J.3 (Backend ECS) - requires ALB endpoint for API domain configuration
- Story J.4 (Frontend S3/CloudFront) - requires CloudFront distribution for app domain

### Data Models and Architecture

**Source: [Epic J Technical Notes]**

- Domain architecture: app.domain.com (frontend), api.domain.com (backend)
- SSL certificates required for CloudFront (us-east-1) and ALB (deployment region)
- Route53 for DNS management and health monitoring

**Source: [infrastructure/modules/cloudfront/]**

- CloudFront distribution needs certificate ARN for custom domain
- Aliases configuration for domain mapping

**Source: [infrastructure/modules/alb/]**

- ALB listeners need SSL certificate for HTTPS termination
- Security group updates for HTTPS traffic (port 443)

### File Locations

**Primary Files to Create:**

1. `/apps/infrastructure/modules/route53/main.tf` - Route53 hosted zone and DNS records
2. `/apps/infrastructure/modules/route53/variables.tf` - DNS module input variables
3. `/apps/infrastructure/modules/route53/outputs.tf` - DNS configuration outputs
4. `/apps/infrastructure/modules/acm/main.tf` - SSL certificate management
5. `/apps/infrastructure/modules/acm/variables.tf` - Certificate module variables
6. `/apps/infrastructure/modules/acm/outputs.tf` - Certificate ARN outputs
7. `/scripts/validate-dns.sh` - DNS validation and testing script
8. `/scripts/check-ssl.sh` - SSL certificate validation script

**Primary Files to Modify:**

1. `/apps/infrastructure/modules/cloudfront/main.tf` - Add certificate and domain configuration
2. `/apps/infrastructure/modules/alb/main.tf` - Add HTTPS listener with certificate
3. `/apps/infrastructure/environments/dev/main.tf` - Include Route53 and ACM modules
4. `/apps/dms/src/environments/environment.prod.ts` - Update API endpoint URLs

**Test Files to Create:**

1. `/e2e/domain-ssl-validation.spec.ts` - End-to-end domain and SSL testing
2. `/apps/infrastructure/modules/route53/main.tf.spec.ts` - Terraform module tests
3. `/scripts/validate-dns.spec.sh` - DNS validation script tests

### Technical Implementation Details

**Route53 Hosted Zone Configuration:**

```hcl
resource "aws_route53_zone" "main" {
  name    = var.domain_name
  comment = "Hosted zone for DMS application"

  tags = var.common_tags
}

# A record for frontend (apex domain)
resource "aws_route53_record" "frontend_apex" {
  zone_id = aws_route53_zone.main.zone_id
  name    = var.domain_name
  type    = "A"

  alias {
    name                   = var.cloudfront_domain_name
    zone_id                = var.cloudfront_hosted_zone_id
    evaluate_target_health = false
  }
}

# AAAA record for frontend (IPv6)
resource "aws_route53_record" "frontend_apex_ipv6" {
  zone_id = aws_route53_zone.main.zone_id
  name    = var.domain_name
  type    = "AAAA"

  alias {
    name                   = var.cloudfront_domain_name
    zone_id                = var.cloudfront_hosted_zone_id
    evaluate_target_health = false
  }
}

# A record for API subdomain
resource "aws_route53_record" "api" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "api.${var.domain_name}"
  type    = "A"

  alias {
    name                   = var.alb_dns_name
    zone_id                = var.alb_zone_id
    evaluate_target_health = true
  }
}

# WWW redirect record
resource "aws_route53_record" "www" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "www.${var.domain_name}"
  type    = "CNAME"
  ttl     = 300
  records = [var.domain_name]
}
```

**ACM Certificate Configuration:**

```hcl
# Certificate for CloudFront (must be in us-east-1)
resource "aws_acm_certificate" "frontend" {
  provider          = aws.us_east_1
  domain_name       = var.domain_name
  validation_method = "DNS"

  subject_alternative_names = [
    "*.${var.domain_name}",
    "www.${var.domain_name}"
  ]

  lifecycle {
    create_before_destroy = true
  }

  tags = var.common_tags
}

# Certificate for ALB (in deployment region)
resource "aws_acm_certificate" "backend" {
  domain_name       = "api.${var.domain_name}"
  validation_method = "DNS"

  subject_alternative_names = [
    "*.api.${var.domain_name}"
  ]

  lifecycle {
    create_before_destroy = true
  }

  tags = var.common_tags
}

# DNS validation records for frontend certificate
resource "aws_route53_record" "frontend_cert_validation" {
  provider = aws.us_east_1
  for_each = {
    for dvo in aws_acm_certificate.frontend.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = aws_route53_zone.main.zone_id
}

# Certificate validation for frontend
resource "aws_acm_certificate_validation" "frontend" {
  provider                = aws.us_east_1
  certificate_arn         = aws_acm_certificate.frontend.arn
  validation_record_fqdns = [for record in aws_route53_record.frontend_cert_validation : record.fqdn]

  timeouts {
    create = "5m"
  }
}
```

**CloudFront Distribution Update:**

```hcl
resource "aws_cloudfront_distribution" "dms_frontend" {
  # ... existing configuration ...

  aliases = [var.domain_name, "www.${var.domain_name}"]

  viewer_certificate {
    acm_certificate_arn            = var.ssl_certificate_arn
    ssl_support_method             = "sni-only"
    minimum_protocol_version       = "TLSv1.2_2021"
    cloudfront_default_certificate = false
  }

  # ... rest of configuration ...
}
```

**ALB HTTPS Listener Configuration:**

```hcl
resource "aws_lb_listener" "dms_backend_https" {
  load_balancer_arn = aws_lb.dms_backend.arn
  port              = "443"
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS-1-2-2017-01"
  certificate_arn   = var.ssl_certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.dms_backend.arn
  }
}

# HTTP to HTTPS redirect
resource "aws_lb_listener" "dms_backend_http_redirect" {
  load_balancer_arn = aws_lb.dms_backend.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type = "redirect"

    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}
```

**DNS Health Checks:**

```hcl
resource "aws_route53_health_check" "frontend" {
  fqdn                            = var.domain_name
  port                           = 443
  type                           = "HTTPS_STR_MATCH"
  resource_path                  = "/"
  failure_threshold              = "3"
  request_interval               = "30"
  search_string                  = "<title>DMS"
  cloudwatch_logs_region         = var.aws_region

  tags = merge(var.common_tags, {
    Name = "DMS Frontend Health Check"
  })
}

resource "aws_route53_health_check" "api" {
  fqdn                            = "api.${var.domain_name}"
  port                           = 443
  type                           = "HTTPS_STR_MATCH"
  resource_path                  = "/health"
  failure_threshold              = "3"
  request_interval               = "30"
  search_string                  = "healthy"
  cloudwatch_logs_region         = var.aws_region

  tags = merge(var.common_tags, {
    Name = "DMS API Health Check"
  })
}
```

**Certificate Monitoring:**

```hcl
resource "aws_cloudwatch_metric_alarm" "certificate_expiry" {
  alarm_name          = "dms-certificate-expiry-${var.environment}"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "DaysToExpiry"
  namespace           = "AWS/CertificateManager"
  period              = "86400"
  statistic           = "Average"
  threshold           = "30"
  alarm_description   = "This metric monitors certificate expiry"
  alarm_actions       = [var.sns_topic_arn]

  dimensions = {
    CertificateArn = aws_acm_certificate.frontend.arn
  }

  tags = var.common_tags
}
```

**DNS Validation Script:**

```bash
#!/bin/bash
# scripts/validate-dns.sh
set -e

DOMAIN=${1:-"example.com"}
API_DOMAIN="api.${DOMAIN}"

echo "Validating DNS configuration for ${DOMAIN}..."

# Check apex domain resolution
echo "Checking apex domain (${DOMAIN})..."
dig +short A ${DOMAIN}
dig +short AAAA ${DOMAIN}

# Check www subdomain
echo "Checking www subdomain..."
dig +short CNAME www.${DOMAIN}

# Check API subdomain
echo "Checking API subdomain (${API_DOMAIN})..."
dig +short A ${API_DOMAIN}

# Check SSL certificate
echo "Checking SSL certificate for ${DOMAIN}..."
echo | openssl s_client -servername ${DOMAIN} -connect ${DOMAIN}:443 2>/dev/null | \
  openssl x509 -noout -dates

echo "Checking SSL certificate for ${API_DOMAIN}..."
echo | openssl s_client -servername ${API_DOMAIN} -connect ${API_DOMAIN}:443 2>/dev/null | \
  openssl x509 -noout -dates

# Test HTTP to HTTPS redirect
echo "Testing HTTP to HTTPS redirect..."
curl -I -L http://${DOMAIN} | grep -E "HTTP/|Location:"
curl -I -L http://${API_DOMAIN} | grep -E "HTTP/|Location:"

echo "DNS and SSL validation completed successfully!"
```

**Environment Configuration:**

```typescript
// apps/dms/src/environments/environment.prod.ts
export const environment = {
  production: true,
  apiUrl: 'https://api.dms-app.com/api/v1',
  wsUrl: 'wss://api.dms-app.com/ws',
  domain: 'dms-app.com',
  enableLogging: false,
  ssl: {
    enforceHttps: true,
    hsts: true,
    certificateTransparency: true,
  },
  cors: {
    allowedOrigins: ['https://dms-app.com', 'https://www.dms-app.com'],
    credentials: true,
  },
};
```

### Testing Standards

**Source: [architecture/ci-and-testing.md]**

**Testing Framework:** Cypress for E2E testing, custom scripts for DNS/SSL validation
**Test Location:** E2E tests in `/e2e/` directory, validation scripts in `/scripts/`
**Coverage Requirements:** All domain endpoints must be accessible and secure

**Testing Strategy:**

- **DNS Tests:** Validate all DNS records resolve correctly
- **SSL Tests:** Verify SSL certificates are valid and properly configured
- **E2E Tests:** Test complete application flow through custom domains
- **Security Tests:** Validate HTTPS enforcement and security headers

**Key Test Scenarios:**

- All DNS records resolve to correct IP addresses/aliases
- SSL certificates are valid and trusted
- HTTP to HTTPS redirects work correctly
- API endpoints accessible through custom domain
- Health checks pass for all domains
- Certificate expiration monitoring works correctly

**Performance Benchmarks:**

- DNS resolution time should be < 100ms
- SSL handshake time should be < 500ms
- Certificate validation should be automatic
- Health check response time should be < 2 seconds

**Security Testing:**

- SSL configuration rated A+ on SSL Labs
- HSTS headers properly configured
- Certificate chain validation passes
- No mixed content warnings
- Proper CORS configuration for cross-domain requests

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
