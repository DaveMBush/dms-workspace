# RMS Operations Runbook

This runbook contains standard operating procedures for the RMS (Risk Management System) application on AWS.

## Quick Reference

### Emergency Contacts

| Role                   | Primary Contact         | Backup Contact              |
| ---------------------- | ----------------------- | --------------------------- |
| DevOps Lead            | devops-lead@example.com | devops-backup@example.com   |
| On-Call Engineer       | on-call@example.com     | +1-555-0123                 |
| Database Administrator | dba@example.com         | dba-backup@example.com      |
| Security Team          | security@example.com    | security-oncall@example.com |

### Service URLs

| Environment | Frontend                        | API                                 | Monitoring                                             |
| ----------- | ------------------------------- | ----------------------------------- | ------------------------------------------------------ |
| Production  | https://rms.example.com         | https://api.rms.example.com         | [Dashboard](https://console.aws.amazon.com/cloudwatch) |
| Staging     | https://rms-staging.example.com | https://api-staging.rms.example.com | [Dashboard](https://console.aws.amazon.com/cloudwatch) |
| Development | https://rms-dev.example.com     | https://api-dev.rms.example.com     | [Dashboard](https://console.aws.amazon.com/cloudwatch) |

## Daily Operations

### Morning Health Check (5 minutes)

Perform these checks every morning before business hours:

```bash
#!/bin/bash
# scripts/daily-health-check.sh

echo "=== RMS Daily Health Check ==="
echo "Date: $(date)"
echo "Environment: ${ENVIRONMENT:-production}"
echo

# Check frontend health
echo "Frontend Health Check:"
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://rms.example.com/health)
echo "Frontend Status: $FRONTEND_STATUS"
[ "$FRONTEND_STATUS" = "200" ] && echo "✅ Frontend OK" || echo "❌ Frontend FAIL"

# Check API health
echo -e "\nAPI Health Check:"
API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://api.rms.example.com/health)
echo "API Status: $API_STATUS"
[ "$API_STATUS" = "200" ] && echo "✅ API OK" || echo "❌ API FAIL"

# Check database status
echo -e "\nDatabase Status:"
DB_STATUS=$(aws rds describe-db-instances \
  --db-instance-identifier rms-db-prod \
  --query 'DBInstances[0].DBInstanceStatus' \
  --output text 2>/dev/null)
echo "Database Status: $DB_STATUS"
[ "$DB_STATUS" = "available" ] && echo "✅ Database OK" || echo "❌ Database FAIL"

# Check ECS service health
echo -e "\nECS Service Health:"
HEALTHY_TASKS=$(aws ecs describe-services \
  --cluster rms-cluster-prod \
  --services rms-backend-service-prod \
  --query 'services[0].runningCount' \
  --output text 2>/dev/null)
DESIRED_TASKS=$(aws ecs describe-services \
  --cluster rms-cluster-prod \
  --services rms-backend-service-prod \
  --query 'services[0].desiredCount' \
  --output text 2>/dev/null)
echo "Running Tasks: $HEALTHY_TASKS/$DESIRED_TASKS"
[ "$HEALTHY_TASKS" = "$DESIRED_TASKS" ] && echo "✅ ECS Service OK" || echo "❌ ECS Service DEGRADED"

# Check recent errors in logs
echo -e "\nRecent Error Check:"
ERROR_COUNT=$(aws logs filter-log-events \
  --log-group-name /aws/ecs/rms-backend-prod \
  --start-time $(($(date +%s) - 3600))000 \
  --filter-pattern "ERROR" \
  --query 'length(events)' \
  --output text 2>/dev/null)
echo "Errors in last hour: $ERROR_COUNT"
[ "$ERROR_COUNT" -lt 10 ] && echo "✅ Error Rate Normal" || echo "❌ High Error Rate"

echo -e "\n=== Health Check Complete ==="
```

**Action Items based on results:**

- ❌ **Frontend FAIL**: Check CloudFront distribution and S3 bucket status
- ❌ **API FAIL**: Check ECS service health and ALB status
- ❌ **Database FAIL**: Check RDS instance status and connectivity
- ❌ **ECS Service DEGRADED**: Check task health and auto-scaling events
- ❌ **High Error Rate**: Review recent deployments and application logs

### Daily Checklist

