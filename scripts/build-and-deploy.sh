#!/bin/bash

# RMS Backend Build and Deploy Script
# This script builds the Docker image, pushes it to ECR, and updates the ECS service

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
ENVIRONMENT=${1:-dev}
AWS_REGION=${2:-us-east-1}
IMAGE_TAG=${3:-latest}
PROJECT_NAME="rms"
DOCKERFILE_PATH="apps/server/Dockerfile"

# Derived values
ECR_REPOSITORY_NAME="${PROJECT_NAME}-backend-${ENVIRONMENT}"
ECS_CLUSTER_NAME="${PROJECT_NAME}-cluster-${ENVIRONMENT}"
ECS_SERVICE_NAME="${PROJECT_NAME}-backend-service-${ENVIRONMENT}"

# Helper functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if required tools are installed
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed or not in PATH"
        exit 1
    fi
    
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI is not installed or not in PATH"
        exit 1
    fi
    
    # Check if Dockerfile exists
    if [ ! -f "$DOCKERFILE_PATH" ]; then
        log_error "Dockerfile not found at $DOCKERFILE_PATH"
        exit 1
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        log_error "AWS credentials not configured or invalid"
        exit 1
    fi
    
    log_success "Prerequisites check completed"
}

get_ecr_repository_uri() {
    log_info "Getting ECR repository URI..."
    
    ECR_REPOSITORY_URI=$(aws ecr describe-repositories \
        --repository-names "$ECR_REPOSITORY_NAME" \
        --region "$AWS_REGION" \
        --query 'repositories[0].repositoryUri' \
        --output text 2>/dev/null || echo "")
    
    if [ -z "$ECR_REPOSITORY_URI" ] || [ "$ECR_REPOSITORY_URI" = "None" ]; then
        log_error "ECR repository '$ECR_REPOSITORY_NAME' not found in region '$AWS_REGION'"
        log_info "Please ensure the Terraform infrastructure has been applied first"
        exit 1
    fi
    
    log_success "ECR repository URI: $ECR_REPOSITORY_URI"
}

build_docker_image() {
    log_info "Building Docker image..."
    
    # Build the image with build-time arguments
    docker build \
        -f "$DOCKERFILE_PATH" \
        -t "${PROJECT_NAME}-backend:${IMAGE_TAG}" \
        -t "${PROJECT_NAME}-backend:latest" \
        --build-arg NODE_ENV="$ENVIRONMENT" \
        . || {
        log_error "Docker build failed"
        exit 1
    }
    
    log_success "Docker image built successfully"
}

authenticate_ecr() {
    log_info "Authenticating with Amazon ECR..."
    
    aws ecr get-login-password --region "$AWS_REGION" | \
        docker login --username AWS --password-stdin "$ECR_REPOSITORY_URI" || {
        log_error "ECR authentication failed"
        exit 1
    }
    
    log_success "Successfully authenticated with ECR"
}

push_to_ecr() {
    log_info "Tagging and pushing image to ECR..."
    
    # Tag the image for ECR
    docker tag "${PROJECT_NAME}-backend:${IMAGE_TAG}" "${ECR_REPOSITORY_URI}:${IMAGE_TAG}"
    docker tag "${PROJECT_NAME}-backend:${IMAGE_TAG}" "${ECR_REPOSITORY_URI}:latest"
    
    # Push both tags
    docker push "${ECR_REPOSITORY_URI}:${IMAGE_TAG}" || {
        log_error "Failed to push image with tag $IMAGE_TAG"
        exit 1
    }
    
    docker push "${ECR_REPOSITORY_URI}:latest" || {
        log_error "Failed to push image with latest tag"
        exit 1
    }
    
    log_success "Images pushed to ECR successfully"
}

update_ecs_service() {
    log_info "Updating ECS service..."
    
    # Check if ECS service exists
    if ! aws ecs describe-services \
        --cluster "$ECS_CLUSTER_NAME" \
        --services "$ECS_SERVICE_NAME" \
        --region "$AWS_REGION" \
        --query 'services[0].serviceName' \
        --output text &> /dev/null; then
        log_error "ECS service '$ECS_SERVICE_NAME' not found in cluster '$ECS_CLUSTER_NAME'"
        exit 1
    fi
    
    # Force new deployment
    aws ecs update-service \
        --cluster "$ECS_CLUSTER_NAME" \
        --service "$ECS_SERVICE_NAME" \
        --force-new-deployment \
        --region "$AWS_REGION" \
        --no-cli-pager > /dev/null || {
        log_error "Failed to update ECS service"
        exit 1
    }
    
    log_success "ECS service update initiated"
}

