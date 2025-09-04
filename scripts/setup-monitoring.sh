#!/bin/bash
# Monitoring Setup and Validation Script
# Sets up and validates CloudWatch monitoring configuration

set -e

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Default values
ENVIRONMENT=${1:-dev}
AWS_REGION=${2:-us-east-1}
CHECK_ONLY=${3:-false}

# Validate dependencies
check_dependencies() {
    log_info "Checking monitoring setup dependencies..."
    
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI is not installed or not in PATH"
        exit 1
    fi
    
    if ! aws sts get-caller-identity &> /dev/null; then
        log_error "AWS credentials not configured or invalid"
        exit 1
    fi
    
    log_info "Dependencies validated"
}

# Get infrastructure information
get_infrastructure_info() {
    log_info "Retrieving infrastructure information..."
    
    cd apps/infrastructure
    
    if [ ! -f "terraform.tfstate" ]; then
        log_error "Terraform state not found. Please run terraform apply first."
        exit 1
    fi
    
    # Get infrastructure outputs
    export VPC_ID=$(terraform output -raw vpc_id 2>/dev/null || echo "")
    export ECS_CLUSTER_NAME=$(terraform output -raw ecs_cluster_name 2>/dev/null || echo "")
    export ECS_SERVICE_NAME=$(terraform output -raw ecs_service_name 2>/dev/null || echo "")
    export ALB_NAME=$(terraform output -raw alb_name 2>/dev/null || echo "")
    export RDS_INSTANCE_ID=$(terraform output -raw rds_instance_identifier 2>/dev/null || echo "")
    
    cd - > /dev/null
    
    log_info "Infrastructure info retrieved:"
    log_info "  VPC ID: $VPC_ID"
    log_info "  ECS Cluster: $ECS_CLUSTER_NAME"
    log_info "  ECS Service: $ECS_SERVICE_NAME"
    log_info "  ALB Name: $ALB_NAME"
    log_info "  RDS Instance: $RDS_INSTANCE_ID"
}

# Validate CloudWatch log groups
validate_log_groups() {
    log_info "Validating CloudWatch log groups..."
    
    local log_groups=(
        "/aws/ecs/rms-backend-${ENVIRONMENT}"
        "/aws/applicationloadbalancer/rms-alb-${ENVIRONMENT}"
        "/aws/rds/instance/rms-postgres-${ENVIRONMENT}/postgresql"
        "/aws/vpc/flowlogs/rms-${ENVIRONMENT}"
    )
    
    for log_group in "${log_groups[@]}"; do
        if aws logs describe-log-groups --log-group-name-prefix "$log_group" --region "$AWS_REGION" | grep -q "logGroups"; then
            log_info "✓ Log group exists: $log_group"
        else
            log_warn "✗ Log group missing: $log_group"
        fi
    done
}

# Validate CloudWatch alarms
validate_alarms() {
    log_info "Validating CloudWatch alarms..."
    
    local alarm_prefixes=(
        "rms-high-error-rate-${ENVIRONMENT}"
        "rms-high-response-time-${ENVIRONMENT}"
        "rms-ecs-cpu-high-${ENVIRONMENT}"
        "rms-ecs-memory-high-${ENVIRONMENT}"
    )
    
    for alarm_prefix in "${alarm_prefixes[@]}"; do
        if aws cloudwatch describe-alarms --alarm-name-prefix "$alarm_prefix" --region "$AWS_REGION" | grep -q "MetricAlarms"; then
            log_info "✓ Alarm exists: $alarm_prefix"
        else
            log_warn "✗ Alarm missing: $alarm_prefix"
        fi
    done
}

# Validate SNS topics
validate_sns_topics() {
    log_info "Validating SNS topics..."
    
    local topic_name="rms-alerts-${ENVIRONMENT}"
    
    if aws sns list-topics --region "$AWS_REGION" | grep -q "$topic_name"; then
        log_info "✓ SNS topic exists: $topic_name"
        
        # Check subscriptions
        local topic_arn=$(aws sns list-topics --region "$AWS_REGION" | grep "$topic_name" | cut -d'"' -f4)
        local subscription_count=$(aws sns list-subscriptions-by-topic --topic-arn "$topic_arn" --region "$AWS_REGION" | jq '.Subscriptions | length')
        log_info "  Subscriptions: $subscription_count"
    else
        log_warn "✗ SNS topic missing: $topic_name"
    fi
}

# Validate dashboard
validate_dashboard() {
    log_info "Validating CloudWatch dashboard..."
    
    local dashboard_name="RMS-${ENVIRONMENT}-Overview"
    
    if aws cloudwatch list-dashboards --region "$AWS_REGION" | grep -q "$dashboard_name"; then
        log_info "✓ Dashboard exists: $dashboard_name"
    else
        log_warn "✗ Dashboard missing: $dashboard_name"
    fi
}