- [ ] Run morning health check script
- [ ] Review CloudWatch dashboard for overnight alerts
- [ ] Check backup completion status
- [ ] Review cost dashboard for anomalies
- [ ] Verify SSL certificate expiration dates (monthly)
- [ ] Check for AWS service health issues in region

## Weekly Operations

### Infrastructure Review (30 minutes)

Perform every Monday morning:

#### 1. Performance Review

```bash
# Check CloudWatch metrics for past week
aws cloudwatch get-metric-statistics \
  --namespace AWS/ECS \
  --metric-name CPUUtilization \
  --dimensions Name=ServiceName,Value=rms-backend-service-prod Name=ClusterName,Value=rms-cluster-prod \
  --start-time $(date -d '7 days ago' -u +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 3600 \
  --statistics Average,Maximum

# Check database performance
aws cloudwatch get-metric-statistics \
  --namespace AWS/RDS \
  --metric-name DatabaseConnections \
  --dimensions Name=DBInstanceIdentifier,Value=rms-db-prod \
  --start-time $(date -d '7 days ago' -u +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 3600 \
  --statistics Average,Maximum
```

#### 2. Security Review

```bash
# Check for security updates
aws inspector list-findings --max-results 50

# Review CloudTrail for unusual activity
aws logs filter-log-events \
  --log-group-name CloudTrail/RMS \
  --start-time $(($(date +%s) - 604800))000 \
  --filter-pattern "{ $.errorCode = * }"
```

#### 3. Cost Review

```bash
# Get cost and usage for past week
aws ce get-cost-and-usage \
  --time-period Start=$(date -d '7 days ago' +%Y-%m-%d),End=$(date +%Y-%m-%d) \
  --granularity DAILY \
  --metrics BlendedCost \
  --group-by Type=DIMENSION,Key=SERVICE
```

### Weekly Checklist

- [ ] Review and analyze CloudWatch metrics from past week
- [ ] Check for available security patches and updates
- [ ] Review cost optimization opportunities
- [ ] Validate backup and recovery procedures
- [ ] Update documentation for any changes made
- [ ] Review auto-scaling policies and thresholds
- [ ] Check SSL certificate expiration dates
- [ ] Review and rotate access keys if needed

## Monthly Operations

### Comprehensive Review (2 hours)

Perform on first Monday of each month:

#### 1. Cost Optimization Review

```bash
# Detailed cost analysis
aws ce get-cost-and-usage \
  --time-period Start=$(date -d '30 days ago' +%Y-%m-%d),End=$(date +%Y-%m-%d) \
  --granularity MONTHLY \
  --metrics BlendedCost,UsageQuantity \
  --group-by Type=DIMENSION,Key=SERVICE Type=DIMENSION,Key=USAGE_TYPE

# Check for unused resources
aws ec2 describe-volumes --filters Name=status,Values=available
aws rds describe-db-snapshots --snapshot-type manual --max-records 100
```

#### 2. Security Audit

```bash
# Check IAM policies and roles
aws iam list-policies --scope Local --max-items 50
aws iam list-roles --max-items 50

# Review security groups
aws ec2 describe-security-groups --group-ids $(aws ec2 describe-security-groups --query 'SecurityGroups[?GroupName!=`default`].GroupId' --output text)

# Check for exposed resources
aws ec2 describe-instances --query 'Reservations[].Instances[?State.Name==`running`].[InstanceId,PublicIpAddress,SecurityGroups]'
```

#### 3. Backup and Recovery Testing

```bash
# Test database backup restoration (in staging environment)
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier rms-db-restore-test \
  --db-snapshot-identifier rms-db-prod-$(date +%Y%m%d) \
  --db-instance-class db.t3.micro

# Validate backup integrity
aws rds describe-db-snapshots \
  --db-instance-identifier rms-db-prod \
  --snapshot-type automated \
  --max-records 7
```

### Monthly Checklist

- [ ] Conduct comprehensive cost optimization review
- [ ] Perform security audit and vulnerability assessment
- [ ] Test backup and recovery procedures
- [ ] Review and update documentation
- [ ] Analyze performance trends and capacity planning
- [ ] Review and update monitoring thresholds
- [ ] Check for AWS service updates and new features
- [ ] Rotate database credentials and API keys
- [ ] Review and test disaster recovery procedures