wait_for_deployment() {
    log_info "Waiting for deployment to complete..."
    
    # Wait for service to become stable
    aws ecs wait services-stable \
        --cluster "$ECS_CLUSTER_NAME" \
        --services "$ECS_SERVICE_NAME" \
        --region "$AWS_REGION" || {
        log_error "Deployment failed or timed out"
        
        # Get service events for debugging
        log_info "Recent service events:"
        aws ecs describe-services \
            --cluster "$ECS_CLUSTER_NAME" \
            --services "$ECS_SERVICE_NAME" \
            --region "$AWS_REGION" \
            --query 'services[0].events[:5].[createdAt,message]' \
            --output table
        
        exit 1
    }
    
    log_success "Deployment completed successfully"
}

validate_deployment() {
    log_info "Validating deployment..."
    
    # Get service details
    SERVICE_INFO=$(aws ecs describe-services \
        --cluster "$ECS_CLUSTER_NAME" \
        --services "$ECS_SERVICE_NAME" \
        --region "$AWS_REGION" \
        --query 'services[0]' \
        --output json)
    
    RUNNING_COUNT=$(echo "$SERVICE_INFO" | jq -r '.runningCount')
    DESIRED_COUNT=$(echo "$SERVICE_INFO" | jq -r '.desiredCount')
    
    if [ "$RUNNING_COUNT" -eq "$DESIRED_COUNT" ]; then
        log_success "Service is healthy: $RUNNING_COUNT/$DESIRED_COUNT tasks running"
    else
        log_warning "Service may not be fully healthy: $RUNNING_COUNT/$DESIRED_COUNT tasks running"
    fi
    
    # Get task ARNs
    TASK_ARNS=$(aws ecs list-tasks \
        --cluster "$ECS_CLUSTER_NAME" \
        --service-name "$ECS_SERVICE_NAME" \
        --region "$AWS_REGION" \
        --query 'taskArns' \
        --output text)
    
    if [ -n "$TASK_ARNS" ]; then
        log_info "Active tasks:"
        echo "$TASK_ARNS" | tr '\t' '\n' | sed 's|.*/||' | while read -r task_id; do
            echo "  - $task_id"
        done
    fi
}

cleanup() {
    log_info "Cleaning up local Docker images..."
    
    # Remove local images to save space
    docker rmi "${PROJECT_NAME}-backend:${IMAGE_TAG}" 2>/dev/null || true
    docker rmi "${PROJECT_NAME}-backend:latest" 2>/dev/null || true
    docker rmi "${ECR_REPOSITORY_URI}:${IMAGE_TAG}" 2>/dev/null || true
    docker rmi "${ECR_REPOSITORY_URI}:latest" 2>/dev/null || true
    
    log_success "Cleanup completed"
}

show_usage() {
    echo "Usage: $0 [ENVIRONMENT] [AWS_REGION] [IMAGE_TAG]"
    echo ""
    echo "Arguments:"
    echo "  ENVIRONMENT  Environment name (default: dev)"
    echo "  AWS_REGION   AWS region (default: us-east-1)"
    echo "  IMAGE_TAG    Docker image tag (default: latest)"
    echo ""
    echo "Example:"
    echo "  $0 dev us-east-1 v1.0.0"
    echo "  $0 prod us-west-2 $(git rev-parse --short HEAD)"
}

main() {
    if [[ "$1" == "-h" || "$1" == "--help" ]]; then
        show_usage
        exit 0
    fi
    
    log_info "Starting deployment process..."
    log_info "Environment: $ENVIRONMENT"
    log_info "AWS Region: $AWS_REGION"
    log_info "Image Tag: $IMAGE_TAG"
    log_info "Project: $PROJECT_NAME"
    
    # Execute deployment steps
    check_prerequisites
    get_ecr_repository_uri
    build_docker_image
    authenticate_ecr
    push_to_ecr
    update_ecs_service
    wait_for_deployment
    validate_deployment
    cleanup
    
    log_success "🚀 Deployment completed successfully!"
    log_info "Your application should be available through the load balancer"
}

# Trap to handle script interruption
trap 'log_error "Deployment interrupted"; exit 130' INT TERM

# Run main function
main "$@"