# Test metric queries
test_metrics() {
    log_info "Testing metric queries..."
    
    # Test ALB metrics
    if [ -n "$ALB_NAME" ]; then
        local end_time=$(date --iso-8601=seconds)
        local start_time=$(date --iso-8601=seconds -d '1 hour ago')
        
        local metric_count=$(aws cloudwatch get-metric-statistics \
            --namespace AWS/ApplicationELB \
            --metric-name RequestCount \
            --dimensions Name=LoadBalancer,Value="$ALB_NAME" \
            --start-time "$start_time" \
            --end-time "$end_time" \
            --period 3600 \
            --statistics Sum \
            --region "$AWS_REGION" \
            --query 'Datapoints | length' \
            --output text 2>/dev/null || echo "0")
        
        if [ "$metric_count" -gt 0 ]; then
            log_info "✓ ALB metrics available (${metric_count} datapoints)"
        else
            log_warn "✗ No ALB metrics found (may be normal for new infrastructure)"
        fi
    fi
    
    # Test ECS metrics
    if [ -n "$ECS_CLUSTER_NAME" ] && [ -n "$ECS_SERVICE_NAME" ]; then
        local metric_count=$(aws cloudwatch get-metric-statistics \
            --namespace AWS/ECS \
            --metric-name CPUUtilization \
            --dimensions Name=ServiceName,Value="$ECS_SERVICE_NAME" Name=ClusterName,Value="$ECS_CLUSTER_NAME" \
            --start-time "$start_time" \
            --end-time "$end_time" \
            --period 3600 \
            --statistics Average \
            --region "$AWS_REGION" \
            --query 'Datapoints | length' \
            --output text 2>/dev/null || echo "0")
        
        if [ "$metric_count" -gt 0 ]; then
            log_info "✓ ECS metrics available (${metric_count} datapoints)"
        else
            log_warn "✗ No ECS metrics found (may be normal for new infrastructure)"
        fi
    fi
}

# Generate monitoring report
generate_report() {
    log_info "Generating monitoring health report..."
    
    local report_file="monitoring-health-${ENVIRONMENT}-$(date +%Y%m%d-%H%M%S).txt"
    
    cat > "$report_file" << EOF
# Monitoring Health Report
Environment: $ENVIRONMENT
AWS Region: $AWS_REGION
Generated: $(date)

## Infrastructure
VPC ID: $VPC_ID
ECS Cluster: $ECS_CLUSTER_NAME
ECS Service: $ECS_SERVICE_NAME
ALB Name: $ALB_NAME
RDS Instance: $RDS_INSTANCE_ID

## Validation Results
EOF

    # Run validations and append to report
    validate_log_groups >> "$report_file" 2>&1
    validate_alarms >> "$report_file" 2>&1
    validate_sns_topics >> "$report_file" 2>&1
    validate_dashboard >> "$report_file" 2>&1
    test_metrics >> "$report_file" 2>&1
    
    log_info "Report generated: $report_file"
}

# Create sample alert
test_alert() {
    log_info "Testing alert system..."
    
    local topic_name="rms-alerts-${ENVIRONMENT}"
    local topic_arn=$(aws sns list-topics --region "$AWS_REGION" | grep "$topic_name" | cut -d'"' -f4 | head -1)
    
    if [ -n "$topic_arn" ]; then
        aws sns publish \
            --topic-arn "$topic_arn" \
            --message "Test alert from monitoring setup script. Timestamp: $(date)" \
            --subject "RMS Monitoring Test Alert" \
            --region "$AWS_REGION" > /dev/null
        
        log_info "✓ Test alert sent to SNS topic: $topic_name"
    else
        log_warn "✗ Could not find SNS topic to test alerts"
    fi
}

# Main execution
main() {
    log_info "Starting monitoring setup validation for environment: $ENVIRONMENT"
    
    check_dependencies
    get_infrastructure_info
    
    if [ "$CHECK_ONLY" = "true" ]; then
        log_info "Running validation checks only..."
        validate_log_groups
        validate_alarms
        validate_sns_topics
        validate_dashboard
        test_metrics
    else
        log_info "Running full monitoring setup and validation..."
        validate_log_groups
        validate_alarms
        validate_sns_topics
        validate_dashboard
        test_metrics
        test_alert
        generate_report
    fi
    
    log_info "Monitoring setup validation completed!"
}

# Handle script interruption
trap 'log_error "Script interrupted"; exit 1' INT TERM

# Show usage if help requested
if [ "$1" = "help" ] || [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "Usage: $0 [environment] [aws-region] [check-only]"
    echo "  environment: dev, staging, prod (default: dev)"
    echo "  aws-region: AWS region (default: us-east-1)"
    echo "  check-only: true/false - only run checks without actions (default: false)"
    echo ""
    echo "Examples:"
    echo "  $0 dev us-east-1"
    echo "  $0 prod us-west-2 true"
    exit 0
fi

# Run main function
main "$@"