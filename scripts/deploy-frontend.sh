#!/bin/bash
# Frontend Deployment Script for RMS Angular Application
# Builds Angular app for production and deploys to S3 with CloudFront invalidation

set -e

# Default values
ENVIRONMENT=${1:-dev}
AWS_REGION=${2:-us-east-1}
BUILD_VERSION=${3:-$(date +%Y%m%d-%H%M%S)}

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Validate required environment variables
check_dependencies() {
    log_info "Checking deployment dependencies..."
    
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI is not installed or not in PATH"
        exit 1
    fi
    
    if ! command -v pnpm &> /dev/null; then
        log_error "pnpm is not installed or not in PATH"
        exit 1
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        log_error "AWS credentials not configured or invalid"
        exit 1
    fi
    
    log_info "All dependencies available"
}

# Get infrastructure outputs from Terraform
get_infrastructure_info() {
    log_info "Retrieving infrastructure information..."
    
    cd apps/infrastructure
    
    if [ ! -f "terraform.tfstate" ]; then
        log_error "Terraform state not found. Please run terraform apply first."
        exit 1
    fi
    
    export S3_BUCKET_NAME=$(terraform output -raw s3_website_bucket_name 2>/dev/null || echo "")
    export CLOUDFRONT_DISTRIBUTION_ID=$(terraform output -raw cloudfront_distribution_id 2>/dev/null || echo "")
    export API_ENDPOINT=$(terraform output -raw alb_dns_name 2>/dev/null || echo "")
    
    cd - > /dev/null
    
    if [[ -z "$S3_BUCKET_NAME" ]]; then
        log_error "Failed to get S3 bucket name from Terraform outputs"
        exit 1
    fi
    
    if [[ -z "$CLOUDFRONT_DISTRIBUTION_ID" ]]; then
        log_error "Failed to get CloudFront distribution ID from Terraform outputs"
        exit 1
    fi
    
    log_info "Infrastructure info retrieved:"
    log_info "  S3 Bucket: $S3_BUCKET_NAME"
    log_info "  CloudFront Distribution: $CLOUDFRONT_DISTRIBUTION_ID"
    log_info "  API Endpoint: $API_ENDPOINT"
}

# Build Angular application for production
build_frontend() {
    log_info "Building Angular application for production..."
    
    # Clean previous build
    if [ -d "dist/apps/rms" ]; then
        rm -rf dist/apps/rms
        log_info "Cleaned previous build"
    fi
    
    # Build with production configuration
    pnpm nx build rms --configuration=production
    
    if [ ! -d "dist/apps/rms" ]; then
        log_error "Build failed - output directory not found"
        exit 1
    fi
    
    log_info "Build completed successfully"
}

# Update API endpoint in built files
update_api_endpoint() {
    if [[ -n "$API_ENDPOINT" ]]; then
        log_info "Updating API endpoint in built files..."
        
        # Replace placeholder with actual API endpoint
        find dist/apps/rms -name "*.js" -type f -exec sed -i "s|PLACEHOLDER_API_URL|https://${API_ENDPOINT}|g" {} \;
        
        log_info "API endpoint updated to: https://${API_ENDPOINT}"
    else
        log_warn "API endpoint not available, skipping endpoint update"
    fi
}

# Deploy to S3
deploy_to_s3() {
    log_info "Deploying to S3 bucket: $S3_BUCKET_NAME"
    
    # Sync static assets with long cache (exclude HTML)
    aws s3 sync dist/apps/rms/ s3://${S3_BUCKET_NAME}/ \
        --delete \
        --cache-control "max-age=31536000,public,immutable" \
        --exclude "*.html" \
        --region $AWS_REGION
    
    # Upload HTML files with short cache
    aws s3 sync dist/apps/rms/ s3://${S3_BUCKET_NAME}/ \
        --cache-control "max-age=300,public" \
        --include "*.html" \
        --region $AWS_REGION
    
    log_info "S3 deployment completed"
}

# Create CloudFront invalidation
invalidate_cloudfront() {
    if [[ -n "$CLOUDFRONT_DISTRIBUTION_ID" ]]; then
        log_info "Creating CloudFront invalidation..."
        
        INVALIDATION_ID=$(aws cloudfront create-invalidation \
            --distribution-id $CLOUDFRONT_DISTRIBUTION_ID \
            --paths "/*" \
            --query 'Invalidation.Id' \
            --output text \
            --region $AWS_REGION)
        
        log_info "Invalidation created with ID: $INVALIDATION_ID"
        
        # Wait for invalidation to complete (optional)
        if [[ "${WAIT_FOR_INVALIDATION:-false}" == "true" ]]; then
            log_info "Waiting for invalidation to complete..."
            aws cloudfront wait invalidation-completed \
                --distribution-id $CLOUDFRONT_DISTRIBUTION_ID \
                --id $INVALIDATION_ID \
                --region $AWS_REGION
            log_info "Invalidation completed"
        else
            log_info "Invalidation in progress. Use WAIT_FOR_INVALIDATION=true to wait."
        fi
    else
        log_warn "CloudFront distribution ID not available, skipping invalidation"
    fi
}

# Validate deployment
validate_deployment() {
    log_info "Validating deployment..."
    
    if [[ -n "$CLOUDFRONT_DISTRIBUTION_ID" ]]; then
        # Get CloudFront domain name
        CLOUDFRONT_DOMAIN=$(aws cloudfront get-distribution \
            --id $CLOUDFRONT_DISTRIBUTION_ID \
            --query 'Distribution.DomainName' \
            --output text \
            --region $AWS_REGION)
        
        log_info "Application should be available at: https://${CLOUDFRONT_DOMAIN}"
        
        # Basic connectivity test
        if curl -s -o /dev/null -w "%{http_code}" "https://${CLOUDFRONT_DOMAIN}" | grep -q "200"; then
            log_info "Deployment validation successful"
        else
            log_warn "Deployment validation failed - application may not be accessible yet"
        fi
    fi
}

# Main deployment function
main() {
    log_info "Starting frontend deployment for environment: $ENVIRONMENT"
    log_info "Build version: $BUILD_VERSION"
    log_info "AWS Region: $AWS_REGION"
    
    check_dependencies
    get_infrastructure_info
    build_frontend
    update_api_endpoint
    deploy_to_s3
    invalidate_cloudfront
    validate_deployment
    
    log_info "Frontend deployment completed successfully!"
    
    if [[ -n "$CLOUDFRONT_DISTRIBUTION_ID" ]]; then
        CLOUDFRONT_DOMAIN=$(aws cloudfront get-distribution \
            --id $CLOUDFRONT_DISTRIBUTION_ID \
            --query 'Distribution.DomainName' \
            --output text \
            --region $AWS_REGION 2>/dev/null || echo "")
        
        if [[ -n "$CLOUDFRONT_DOMAIN" ]]; then
            log_info "🚀 Application URL: https://${CLOUDFRONT_DOMAIN}"
        fi
    fi
}

# Handle script interruption
trap 'log_error "Deployment interrupted"; exit 1' INT TERM

# Run main function
main "$@"