## Application Scaling Procedures

### Manual Scaling

#### Scale ECS Service

```bash
# Scale up ECS service
aws ecs update-service \
  --cluster rms-cluster-prod \
  --service rms-backend-service-prod \
  --desired-count 5

# Monitor scaling progress
aws ecs describe-services \
  --cluster rms-cluster-prod \
  --services rms-backend-service-prod \
  --query 'services[0].[desiredCount,runningCount,pendingCount]'
```

#### Scale RDS Instance

```bash
# Scale RDS instance (requires downtime)
aws rds modify-db-instance \
  --db-instance-identifier rms-db-prod \
  --db-instance-class db.t3.large \
  --apply-immediately

# Monitor modification progress
aws rds describe-db-instances \
  --db-instance-identifier rms-db-prod \
  --query 'DBInstances[0].[DBInstanceStatus,DBInstanceClass]'
```

### Auto-Scaling Configuration

#### Update ECS Auto-Scaling

```bash
# Update target capacity
aws application-autoscaling put-scaling-policy \
  --policy-name rms-backend-scaling-policy \
  --service-namespace ecs \
  --resource-id service/rms-cluster-prod/rms-backend-service-prod \
  --scalable-dimension ecs:service:DesiredCount \
  --policy-type TargetTrackingScaling \
  --target-tracking-scaling-policy-configuration '{
    "TargetValue": 70.0,
    "PredefinedMetricSpecification": {
      "PredefinedMetricType": "ECSServiceAverageCPUUtilization"
    },
    "ScaleOutCooldown": 300,
    "ScaleInCooldown": 300
  }'
```

## Log Analysis Procedures

### Application Logs

```bash
# View recent application logs
aws logs tail /aws/ecs/rms-backend-prod --follow --since 1h

# Search for specific errors
aws logs filter-log-events \
  --log-group-name /aws/ecs/rms-backend-prod \
  --filter-pattern "ERROR" \
  --start-time $(($(date +%s) - 3600))000

# Export logs for analysis
aws logs create-export-task \
  --log-group-name /aws/ecs/rms-backend-prod \
  --from $(($(date +%s) - 86400))000 \
  --to $(date +%s)000 \
  --destination s3://rms-log-exports \
  --destination-prefix "backend-logs/$(date +%Y/%m/%d)"
```

### Infrastructure Logs

```bash
# Check ALB access logs
aws s3 ls s3://rms-alb-logs/AWSLogs/$(aws sts get-caller-identity --query Account --output text)/elasticloadbalancing/us-east-1/$(date +%Y)/$(date +%m)/$(date +%d)/

# VPC Flow Logs analysis
aws logs filter-log-events \
  --log-group-name VPCFlowLogs \
  --filter-pattern "{ $.action = \"REJECT\" }" \
  --start-time $(($(date +%s) - 3600))000
```

## Certificate Management

### SSL Certificate Renewal

AWS Certificate Manager automatically renews certificates, but verify:

```bash
# Check certificate status
aws acm list-certificates \
  --certificate-statuses ISSUED \
  --query 'CertificateSummaryList[?DomainName==`rms.example.com`]'

# Check expiration dates
aws acm describe-certificate \
  --certificate-arn arn:aws:acm:us-east-1:123456789012:certificate/example \
  --query 'Certificate.[DomainName,Status,NotAfter]'
```

### Manual Certificate Update

If manual intervention is required:

```bash
# Update CloudFront distribution with new certificate
aws cloudfront update-distribution \
  --id E123456789ABCD \
  --distribution-config file://distribution-config.json

# Update ALB listener with new certificate
aws elbv2 modify-listener \
  --listener-arn arn:aws:elasticloadbalancing:us-east-1:123456789012:listener/app/rms-alb-prod/50dc6c495c0c9188/f2f7dc8efc522ab2 \
  --certificates CertificateArn=arn:aws:acm:us-east-1:123456789012:certificate/new-cert-id
```

## Database Maintenance

### Routine Maintenance

```bash
# Check database performance insights
aws pi get-resource-metrics \
  --service-type RDS \
  --identifier rms-db-prod \
  --metric-queries file://db-metrics.json \
  --start-time $(date -d '1 hour ago' -u +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S)

# Review slow query logs
aws rds download-db-log-file-portion \
  --db-instance-identifier rms-db-prod \
  --log-file-name slowquery/mysql-slowquery.log
```

