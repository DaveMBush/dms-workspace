#!/bin/bash

# DMS Daily Health Check Script
# This script performs daily health checks on DMS infrastructure
# Usage: ./scripts/daily-health-check.sh [environment]

set -e

# Configuration
ENVIRONMENT=${1:-production}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="${SCRIPT_DIR}/health-check-$(date +%Y%m%d).log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Environment-specific configuration
case "$ENVIRONMENT" in
    "production"|"prod")
        FRONTEND_URL="https://dms.example.com"
        API_URL="https://api.dms.example.com"
        DB_IDENTIFIER="dms-db-prod"
        CLUSTER_NAME="dms-cluster-prod"
        SERVICE_NAME="dms-backend-service-prod"
        LOG_GROUP="/aws/ecs/dms-backend-prod"
        ;;
    "staging")
        FRONTEND_URL="https://dms-staging.example.com"
        API_URL="https://api-staging.dms.example.com"
        DB_IDENTIFIER="dms-db-staging"
        CLUSTER_NAME="dms-cluster-staging"
        SERVICE_NAME="dms-backend-service-staging"
        LOG_GROUP="/aws/ecs/dms-backend-staging"
        ;;
    "development"|"dev")
        FRONTEND_URL="https://dms-dev.example.com"
        API_URL="https://api-dev.dms.example.com"
        DB_IDENTIFIER="dms-db-dev"
        CLUSTER_NAME="dms-cluster-dev"
        SERVICE_NAME="dms-backend-service-dev"
        LOG_GROUP="/aws/ecs/dms-backend-dev"
        ;;
    *)
        echo -e "${RED}❌ Unknown environment: $ENVIRONMENT${NC}"
        echo "Usage: $0 [production|staging|development]"
        exit 1
        ;;
esac

# Logging function
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

# Check if AWS CLI is available
check_aws_cli() {
    if ! command -v aws &> /dev/null; then
        echo -e "${RED}❌ AWS CLI not found. Please install AWS CLI.${NC}"
        exit 1
    fi

    # Test AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        echo -e "${RED}❌ AWS credentials not configured or invalid.${NC}"
        exit 1
    fi
}

# Check HTTP endpoint
check_http_endpoint() {
    local url=$1
    local name=$2
    local timeout=${3:-10}

    echo -e "${BLUE}Checking $name health...${NC}"

    if command -v curl &> /dev/null; then
        response=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$timeout" "$url/health" 2>/dev/null || echo "000")
    else
        echo -e "${YELLOW}⚠️ curl not available, skipping HTTP checks${NC}"
        return 1
    fi

    case "$response" in
        "200")
            echo -e "${GREEN}✅ $name OK (HTTP $response)${NC}"
            log "$name: OK (HTTP $response)"
            return 0
            ;;
        "000")
            echo -e "${RED}❌ $name TIMEOUT or CONNECTION FAILED${NC}"
            log "$name: TIMEOUT or CONNECTION FAILED"
            return 1
            ;;
        *)
            echo -e "${RED}❌ $name FAIL (HTTP $response)${NC}"
            log "$name: FAIL (HTTP $response)"
            return 1
            ;;
    esac
}

# Check RDS database
check_database() {
    echo -e "${BLUE}Checking database health...${NC}"

    local db_status
    db_status=$(aws rds describe-db-instances \
        --db-instance-identifier "$DB_IDENTIFIER" \
        --query 'DBInstances[0].DBInstanceStatus' \
        --output text 2>/dev/null || echo "error")

    case "$db_status" in
        "available")
            echo -e "${GREEN}✅ Database OK ($db_status)${NC}"
            log "Database: OK ($db_status)"
            return 0
            ;;
        "error")
            echo -e "${RED}❌ Database CHECK FAILED (instance not found or access denied)${NC}"
            log "Database: CHECK FAILED"
            return 1
            ;;
        *)
            echo -e "${YELLOW}⚠️ Database WARNING ($db_status)${NC}"
            log "Database: WARNING ($db_status)"
            return 1
            ;;
    esac
}

# Check ECS service
check_ecs_service() {
    echo -e "${BLUE}Checking ECS service health...${NC}"

    local service_info
    service_info=$(aws ecs describe-services \
        --cluster "$CLUSTER_NAME" \
        --services "$SERVICE_NAME" \
        --query 'services[0].[runningCount,desiredCount,pendingCount]' \
        --output text 2>/dev/null || echo "error")

    if [ "$service_info" = "error" ]; then
        echo -e "${RED}❌ ECS Service CHECK FAILED (service not found or access denied)${NC}"
        log "ECS Service: CHECK FAILED"
        return 1
    fi

    read -r running desired pending <<< "$service_info"

    echo "Running Tasks: $running/$desired (Pending: $pending)"

    if [ "$running" = "$desired" ] && [ "$pending" = "0" ]; then
        echo -e "${GREEN}✅ ECS Service OK${NC}"
        log "ECS Service: OK ($running/$desired tasks running)"
        return 0
    elif [ "$running" -gt 0 ]; then
        echo -e "${YELLOW}⚠️ ECS Service DEGRADED${NC}"
        log "ECS Service: DEGRADED ($running/$desired tasks running, $pending pending)"
        return 1
    else
        echo -e "${RED}❌ ECS Service DOWN${NC}"
        log "ECS Service: DOWN (0 tasks running)"
        return 1
    fi
}

