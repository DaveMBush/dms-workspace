# Story J.4: Frontend Deployment to S3 + CloudFront

## Status

Draft

## Story

**As a** frontend developer,
**I want** to deploy the Angular 20 SPA to S3 with CloudFront CDN distribution and proper routing configuration,
**so that** the RMS frontend application is globally distributed, performs well, and handles Angular routing correctly with HTTPS security.

## Acceptance Criteria

1. Configure S3 bucket for static website hosting with proper permissions and policies
2. Create CloudFront distribution with S3 origin and global edge locations
3. Configure proper caching headers and invalidation rules for Angular SPA assets
4. Handle Angular client-side routing with fallback to index.html for 404 errors
5. Setup SSL certificate via AWS Certificate Manager (ACM) with HTTPS enforcement
6. Configure CORS policies for API communication with backend services
7. Implement automated build and deployment pipeline for frontend updates
8. Setup cache busting strategy for application updates and versioning
9. Configure security headers and CSP policies for enhanced security
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

- [ ] **Task 1: Create S3 bucket for static website hosting** (AC: 1)

  - [ ] Create S3 bucket using Terraform with unique naming convention
  - [ ] Configure bucket for static website hosting with index.html as default
  - [ ] Setup bucket policy for public read access to website content
  - [ ] Configure bucket versioning for deployment rollback capability
  - [ ] Add bucket encryption and access logging for security compliance
  - [ ] Configure lifecycle policies for old version cleanup

- [ ] **Task 2: Create CloudFront distribution with S3 origin** (AC: 2, 5)

  - [ ] Create CloudFront distribution using Terraform configuration
  - [ ] Configure S3 as origin with Origin Access Control (OAC)
  - [ ] Setup SSL certificate via ACM for custom domain support
  - [ ] Configure HTTPS redirect and security policy (TLS 1.2+)
  - [ ] Add default root object configuration pointing to index.html
  - [ ] Configure geographic restrictions if required for compliance

- [ ] **Task 3: Configure caching and invalidation strategies** (AC: 3, 8)

  - [ ] Setup cache behaviors for different asset types (HTML, JS, CSS, images)
  - [ ] Configure short TTL for HTML files (5 minutes) and long TTL for assets (1 year)
  - [ ] Implement cache busting with Angular build hash in filenames
  - [ ] Create CloudFront invalidation automation for deployment pipeline
  - [ ] Configure cache headers for optimal browser and CDN caching
  - [ ] Add Gzip compression for text-based assets

- [ ] **Task 4: Handle Angular client-side routing** (AC: 4)

  - [ ] Configure CloudFront custom error pages for SPA routing
  - [ ] Setup 404 error page to redirect to index.html with 200 status
  - [ ] Configure 403 error page handling for unauthorized access
  - [ ] Test all Angular routes work correctly after CloudFront deployment
  - [ ] Validate deep linking works for bookmarked application URLs
  - [ ] Add proper canonical URL handling for SEO considerations

- [ ] **Task 5: Configure CORS and API integration** (AC: 6)

  - [ ] Update Angular environment configuration for production API endpoints
  - [ ] Configure CORS headers in CloudFront responses for API calls
  - [ ] Setup API Gateway or ALB CORS configuration for backend integration
  - [ ] Add environment-specific API base URL configuration
  - [ ] Test cross-origin requests work correctly in production
  - [ ] Add retry logic for failed API requests due to network issues

- [ ] **Task 6: Implement security headers and CSP** (AC: 9)

  - [ ] Configure security headers in CloudFront response headers policy
  - [ ] Add Content Security Policy (CSP) headers for XSS protection
  - [ ] Configure X-Frame-Options and X-Content-Type-Options headers
  - [ ] Add Strict-Transport-Security (HSTS) headers for HTTPS enforcement
  - [ ] Setup Referrer-Policy and Permissions-Policy headers
  - [ ] Test security headers with online security scanners

- [ ] **Task 7: Create automated deployment pipeline** (AC: 7)

  - [ ] Create build script for Angular production build with optimizations
  - [ ] Add S3 sync command for uploading built assets to bucket
  - [ ] Implement CloudFront cache invalidation after successful deployment
  - [ ] Add deployment success/failure notifications and rollback procedures
  - [ ] Configure deployment validation and smoke tests
  - [ ] Add blue-green deployment strategy for zero-downtime updates

- [ ] **Task 8: Environment configuration and optimization** (AC: 7, 8)
  - [ ] Configure Angular environments for dev, staging, and production
  - [ ] Add build optimization settings for production (AOT, tree-shaking)
  - [ ] Configure service worker for offline capability and caching
  - [ ] Add performance monitoring and analytics integration
  - [ ] Optimize bundle size and implement lazy loading for routes
  - [ ] Configure error tracking and user experience monitoring

## Dev Notes

### Previous Story Context

**Dependencies:**

- Story J.1 (Infrastructure Foundation) - requires basic AWS infrastructure
- Story J.3 (Backend Deployment) - requires backend API endpoints for configuration

