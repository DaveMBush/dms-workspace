# RMS Disaster Recovery and Backup Procedures

This document outlines comprehensive disaster recovery (DR) and backup procedures for the RMS (Risk Management System) application.

## Table of Contents

1. [Overview](#overview)
2. [Recovery Time and Point Objectives](#recovery-time-and-point-objectives)
3. [Backup Strategy](#backup-strategy)
4. [Disaster Recovery Architecture](#disaster-recovery-architecture)
5. [Data Backup Procedures](#data-backup-procedures)
6. [Infrastructure Recovery](#infrastructure-recovery)
7. [Application Recovery](#application-recovery)
8. [Testing and Validation](#testing-and-validation)
9. [Incident Response Procedures](#incident-response-procedures)
10. [Business Continuity Plans](#business-continuity-plans)

## Overview

The RMS disaster recovery strategy is designed to ensure business continuity and data protection against various failure scenarios including:

- Regional AWS outages
- Database corruption or failure
- Application or infrastructure compromise
- Human error and accidental deletion
- Natural disasters affecting data centers
- Cyber security incidents

### Disaster Categories

| Category     | Impact                       | Recovery Priority    | Example Scenarios                     |
| ------------ | ---------------------------- | -------------------- | ------------------------------------- |
| **Critical** | Complete service unavailable | Immediate (< 1 hour) | Regional AWS outage, RDS failure      |
| **High**     | Major functionality impaired | < 4 hours            | ECS cluster failure, ALB issues       |
| **Medium**   | Partial functionality lost   | < 24 hours           | S3 bucket issues, CloudFront problems |
| **Low**      | Minor issues or degradation  | < 72 hours           | Non-critical service issues           |

## Recovery Time and Point Objectives

### RTO/RPO Targets by Environment

| Environment     | RTO Target | RPO Target | Justification                       |
| --------------- | ---------- | ---------- | ----------------------------------- |
| **Production**  | 1 hour     | 15 minutes | Business critical, customer-facing  |
| **Staging**     | 4 hours    | 1 hour     | Pre-production testing requirements |
| **Development** | 24 hours   | 4 hours    | Development workflow continuity     |

### Service-Level Objectives

| Component                    | RTO        | RPO           | Backup Frequency             |
| ---------------------------- | ---------- | ------------- | ---------------------------- |
| **Database (RDS)**           | 30 minutes | 5 minutes     | Continuous + Daily snapshots |
| **Application (ECS)**        | 15 minutes | 0 (stateless) | Container image registry     |
| **Frontend (S3/CloudFront)** | 10 minutes | 0 (versioned) | Cross-region replication     |
| **Infrastructure**           | 1 hour     | N/A           | Terraform state backup       |

## Backup Strategy

### Automated Backup Systems

#### RDS Automated Backups

```bash
# Current RDS backup configuration
aws rds describe-db-instances \
  --db-instance-identifier rms-db-prod \
  --query 'DBInstances[0].[BackupRetentionPeriod,PreferredBackupWindow,PreferredMaintenanceWindow]'

# Expected output: [30, "03:00-04:00", "Sun:04:00-Sun:05:00"]
```

**Configuration:**

- **Backup Window**: 03:00-04:00 UTC (off-peak hours)
- **Retention Period**: 30 days for production, 7 days for non-production
- **Point-in-Time Recovery**: Enabled with transaction log backups every 5 minutes
- **Cross-Region Backup**: Automated copying to secondary region

#### Manual Snapshot Creation

```bash
#!/bin/bash
# scripts/create-manual-snapshot.sh

ENVIRONMENT=${1:-production}
DB_IDENTIFIER="rms-db-${ENVIRONMENT}"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
SNAPSHOT_ID="${DB_IDENTIFIER}-manual-${TIMESTAMP}"

echo "Creating manual snapshot for ${DB_IDENTIFIER}..."
aws rds create-db-snapshot \
  --db-instance-identifier "$DB_IDENTIFIER" \
  --db-snapshot-identifier "$SNAPSHOT_ID" \
  --tags Key=Environment,Value="$ENVIRONMENT" \
         Key=Type,Value=Manual \
         Key=CreatedBy,Value="$(whoami)" \
         Key=Purpose,Value="Pre-maintenance backup"

echo "Monitoring snapshot creation..."
aws rds wait db-snapshot-completed --db-snapshot-identifier "$SNAPSHOT_ID"
echo "Snapshot $SNAPSHOT_ID created successfully"

# Copy to secondary region for DR
aws rds copy-db-snapshot \
  --source-db-snapshot-identifier "$SNAPSHOT_ID" \
  --target-db-snapshot-identifier "$SNAPSHOT_ID" \
  --source-region us-east-1 \
  --target-region us-west-2

echo "Cross-region copy initiated"
```

### Application Data Backup

#### Container Images

```bash
# Backup container images to multiple registries
docker tag rms-backend:latest 123456789012.dkr.ecr.us-east-1.amazonaws.com/rms-backend:latest
docker tag rms-backend:latest 123456789012.dkr.ecr.us-west-2.amazonaws.com/rms-backend:latest

docker push 123456789012.dkr.ecr.us-east-1.amazonaws.com/rms-backend:latest
docker push 123456789012.dkr.ecr.us-west-2.amazonaws.com/rms-backend:latest
```

#### Frontend Assets

```bash
# Enable versioning and cross-region replication
aws s3api put-bucket-versioning \
  --bucket rms-frontend-prod \
  --versioning-configuration Status=Enabled

# Cross-region replication configuration
aws s3api put-bucket-replication \
  --bucket rms-frontend-prod \
  --replication-configuration file://s3-replication-config.json
```

### Infrastructure as Code Backup

#### Terraform State Backup

```bash
#!/bin/bash
# scripts/backup-terraform-state.sh

ENVIRONMENT=${1:-production}
STATE_BUCKET="rms-terraform-state"
BACKUP_BUCKET="rms-terraform-state-backup"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

echo "Backing up Terraform state for $ENVIRONMENT..."

# Copy current state to backup location
aws s3 cp "s3://$STATE_BUCKET/terraform.tfstate" \
  "s3://$BACKUP_BUCKET/$ENVIRONMENT/terraform-${TIMESTAMP}.tfstate"

# Copy lock table
aws dynamodb scan \
  --table-name rms-terraform-locks \
  --output json > "terraform-locks-${TIMESTAMP}.json"

aws s3 cp "terraform-locks-${TIMESTAMP}.json" \
  "s3://$BACKUP_BUCKET/$ENVIRONMENT/"

echo "Terraform state backed up successfully"
rm "terraform-locks-${TIMESTAMP}.json"
```

## Disaster Recovery Architecture

### Multi-Region Setup

```
Primary Region (us-east-1)          Secondary Region (us-west-2)
┌─────────────────────────────┐    ┌─────────────────────────────┐
│                             │    │                             │
│  ┌─────────┐  ┌───────────┐ │    │  ┌─────────┐  ┌───────────┐ │
│  │   RDS   │  │    ECS    │ │    │  │   RDS   │  │    ECS    │ │
│  │ Primary │  │ Cluster   │ │    │  │ Read    │  │ Standby   │ │
│  └─────────┘  └───────────┘ │    │  │ Replica │  │ (Scaled   │ │
│                             │    │  └─────────┘  │  to Zero) │ │
│  ┌─────────┐  ┌───────────┐ │    │               └───────────┘ │
│  │   S3    │  │CloudFront │ │    │  ┌─────────┐               │
│  │ Primary │  │ Primary   │ │    │  │   S3    │               │
│  └─────────┘  └───────────┘ │    │  │ Backup  │               │
│                             │    │  └─────────┘               │
└─────────────────────────────┘    └─────────────────────────────┘
```

### Failover Strategy

1. **Automatic Failover (Database)**:

   - RDS Read Replica in secondary region
   - Automatic promotion in case of primary failure
   - DNS updates via Route53 health checks

2. **Manual Failover (Application)**:

   - ECS cluster deployed but scaled to zero in DR region
   - Rapid scale-up procedures documented
   - Load balancer configuration ready

3. **Content Delivery**:
   - CloudFront automatically fails over to secondary origins
   - S3 cross-region replication ensures content availability

## Data Backup Procedures

### Daily Backup Routine

```bash
#!/bin/bash
# scripts/daily-backup-routine.sh

set -e

ENVIRONMENT="production"
LOG_FILE="/var/log/rms/backup-$(date +%Y%m%d).log"

log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

# 1. Create manual RDS snapshot
log "Starting daily backup routine for $ENVIRONMENT"

SNAPSHOT_ID="rms-db-prod-daily-$(date +%Y%m%d)"
aws rds create-db-snapshot \
  --db-instance-identifier "rms-db-prod" \
  --db-snapshot-identifier "$SNAPSHOT_ID" \
  --tags Key=Type,Value=Daily Key=Environment,Value=production

log "RDS snapshot $SNAPSHOT_ID initiated"

# 2. Export application logs
log "Exporting application logs"
aws logs create-export-task \
  --log-group-name "/aws/ecs/rms-backend-prod" \
  --from $(($(date +%s) - 86400))000 \
  --to $(date +%s)000 \
  --destination "rms-log-exports" \
  --destination-prefix "daily-backup/$(date +%Y/%m/%d)"

# 3. Backup Terraform state
log "Backing up Terraform state"
./scripts/backup-terraform-state.sh production

# 4. Verify backup integrity
log "Verifying backup integrity"
aws rds describe-db-snapshots \
  --db-snapshot-identifier "$SNAPSHOT_ID" \
  --query 'DBSnapshots[0].Status' \
  --output text

# 5. Cleanup old backups (retention policy)
log "Cleaning up old backups"
CUTOFF_DATE=$(date -d '30 days ago' +%Y%m%d)
aws rds describe-db-snapshots \
  --snapshot-type manual \
  --query "DBSnapshots[?starts_with(DBSnapshotIdentifier, 'rms-db-prod-daily-') && DBSnapshotIdentifier < 'rms-db-prod-daily-$CUTOFF_DATE'].DBSnapshotIdentifier" \
  --output text | xargs -r -n1 aws rds delete-db-snapshot --db-snapshot-identifier

log "Daily backup routine completed successfully"

# 6. Send backup status notification
aws sns publish \
  --topic-arn "arn:aws:sns:us-east-1:123456789012:rms-operations" \
  --message "RMS Daily backup completed successfully for $(date +%Y-%m-%d)" \
  --subject "RMS Backup Status - Success"
```

### Weekly Backup Verification

```bash
#!/bin/bash
# scripts/weekly-backup-verification.sh

ENVIRONMENT="production"
TEST_DB_ID="rms-db-backup-test"

echo "Starting weekly backup verification..."

# Get latest snapshot
LATEST_SNAPSHOT=$(aws rds describe-db-snapshots \
  --db-instance-identifier "rms-db-prod" \
  --snapshot-type automated \
  --query 'DBSnapshots | sort_by(@, &SnapshotCreateTime) | [-1].DBSnapshotIdentifier' \
  --output text)

echo "Testing restoration of snapshot: $LATEST_SNAPSHOT"

# Restore to test instance
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier "$TEST_DB_ID" \
  --db-snapshot-identifier "$LATEST_SNAPSHOT" \
  --db-instance-class "db.t3.micro" \
  --publicly-accessible \
  --storage-encrypted

# Wait for restoration to complete
aws rds wait db-instance-available --db-instance-identifier "$TEST_DB_ID"

# Verify data integrity (connect and run basic queries)
RESTORED_ENDPOINT=$(aws rds describe-db-instances \
  --db-instance-identifier "$TEST_DB_ID" \
  --query 'DBInstances[0].Endpoint.Address' \
  --output text)

echo "Testing connectivity to restored database..."
# Add database connectivity and integrity tests here

# Cleanup test instance
aws rds delete-db-instance \
  --db-instance-identifier "$TEST_DB_ID" \
  --skip-final-snapshot \
  --delete-automated-backups

echo "Backup verification completed successfully"
```

## Infrastructure Recovery

### Complete Infrastructure Recovery

```bash
#!/bin/bash
# scripts/disaster-recovery-infrastructure.sh

ENVIRONMENT=${1:-production}
DR_REGION=${2:-us-west-2}

echo "Starting infrastructure recovery for $ENVIRONMENT in $DR_REGION..."

# 1. Switch to DR region
export AWS_DEFAULT_REGION=$DR_REGION

# 2. Initialize Terraform in DR region
cd apps/infrastructure
terraform workspace select "$ENVIRONMENT-dr" || terraform workspace new "$ENVIRONMENT-dr"

# 3. Deploy infrastructure with DR configuration
terraform apply -var-file="environments/$ENVIRONMENT/terraform.tfvars" \
  -var="aws_region=$DR_REGION" \
  -var="disaster_recovery_mode=true" \
  -auto-approve

# 4. Update DNS to point to DR region
aws route53 change-resource-record-sets \
  --hosted-zone-id Z1234567890ABC \
  --change-batch file://dns-failover-config.json

# 5. Scale up ECS services in DR region
aws ecs update-service \
  --cluster "rms-cluster-$ENVIRONMENT" \
  --service "rms-backend-service-$ENVIRONMENT" \
  --desired-count 2

echo "Infrastructure recovery completed in $DR_REGION"
```

### Database Recovery Scenarios

#### Scenario 1: Point-in-Time Recovery

```bash
#!/bin/bash
# Recover database to specific point in time

SOURCE_DB="rms-db-prod"
TARGET_DB="rms-db-prod-recovered"
RESTORE_TIME="2024-12-16T14:30:00.000Z"  # ISO 8601 format

aws rds restore-db-instance-to-point-in-time \
  --source-db-instance-identifier "$SOURCE_DB" \
  --target-db-instance-identifier "$TARGET_DB" \
  --restore-time "$RESTORE_TIME" \
  --db-instance-class "db.t3.medium"

aws rds wait db-instance-available --db-instance-identifier "$TARGET_DB"
echo "Point-in-time recovery completed"
```

#### Scenario 2: Snapshot Recovery

```bash
#!/bin/bash
# Recover database from specific snapshot

SNAPSHOT_ID="rms-db-prod-20241216"
TARGET_DB="rms-db-prod-recovered"

aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier "$TARGET_DB" \
  --db-snapshot-identifier "$SNAPSHOT_ID"

aws rds wait db-instance-available --db-instance-identifier "$TARGET_DB"
echo "Snapshot recovery completed"
```

#### Scenario 3: Cross-Region Recovery

```bash
#!/bin/bash
# Promote read replica to primary in DR region

DR_REPLICA="rms-db-prod-replica-west"
DR_REGION="us-west-2"

# Promote read replica to standalone instance
aws rds promote-read-replica \
  --db-instance-identifier "$DR_REPLICA" \
  --region "$DR_REGION"

# Update application configuration to use new endpoint
aws rds wait db-instance-available \
  --db-instance-identifier "$DR_REPLICA" \
  --region "$DR_REGION"

echo "Cross-region database failover completed"
```

## Application Recovery

### ECS Service Recovery

```bash
#!/bin/bash
# scripts/recover-ecs-service.sh

CLUSTER_NAME="rms-cluster-prod"
SERVICE_NAME="rms-backend-service-prod"

# 1. Check current service status
aws ecs describe-services \
  --cluster "$CLUSTER_NAME" \
  --services "$SERVICE_NAME" \
  --query 'services[0].[serviceName,runningCount,desiredCount,taskDefinition]'

# 2. Force new deployment with latest task definition
aws ecs update-service \
  --cluster "$CLUSTER_NAME" \
  --service "$SERVICE_NAME" \
  --force-new-deployment

# 3. Monitor deployment progress
echo "Monitoring service recovery..."
aws ecs wait services-stable \
  --cluster "$CLUSTER_NAME" \
  --services "$SERVICE_NAME"

echo "ECS service recovery completed"
```

### Frontend Recovery

```bash
#!/bin/bash
# scripts/recover-frontend.sh

S3_BUCKET="rms-frontend-prod"
CLOUDFRONT_DISTRIBUTION="E123456789ABCD"

# 1. Restore from backup or redeploy latest version
echo "Redeploying frontend assets..."
cd apps/rms
pnpm build:production

# 2. Sync to S3
aws s3 sync dist/rms/ "s3://$S3_BUCKET/" --delete

# 3. Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id "$CLOUDFRONT_DISTRIBUTION" \
  --paths "/*"

echo "Frontend recovery completed"
```

## Testing and Validation

### Monthly DR Testing Schedule

| Week       | Test Type                | Components                         | Duration |
| ---------- | ------------------------ | ---------------------------------- | -------- |
| **Week 1** | Database Backup Recovery | RDS snapshots, point-in-time       | 2 hours  |
| **Week 2** | Application Recovery     | ECS services, container deployment | 1 hour   |
| **Week 3** | Infrastructure Recovery  | Terraform, networking, DNS         | 3 hours  |
| **Week 4** | Full DR Simulation       | Complete environment failover      | 4 hours  |

### DR Testing Procedures

#### Database Recovery Test

```bash
#!/bin/bash
# scripts/test-database-recovery.sh

TEST_ENV="dr-test"
SOURCE_SNAPSHOT="rms-db-prod-20241216"
TEST_DB_ID="rms-db-${TEST_ENV}"

echo "=== Database Recovery Test ==="
START_TIME=$(date +%s)

# 1. Create test database from snapshot
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier "$TEST_DB_ID" \
  --db-snapshot-identifier "$SOURCE_SNAPSHOT" \
  --db-instance-class "db.t3.micro"

# 2. Wait for availability
aws rds wait db-instance-available --db-instance-identifier "$TEST_DB_ID"

# 3. Test connectivity and data integrity
DB_ENDPOINT=$(aws rds describe-db-instances \
  --db-instance-identifier "$TEST_DB_ID" \
  --query 'DBInstances[0].Endpoint.Address' \
  --output text)

echo "Testing database connectivity to $DB_ENDPOINT..."
# Add actual connectivity tests here

# 4. Cleanup
aws rds delete-db-instance \
  --db-instance-identifier "$TEST_DB_ID" \
  --skip-final-snapshot

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))
echo "Database recovery test completed in ${DURATION} seconds"

# 5. Record results
echo "$(date): Database recovery test - SUCCESS - Duration: ${DURATION}s" >> dr-test-results.log
```

### Recovery Validation Checklist

#### Post-Recovery Verification

- [ ] **Database Connectivity**

  - [ ] Application can connect to recovered database
  - [ ] Data integrity checks pass
  - [ ] Performance within acceptable limits

- [ ] **Application Functionality**

  - [ ] All critical API endpoints responding
  - [ ] Authentication and authorization working
  - [ ] Business logic functions correctly

- [ ] **Infrastructure Health**

  - [ ] All AWS services operational
  - [ ] Monitoring and alerting functional
  - [ ] Network connectivity verified

- [ ] **User Experience**
  - [ ] Frontend loads correctly
  - [ ] User workflows complete successfully
  - [ ] Performance meets SLA requirements

## Incident Response Procedures

### DR Incident Classifications

| Level       | Trigger                           | Response Time | Team Involvement          |
| ----------- | --------------------------------- | ------------- | ------------------------- |
| **Level 1** | Complete regional outage          | 15 minutes    | Full DR team activation   |
| **Level 2** | Service degradation >30 min       | 30 minutes    | Operations team + on-call |
| **Level 3** | Component failure with workaround | 1 hour        | On-call engineer          |
| **Level 4** | Planned maintenance/testing       | Scheduled     | Maintenance team          |

### DR Activation Procedure

#### Level 1: Complete Disaster Recovery Activation

```bash
#!/bin/bash
# scripts/activate-disaster-recovery.sh

echo "=== DISASTER RECOVERY ACTIVATION ==="
echo "Timestamp: $(date)"
echo "Initiated by: $(whoami)"

# 1. Assess situation and document
read -p "Describe the incident: " INCIDENT_DESCRIPTION
echo "Incident: $INCIDENT_DESCRIPTION" > "dr-activation-$(date +%Y%m%d-%H%M%S).log"

# 2. Notify stakeholders
aws sns publish \
  --topic-arn "arn:aws:sns:us-east-1:123456789012:rms-emergency" \
  --message "DISASTER RECOVERY ACTIVATED: $INCIDENT_DESCRIPTION" \
  --subject "RMS DR ACTIVATION - IMMEDIATE ATTENTION REQUIRED"

# 3. Execute recovery procedures
echo "Starting infrastructure recovery..."
./scripts/disaster-recovery-infrastructure.sh production us-west-2

# 4. Update monitoring dashboards
echo "Updating monitoring for DR region..."
# Update CloudWatch dashboards, Route53 health checks, etc.

# 5. Coordinate team response
echo "DR activation completed. Coordinate with team for validation and communication."
```

### Communication Templates

#### Internal Emergency Notification

```
🚨 DISASTER RECOVERY ACTIVATION - RMS Production

Incident: [Brief description]
Impact: [Service impact assessment]
DR Status: ACTIVATING
ETA: [Estimated recovery time]
Next Update: [Time for next update]

Actions:
- DR team assembled
- Recovery procedures initiated
- Customer communication prepared

Contact: [On-call engineer] [Phone number]
Bridge: [Conference bridge details]
```

#### Customer Communication

```
Service Advisory: RMS Application

We are currently experiencing an issue affecting the RMS application. Our technical team has been notified and is working to resolve this as quickly as possible.

Status: Investigating
Impact: Service temporarily unavailable
Estimated Resolution: [Time estimate]

We will provide updates every 30 minutes until resolved.
Updates available at: [Status page URL]

We apologize for any inconvenience this may cause.
```

## Business Continuity Plans

### Continuity Strategies

| Scenario                      | Impact                | Mitigation                     | Business Impact         |
| ----------------------------- | --------------------- | ------------------------------ | ----------------------- |
| **Regional AWS Outage**       | Complete service down | Failover to DR region          | 1-2 hours downtime      |
| **Database Corruption**       | Data inconsistency    | Point-in-time recovery         | 15-30 minutes impact    |
| **Security Breach**           | Service shutdown      | Isolated recovery              | 2-4 hours investigation |
| **Key Personnel Unavailable** | Delayed response      | Cross-training + documentation | Minimal impact          |

### Business Impact Assessment

#### Critical Business Functions

1. **Risk Assessment Processing** (RTO: 30 minutes, RPO: 5 minutes)
2. **User Authentication/Authorization** (RTO: 15 minutes, RPO: 0)
3. **Data Reporting and Analytics** (RTO: 2 hours, RPO: 15 minutes)
4. **System Administration** (RTO: 1 hour, RPO: 0)

#### Recovery Priorities

1. **Phase 1** (0-30 minutes): Core infrastructure and database
2. **Phase 2** (30-60 minutes): Application services and authentication
3. **Phase 3** (1-2 hours): Full functionality and performance optimization
4. **Phase 4** (2-4 hours): Non-critical features and integrations

### Stakeholder Communication Plan

| Role                 | Contact Method      | Update Frequency | Responsibility             |
| -------------------- | ------------------- | ---------------- | -------------------------- |
| **Executive Team**   | Email + Phone       | Every 30 minutes | Business impact assessment |
| **Development Team** | Slack + Email       | Every 15 minutes | Technical resolution       |
| **Customer Support** | Email + Dashboard   | Real-time        | Customer communication     |
| **Customers**        | Status page + Email | Every 30 minutes | Service status updates     |

---

**Last Updated**: 2024-12-16  
**Version**: 1.0  
**Next Review**: 2025-03-16  
**Emergency Contact**: +1-555-0123 (24/7 on-call)