# Check recent errors in logs
check_error_rate() {
    echo -e "${BLUE}Checking error rate...${NC}"

    # Get timestamp for 1 hour ago in milliseconds
    local start_time
    start_time=$(($(date +%s) - 3600))000

    local error_count
    error_count=$(aws logs filter-log-events \
        --log-group-name "$LOG_GROUP" \
        --start-time "$start_time" \
        --filter-pattern "ERROR" \
        --query 'length(events)' \
        --output text 2>/dev/null || echo "error")

    if [ "$error_count" = "error" ]; then
        echo -e "${YELLOW}⚠️ Error Rate CHECK FAILED (log group not accessible)${NC}"
        log "Error Rate: CHECK FAILED"
        return 1
    fi

    echo "Errors in last hour: $error_count"

    if [ "$error_count" -lt 10 ]; then
        echo -e "${GREEN}✅ Error Rate Normal${NC}"
        log "Error Rate: Normal ($error_count errors/hour)"
        return 0
    elif [ "$error_count" -lt 50 ]; then
        echo -e "${YELLOW}⚠️ Error Rate Elevated${NC}"
        log "Error Rate: Elevated ($error_count errors/hour)"
        return 1
    else
        echo -e "${RED}❌ Error Rate Critical${NC}"
        log "Error Rate: Critical ($error_count errors/hour)"
        return 1
    fi
}

# Check CloudWatch alarms
check_cloudwatch_alarms() {
    echo -e "${BLUE}Checking CloudWatch alarms...${NC}"

    local alarm_count
    alarm_count=$(aws cloudwatch describe-alarms \
        --state-value ALARM \
        --query 'length(MetricAlarms)' \
        --output text 2>/dev/null || echo "error")

    if [ "$alarm_count" = "error" ]; then
        echo -e "${YELLOW}⚠️ CloudWatch Alarms CHECK FAILED${NC}"
        log "CloudWatch Alarms: CHECK FAILED"
        return 1
    fi

    echo "Active alarms: $alarm_count"

    if [ "$alarm_count" = "0" ]; then
        echo -e "${GREEN}✅ No Active Alarms${NC}"
        log "CloudWatch Alarms: OK (0 active alarms)"
        return 0
    else
        echo -e "${RED}❌ Active Alarms Found${NC}"
        log "CloudWatch Alarms: WARNING ($alarm_count active alarms)"

        # List active alarms
        aws cloudwatch describe-alarms \
            --state-value ALARM \
            --query 'MetricAlarms[*].[AlarmName,StateReason]' \
            --output table 2>/dev/null || true

        return 1
    fi
}

# Main health check function
main() {
    echo -e "${BLUE}=== DMS Health Check ===${NC}"
    echo "Date: $(date)"
    echo "Environment: $ENVIRONMENT"
    echo "Log file: $LOG_FILE"
    echo

    log "=== Starting health check for $ENVIRONMENT environment ==="

    local exit_code=0

    # Check prerequisites
    check_aws_cli

    # Run all checks
    check_http_endpoint "$FRONTEND_URL" "Frontend" || exit_code=1
    echo

    check_http_endpoint "$API_URL" "API" || exit_code=1
    echo

    check_database || exit_code=1
    echo

    check_ecs_service || exit_code=1
    echo

    check_error_rate || exit_code=1
    echo

    check_cloudwatch_alarms || exit_code=1
    echo

    # Summary
    echo -e "${BLUE}=== Health Check Summary ===${NC}"
    if [ $exit_code -eq 0 ]; then
        echo -e "${GREEN}✅ All systems operational${NC}"
        log "Health check completed: All systems operational"
    else
        echo -e "${RED}❌ Issues detected - review output above${NC}"
        log "Health check completed: Issues detected"
    fi

    echo "Full log available at: $LOG_FILE"

    # Action recommendations
    if [ $exit_code -ne 0 ]; then
        echo
        echo -e "${YELLOW}Recommended Actions:${NC}"
        echo "1. Review the specific failed checks above"
        echo "2. Check the troubleshooting guide: docs/operations/troubleshooting.md"
        echo "3. If critical issues persist, escalate to on-call engineer"
        echo "4. Monitor CloudWatch dashboard for additional insights"
    fi

    exit $exit_code
}

# Check if running as script (not sourced)
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