### Data Models and Architecture

**Source: [apps/rms/project.json]**

- Angular 20 application with build output to `dist/apps/rms`
- SSR configuration available but static deployment preferred for CDN

**Source: [apps/rms/src/environments/]**

- Environment configuration files for API endpoints and feature flags
- Production environment needs backend API URL configuration

**Source: [package.json]**

- Build command: `nx run rms:build` produces optimized production build
- Angular 20 with PrimeNG components and modern build system

### File Locations

**Primary Files to Create:**

1. `/apps/infrastructure/modules/s3-website/main.tf` - S3 bucket for static website
2. `/apps/infrastructure/modules/s3-website/variables.tf` - S3 module input variables
3. `/apps/infrastructure/modules/s3-website/outputs.tf` - S3 bucket information
4. `/apps/infrastructure/modules/cloudfront/main.tf` - CloudFront distribution
5. `/apps/infrastructure/modules/cloudfront/variables.tf` - CloudFront module variables
6. `/apps/infrastructure/modules/cloudfront/outputs.tf` - CloudFront distribution info
7. `/scripts/deploy-frontend.sh` - Frontend deployment automation script
8. `/apps/rms/src/environments/environment.prod.ts` - Production environment config

**Primary Files to Modify:**

1. `/apps/infrastructure/environments/dev/main.tf` - Include S3 and CloudFront modules
2. `/apps/rms/angular.json` - Add production build optimizations
3. `/apps/rms/src/main.ts` - Add production-specific configurations

**Test Files to Create:**

1. `/scripts/deploy-frontend.spec.sh` - Deployment script validation
2. `/apps/rms/src/environments/environment.prod.spec.ts` - Environment config tests
3. `/e2e/frontend-deployment.spec.ts` - End-to-end deployment validation

### Technical Implementation Details

**S3 Bucket Configuration:**

```hcl
resource "aws_s3_bucket" "rms_frontend" {
  bucket = "rms-frontend-${var.environment}-${random_string.bucket_suffix.result}"

  tags = var.common_tags
}

resource "aws_s3_bucket_website_configuration" "rms_frontend" {
  bucket = aws_s3_bucket.rms_frontend.id

  index_document {
    suffix = "index.html"
  }

  error_document {
    key = "index.html"
  }
}

resource "aws_s3_bucket_public_access_block" "rms_frontend" {
  bucket = aws_s3_bucket.rms_frontend.id

  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

resource "aws_s3_bucket_policy" "rms_frontend" {
  bucket = aws_s3_bucket.rms_frontend.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "PublicReadGetObject"
        Effect    = "Allow"
        Principal = "*"
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.rms_frontend.arn}/*"
      }
    ]
  })
}
```

**CloudFront Distribution:**

```hcl
resource "aws_cloudfront_distribution" "rms_frontend" {
  origin {
    domain_name = aws_s3_bucket_website_configuration.rms_frontend.website_endpoint
    origin_id   = "S3-${aws_s3_bucket.rms_frontend.id}"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "http-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"

  aliases = var.domain_name != "" ? [var.domain_name] : []

  default_cache_behavior {
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-${aws_s3_bucket.rms_frontend.id}"
    compress         = true

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 300
    max_ttl                = 86400

    response_headers_policy_id = aws_cloudfront_response_headers_policy.rms_frontend.id
  }

  # Cache behavior for static assets
  ordered_cache_behavior {
    path_pattern     = "*.js"
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-${aws_s3_bucket.rms_frontend.id}"
    compress         = true

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 31536000
    default_ttl            = 31536000
    max_ttl                = 31536000
  }

  custom_error_response {
    error_code         = 404
    response_code      = 200
    response_page_path = "/index.html"
  }

  custom_error_response {
    error_code         = 403
    response_code      = 200
    response_page_path = "/index.html"
  }

  viewer_certificate {
    acm_certificate_arn      = var.ssl_certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }
}
```

**Security Headers Policy:**

```hcl
resource "aws_cloudfront_response_headers_policy" "rms_frontend" {
  name    = "rms-frontend-security-headers-${var.environment}"
  comment = "Security headers for RMS frontend application"

  security_headers_config {
    strict_transport_security {
      access_control_max_age_sec = 31536000
      include_subdomains         = true
      preload                    = true
    }

    content_type_options {
      override = true
    }

    frame_options {
      frame_option = "DENY"
    }

    referrer_policy {
      referrer_policy = "strict-origin-when-cross-origin"
    }
  }

  custom_headers_config {
    items {
      header   = "Content-Security-Policy"
      value    = "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' ${var.api_endpoint}; font-src 'self' data:"
      override = true
    }
  }
}
```

**Angular Production Environment:**

```typescript
// apps/rms/src/environments/environment.prod.ts
export const environment = {
  production: true,
  apiUrl: 'https://api.rms-app.com', // Will be replaced during build
  enableLogging: false,
  features: {
    enableAnalytics: true,
    enableErrorReporting: true,
    enablePerformanceMonitoring: true,
  },
  cache: {
    enableServiceWorker: true,
    cacheVersion: '1.0.0',
  },
  security: {
    enableCSP: true,
    strictSSL: true,
  },
};
```