### Database Backup Verification

```bash
# List recent automated backups
aws rds describe-db-snapshots \
  --db-instance-identifier rms-db-prod \
  --snapshot-type automated \
  --max-records 7

# Create manual snapshot before maintenance
aws rds create-db-snapshot \
  --db-instance-identifier rms-db-prod \
  --db-snapshot-identifier rms-db-prod-maintenance-$(date +%Y%m%d-%H%M)
```

## Incident Response Procedures

### Severity Levels

| Severity     | Description                  | Response Time     | Examples                                |
| ------------ | ---------------------------- | ----------------- | --------------------------------------- |
| **Critical** | Complete service outage      | 15 minutes        | Application down, database unavailable  |
| **High**     | Major functionality impaired | 1 hour            | Partial outage, performance degradation |
| **Medium**   | Minor functionality issues   | 4 hours           | Non-critical features affected          |
| **Low**      | Cosmetic or minor issues     | Next business day | UI inconsistencies, minor bugs          |

### Critical Incident Response

1. **Immediate Response (0-15 minutes)**

   ```bash
   # Check all critical services
   ./scripts/health-check.sh

   # Check recent deployments
   aws ecs list-tasks --cluster rms-cluster-prod --service-name rms-backend-service-prod

   # Check CloudWatch alarms
   aws cloudwatch describe-alarms --state-value ALARM
   ```

2. **Escalation (15-30 minutes)**

   - Notify on-call engineer
   - Create incident ticket
   - Start incident bridge/call

3. **Resolution Steps**
   - Identify root cause using [Troubleshooting Guide](troubleshooting.md)
   - Implement fix or rollback
   - Verify resolution
   - Post-incident review

### Communication Templates

**Critical Incident Notification:**

```
🚨 CRITICAL INCIDENT - RMS Production Outage
Status: INVESTIGATING
Impact: Complete service unavailable
Start Time: 2024-12-16 14:30 UTC
Next Update: 15 minutes

We are investigating reports of service unavailability.
Updates: #incidents channel
```

**Resolution Notification:**

```
✅ RESOLVED - RMS Production Outage
Status: RESOLVED
Resolution Time: 2024-12-16 15:15 UTC
Duration: 45 minutes

Issue has been resolved. All services are operational.
Root Cause: Database connection pool exhaustion
Next Steps: Post-incident review scheduled for tomorrow 10 AM
```

## Monitoring and Alerting

### Key Metrics to Monitor

| Metric               | Threshold          | Action                         |
| -------------------- | ------------------ | ------------------------------ |
| CPU Utilization      | >80% for 5 minutes | Scale up ECS tasks             |
| Memory Utilization   | >85% for 5 minutes | Scale up ECS tasks             |
| Database Connections | >80% of max        | Investigate connection leaks   |
| API Response Time    | >2 seconds average | Check application performance  |
| Error Rate           | >5% over 5 minutes | Investigate application errors |
| Disk Space           | <20% free          | Scale up storage               |

### Alert Escalation

1. **Level 1**: Slack notification to #alerts channel
2. **Level 2**: Email to on-call engineer (5 minutes)
3. **Level 3**: SMS to on-call engineer (10 minutes)
4. **Level 4**: Phone call to backup engineer (15 minutes)

## Contact Information

### Internal Contacts

| Role           | Name       | Email                  | Phone       | Slack      |
| -------------- | ---------- | ---------------------- | ----------- | ---------- |
| DevOps Lead    | John Smith | john.smith@example.com | +1-555-0101 | @johnsmith |
| Database Admin | Jane Doe   | jane.doe@example.com   | +1-555-0102 | @janedoe   |
| Security Lead  | Bob Wilson | bob.wilson@example.com | +1-555-0103 | @bobwilson |

### External Contacts

| Service      | Contact            | Phone              | Support URL                             |
| ------------ | ------------------ | ------------------ | --------------------------------------- |
| AWS Support  | Enterprise Support | +1-800-AWS-SUPPORT | https://console.aws.amazon.com/support/ |
| DNS Provider | Registrar Support  | +1-555-0200        | support.registrar.com                   |

---

**Last Updated**: 2024-12-16  
**Version**: 1.0  
**Next Review**: 2025-01-16