**Angular Build Configuration:**

```json
// apps/rms/angular.json (production configuration)
{
  "build": {
    "builder": "@angular-devkit/build-angular:browser",
    "options": {
      "outputPath": "dist/apps/rms",
      "index": "apps/rms/src/index.html",
      "main": "apps/rms/src/main.ts",
      "polyfills": "apps/rms/src/polyfills.ts",
      "tsConfig": "apps/rms/tsconfig.app.json",
      "assets": ["apps/rms/src/favicon.ico", "apps/rms/src/assets"],
      "styles": ["apps/rms/src/styles.scss"],
      "scripts": []
    },
    "configurations": {
      "production": {
        "budgets": [
          {
            "type": "initial",
            "maximumWarning": "2mb",
            "maximumError": "5mb"
          }
        ],
        "outputHashing": "all",
        "sourceMap": false,
        "namedChunks": false,
        "extractLicenses": true,
        "vendorChunk": false,
        "buildOptimizer": true,
        "optimization": true,
        "aot": true
      }
    }
  }
}
```

**Deployment Script:**

```bash
#!/bin/bash
# scripts/deploy-frontend.sh
set -e

ENVIRONMENT=${1:-dev}
AWS_REGION=${2:-us-east-1}
BUILD_VERSION=${3:-$(date +%Y%m%d-%H%M%S)}

echo "Building Angular application for production..."
pnpm nx build rms --configuration=production

echo "Updating API endpoint in environment..."
API_ENDPOINT=$(aws ssm get-parameter \
  --name "/rms/${ENVIRONMENT}/api-endpoint" \
  --query 'Parameter.Value' \
  --output text \
  --region $AWS_REGION)

# Replace API endpoint in built files
find dist/apps/rms -name "*.js" -exec sed -i "s|PLACEHOLDER_API_URL|${API_ENDPOINT}|g" {} \;

echo "Syncing files to S3..."
aws s3 sync dist/apps/rms/ s3://${S3_BUCKET_NAME}/ \
  --delete \
  --cache-control "max-age=31536000" \
  --exclude "*.html" \
  --region $AWS_REGION

# Upload HTML files with short cache
aws s3 sync dist/apps/rms/ s3://${S3_BUCKET_NAME}/ \
  --cache-control "max-age=300" \
  --include "*.html" \
  --region $AWS_REGION

echo "Creating CloudFront invalidation..."
INVALIDATION_ID=$(aws cloudfront create-invalidation \
  --distribution-id $CLOUDFRONT_DISTRIBUTION_ID \
  --paths "/*" \
  --query 'Invalidation.Id' \
  --output text \
  --region $AWS_REGION)

echo "Waiting for invalidation to complete..."
aws cloudfront wait invalidation-completed \
  --distribution-id $CLOUDFRONT_DISTRIBUTION_ID \
  --id $INVALIDATION_ID \
  --region $AWS_REGION

echo "Frontend deployment completed successfully!"
echo "Application available at: https://${DOMAIN_NAME}"
```

**Service Worker Configuration:**

```typescript
// apps/rms/src/app/service-worker.config.ts
import { isDevMode } from '@angular/core';

export const swConfig = {
  enabled: !isDevMode(),
  registrationStrategy: 'registerWhenStable:30000',
  updateStrategy: 'versionUpdates',
  cacheStrategy: 'networkFirst',
};
```

### Testing Standards

**Source: [architecture/ci-and-testing.md]**

**Testing Framework:** Cypress for E2E testing, Playwright for cross-browser testing
**Test Location:** E2E tests in `/e2e/` directory, unit tests with source files
**Coverage Requirements:** Lines: 85%, Branches: 75%, Functions: 85%

**Testing Strategy:**

- **Unit Tests:** Test Angular components and services work correctly
- **Integration Tests:** Test complete frontend deployment and CDN behavior
- **E2E Tests:** Test application functionality through CloudFront
- **Performance Tests:** Validate load times and CDN cache effectiveness

**Key Test Scenarios:**

- Angular application builds successfully for production
- All routes work correctly after CloudFront deployment
- API calls work correctly through CORS configuration
- Cache headers are set correctly for different asset types
- Security headers are properly configured and enforced
- Service worker functions correctly for offline capability

**Performance Benchmarks:**

- Initial page load time should be < 3 seconds on 3G connection
- Cached page load time should be < 1 second
- Bundle size should be < 2MB for initial load
- CloudFront cache hit ratio should be > 90%
- Time to Interactive (TTI) should be < 5 seconds

**Security Testing:**

- Security headers properly configured and enforced
- Content Security Policy prevents XSS attacks
- HTTPS enforcement works correctly
- No sensitive information exposed in client-side code
- API endpoints properly protected with authentication

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
