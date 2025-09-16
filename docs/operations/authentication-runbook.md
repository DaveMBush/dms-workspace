# RMS Authentication System Operational Runbook

## Table of Contents

1. [System Overview](#system-overview)
2. [Daily Operations](#daily-operations)
3. [Monitoring and Alerting](#monitoring-and-alerting)
4. [Maintenance Procedures](#maintenance-procedures)
5. [Incident Response](#incident-response)
6. [Backup and Recovery](#backup-and-recovery)
7. [Security Operations](#security-operations)
8. [Performance Management](#performance-management)
9. [User Management](#user-management)
10. [Change Management](#change-management)

## System Overview

### Service Components

- **AWS Cognito User Pool**: Primary authentication service
- **RMS API Authentication Middleware**: Token validation and API protection
- **Frontend Authentication Service**: Angular-based client authentication
- **Redis Cache**: Session and rate limiting data
- **CloudWatch**: Monitoring and logging
- **Load Balancer**: Traffic distribution and SSL termination

### Key Metrics

- **Availability Target**: 99.9% uptime
- **Performance Target**: < 2 seconds login response time
- **Security Target**: Zero successful unauthorized access attempts

### Dependencies

- AWS Cognito (Primary)
- Redis Cache (Session data)
- PostgreSQL Database (User metadata)
- CloudWatch (Monitoring)
- Route 53 (DNS)

## Daily Operations

### Morning Health Check (9:00 AM)

```bash
#!/bin/bash
# Daily health check script

echo "=== RMS Authentication Daily Health Check ==="
echo "Date: $(date)"
echo

# 1. Check service status
echo "1. Service Status Check:"
systemctl status rms-api | grep "Active:"
systemctl status redis | grep "Active:"
systemctl status nginx | grep "Active:"
echo

# 2. Test authentication endpoints
echo "2. Authentication Endpoint Tests:"
curl -f -s -o /dev/null -w "Login endpoint: %{http_code} (%{time_total}s)\n" \
  https://api.rms.company.com/health

curl -f -s -o /dev/null -w "API health: %{http_code} (%{time_total}s)\n" \
  https://api.rms.company.com/api/health
echo

# 3. Check Cognito user pool health
echo "3. AWS Cognito Status:"
aws cognito-idp describe-user-pool \
  --user-pool-id us-east-1_XXXXXXXXX \
  --query 'UserPool.Status' --output text
echo

# 4. Review error rates from last 24 hours
echo "4. Error Rate Summary (Last 24h):"
aws logs filter-log-events \
  --log-group-name "/aws/cognito/userpool" \
  --filter-pattern "ERROR" \
  --start-time $(date -d "24 hours ago" +%s)000 \
  --query 'length(events)' --output text | \
  awk '{print "Cognito errors: " $1}'

# 5. Check disk space
echo "5. Disk Space Check:"
df -h | grep -E "(/$|/var|/tmp)" | awk '{print $5 " used on " $6}'
echo

# 6. Memory usage
echo "6. Memory Usage:"
free -h | grep Mem | awk '{print "Memory: " $3 "/" $2 " (" int($3/$2*100) "%)"}'
echo

echo "Health check completed at $(date)"
echo "=============================================="
```

### Evening Log Review (6:00 PM)

```bash
#!/bin/bash
# Evening log review script

echo "=== RMS Authentication Evening Log Review ==="
echo "Date: $(date)"
echo

# 1. Authentication success/failure summary
echo "1. Authentication Summary (Today):"
START_TIME=$(date -d "today 00:00:00" +%s)000
END_TIME=$(date +%s)000

# Count successful logins
SUCCESS_COUNT=$(aws logs filter-log-events \
  --log-group-name "/aws/cognito/userpool" \
  --filter-pattern "SignIn_Success" \
  --start-time $START_TIME \
  --end-time $END_TIME \
  --query 'length(events)' --output text)

# Count failed logins
FAILURE_COUNT=$(aws logs filter-log-events \
  --log-group-name "/aws/cognito/userpool" \
  --filter-pattern "SignIn_Failure" \
  --start-time $START_TIME \
  --end-time $END_TIME \
  --query 'length(events)' --output text)

echo "Successful logins: $SUCCESS_COUNT"
echo "Failed logins: $FAILURE_COUNT"

if [ $FAILURE_COUNT -gt 0 ] && [ $SUCCESS_COUNT -gt 0 ]; then
  FAILURE_RATE=$(echo "scale=2; $FAILURE_COUNT / ($SUCCESS_COUNT + $FAILURE_COUNT) * 100" | bc)
  echo "Failure rate: $FAILURE_RATE%"
fi
echo

# 2. Top failed login attempts by IP
echo "2. Top Failed Login IPs (Today):"
aws logs filter-log-events \
  --log-group-name "/aws/cognito/userpool" \
  --filter-pattern "SignIn_Failure" \
  --start-time $START_TIME \
  --end-time $END_TIME \
  --query 'events[*].message' --output text | \
  grep -o '"sourceIPAddress":"[^"]*"' | \
  cut -d'"' -f4 | sort | uniq -c | sort -rn | head -5
echo

# 3. Performance metrics
echo "3. Performance Metrics (Last Hour):"
aws cloudwatch get-metric-statistics \
  --namespace "AWS/Cognito" \
  --metric-name "SignInSuccesses" \
  --dimensions Name=UserPool,Value=us-east-1_XXXXXXXXX \
  --start-time $(date -d "1 hour ago" -u +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 3600 \
  --statistics Sum \
  --query 'Datapoints[0].Sum' --output text | \
  awk '{print "Logins per hour: " ($1 ? $1 : 0)}'
echo

echo "Log review completed at $(date)"
echo "=============================================="
```

## Monitoring and Alerting

### CloudWatch Dashboards

#### Authentication Dashboard Configuration

```json
{
  "widgets": [
    {
      "type": "metric",
      "properties": {
        "metrics": [
          ["AWS/Cognito", "SignInSuccesses", "UserPool", "us-east-1_XXXXXXXXX"],
          [".", "SignInThrottles", ".", "."],
          [".", "AccountTakeoverRisk", ".", "."]
        ],
        "period": 300,
        "stat": "Sum",
        "region": "us-east-1",
        "title": "Authentication Events"
      }
    },
    {
      "type": "metric",
      "properties": {
        "metrics": [
          ["RMS/API", "AuthenticationLatency"],
          [".", "TokenRefreshLatency"],
          [".", "TokenValidationLatency"]
        ],
        "period": 300,
        "stat": "Average",
        "region": "us-east-1",
        "title": "Authentication Performance"
      }
    }
  ]
}
```

### Critical Alerts

#### High Failure Rate Alert

```bash
# Create CloudWatch alarm for authentication failure rate
aws cloudwatch put-metric-alarm \
  --alarm-name "RMS-Auth-High-Failure-Rate" \
  --alarm-description "Authentication failure rate exceeds 10%" \
  --metric-name "SignInFailures" \
  --namespace "AWS/Cognito" \
  --statistic "Sum" \
  --period 300 \
  --threshold 10 \
  --comparison-operator "GreaterThanThreshold" \
  --evaluation-periods 2 \
  --alarm-actions "arn:aws:sns:us-east-1:123456789:auth-alerts"
```

#### Service Availability Alert

```bash
# API health check alarm
aws cloudwatch put-metric-alarm \
  --alarm-name "RMS-API-Health-Check-Failed" \
  --alarm-description "API health check failing" \
  --metric-name "HealthCheckFailed" \
  --namespace "RMS/API" \
  --statistic "Sum" \
  --period 60 \
  --threshold 3 \
  --comparison-operator "GreaterThanOrEqualToThreshold" \
  --evaluation-periods 3 \
  --alarm-actions "arn:aws:sns:us-east-1:123456789:critical-alerts"
```

### Log Monitoring Queries

#### Suspicious Activity Detection

```bash
# Create custom log insights queries
aws logs put-query-definition \
  --name "RMS-Suspicious-Login-Activity" \
  --log-group-names "/aws/cognito/userpool" \
  --query-string '
    fields @timestamp, sourceIPAddress, username, eventName
    | filter eventName = "SignIn_Failure"
    | stats count() by sourceIPAddress
    | sort count desc
    | limit 20
  '
```

## Maintenance Procedures

### Weekly Maintenance (Sunday 2:00 AM)

```bash
#!/bin/bash
# Weekly maintenance script

echo "=== RMS Authentication Weekly Maintenance ==="
echo "Started: $(date)"

# 1. Log rotation and cleanup
echo "1. Log cleanup..."
find /var/log/rms -name "*.log" -mtime +30 -delete
find /var/log/rms -name "*.log.gz" -mtime +90 -delete

# 2. Update security certificates (if needed)
echo "2. Certificate check..."
openssl x509 -in /etc/ssl/certs/rms.crt -noout -dates | \
  awk '/notAfter/ {
    cmd = "date -d \"" substr($0, index($0, "=") + 1) "\" +%s"
    cmd | getline expiry
    close(cmd)

    cmd = "date +%s"
    cmd | getline now
    close(cmd)

    days = int((expiry - now) / 86400)
    print "Certificate expires in " days " days"

    if (days < 30) {
      print "WARNING: Certificate expiring soon!"
    }
  }'

# 3. Database maintenance
echo "3. Database cleanup..."
psql -h localhost -U rms_user -d rms_db -c "
  DELETE FROM auth_sessions WHERE expires_at < NOW() - INTERVAL '7 days';
  DELETE FROM auth_audit_log WHERE created_at < NOW() - INTERVAL '90 days';
  VACUUM ANALYZE auth_sessions;
  VACUUM ANALYZE auth_audit_log;
"

# 4. Redis cache optimization
echo "4. Redis maintenance..."
redis-cli MEMORY PURGE
redis-cli CONFIG SET save "900 1 300 10 60 10000"

# 5. Update system packages (security only)
echo "5. Security updates..."
apt update && apt upgrade -y --security-only

# 6. Backup verification
echo "6. Backup verification..."
if [ -f /backup/rms-config-$(date +%Y%m%d).tar.gz ]; then
  echo "Configuration backup exists"
else
  echo "WARNING: No recent configuration backup found"
fi

echo "Maintenance completed: $(date)"
echo "=============================================="
```

### Monthly Maintenance (First Sunday 1:00 AM)

```bash
#!/bin/bash
# Monthly maintenance script

echo "=== RMS Authentication Monthly Maintenance ==="
echo "Started: $(date)"

# 1. User account audit
echo "1. User account audit..."
aws cognito-idp list-users \
  --user-pool-id us-east-1_XXXXXXXXX \
  --query 'Users[?UserStatus==`UNCONFIRMED`].[Username,UserCreateDate]' \
  --output table > /tmp/unconfirmed_users.txt

echo "Unconfirmed users found: $(wc -l < /tmp/unconfirmed_users.txt)"

# 2. Security metrics report
echo "2. Generating security metrics..."
START_DATE=$(date -d "1 month ago" +%Y-%m-%d)
END_DATE=$(date +%Y-%m-%d)

# Generate monthly security report
{
  echo "RMS Authentication Security Report"
  echo "Period: $START_DATE to $END_DATE"
  echo "Generated: $(date)"
  echo

  echo "=== Authentication Statistics ==="
  # Add statistics here

  echo "=== Security Events ==="
  # Add security events summary

  echo "=== Recommendations ==="
  # Add automated recommendations
} > "/var/log/rms/security-report-$(date +%Y%m).txt"

# 3. Performance baseline update
echo "3. Updating performance baselines..."
# Calculate new baselines for alerting thresholds

# 4. Configuration backup
echo "4. Configuration backup..."
tar -czf "/backup/rms-config-$(date +%Y%m%d).tar.gz" \
  /etc/rms/ \
  /etc/nginx/sites-available/rms \
  /etc/redis/redis.conf

echo "Monthly maintenance completed: $(date)"
echo "=============================================="
```

## Incident Response

### Authentication Service Outage

#### Severity 1: Complete Authentication Failure

**Immediate Response (0-15 minutes):**

1. **Acknowledge and Assess:**

   ```bash
   # Check service status
   curl -f https://api.rms.company.com/health || echo "API DOWN"

   # Check Cognito status
   aws cognito-idp describe-user-pool-domain \
     --domain rms-prod.auth.us-east-1.amazoncognito.com

   # Check dependencies
   redis-cli ping
   systemctl status nginx
   ```

2. **Activate Emergency Procedures:**

   ```bash
   # Enable maintenance mode
   touch /var/www/rms/maintenance.flag

   # Notify stakeholders
   curl -X POST https://slack.com/api/chat.postMessage \
     -H "Authorization: Bearer $SLACK_TOKEN" \
     -d "channel=#incidents" \
     -d "text=🚨 RMS Authentication Service DOWN - Investigating"
   ```

3. **Initial Mitigation:**

   ```bash
   # Restart services
   systemctl restart rms-api
   systemctl restart redis
   systemctl restart nginx

   # Check if resolved
   sleep 30
   curl -f https://api.rms.company.com/health
   ```

**Detailed Investigation (15-60 minutes):**

1. **Log Analysis:**

   ```bash
   # Check application logs
   tail -100 /var/log/rms/api.log | grep ERROR

   # Check Cognito events
   aws logs filter-log-events \
     --log-group-name "/aws/cognito/userpool" \
     --start-time $(date -d "1 hour ago" +%s)000 \
     --filter-pattern "ERROR"

   # Check system resources
   top -bn1 | head -20
   df -h
   ```

2. **Root Cause Analysis:**

   ```bash
   # Network connectivity
   ping cognito-idp.us-east-1.amazonaws.com

   # SSL certificate status
   openssl s_client -connect api.rms.company.com:443 -servername api.rms.company.com

   # Database connectivity
   psql -h localhost -U rms_user -d rms_db -c "SELECT 1;"
   ```

#### Severity 2: Degraded Performance

**Response Procedure:**

1. **Performance Analysis:**

   ```bash
   # Check response times
   for i in {1..10}; do
     time curl -s https://api.rms.company.com/health > /dev/null
     sleep 1
   done

   # Database performance
   psql -h localhost -U rms_user -d rms_db -c "
     SELECT query, mean_time, calls
     FROM pg_stat_statements
     ORDER BY mean_time DESC
     LIMIT 10;"
   ```

2. **Resource Optimization:**

   ```bash
   # Clear Redis cache if needed
   redis-cli FLUSHDB

   # Restart application pool
   systemctl reload rms-api

   # Check for memory leaks
   ps aux --sort=-%mem | head -10
   ```

### Security Incident Response

#### Suspected Breach

**Immediate Actions (0-30 minutes):**

1. **Containment:**

   ```bash
   # Block suspicious IPs
   iptables -A INPUT -s SUSPICIOUS_IP -j DROP

   # Revoke all active sessions
   redis-cli FLUSHALL

   # Force password reset for affected users
   aws cognito-idp admin-reset-user-password \
     --user-pool-id us-east-1_XXXXXXXXX \
     --username affected_user@example.com
   ```

2. **Evidence Collection:**

   ```bash
   # Preserve logs
   cp /var/log/rms/api.log "/forensics/api-$(date +%Y%m%d_%H%M).log"

   # Export Cognito logs
   aws logs create-export-task \
     --log-group-name "/aws/cognito/userpool" \
     --from $(date -d "24 hours ago" +%s)000 \
     --to $(date +%s)000 \
     --destination "s3-security-forensics-bucket"
   ```

## Backup and Recovery

### Configuration Backup

```bash
#!/bin/bash
# Daily configuration backup

BACKUP_DATE=$(date +%Y%m%d)
BACKUP_DIR="/backup/config"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Backup application configuration
tar -czf "$BACKUP_DIR/rms-config-$BACKUP_DATE.tar.gz" \
  /etc/rms/ \
  /etc/nginx/sites-available/rms \
  /etc/redis/redis.conf \
  /etc/ssl/certs/rms.crt

# Backup Cognito configuration
aws cognito-idp describe-user-pool \
  --user-pool-id us-east-1_XXXXXXXXX \
  > "$BACKUP_DIR/cognito-config-$BACKUP_DATE.json"

# Upload to S3
aws s3 cp "$BACKUP_DIR/" s3://rms-backups/config/ --recursive

# Cleanup old backups (keep 90 days)
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +90 -delete
find "$BACKUP_DIR" -name "*.json" -mtime +90 -delete
```

### Disaster Recovery Procedure

#### Complete System Recovery

1. **Infrastructure Setup:**

   ```bash
   # Deploy new infrastructure using Terraform
   terraform init
   terraform plan -var-file="prod.tfvars"
   terraform apply

   # Install application
   ansible-playbook -i inventory/prod deploy.yml
   ```

2. **Configuration Restoration:**

   ```bash
   # Download latest backup
   aws s3 cp s3://rms-backups/config/latest/ /tmp/restore/ --recursive

   # Restore configuration files
   tar -xzf /tmp/restore/rms-config-latest.tar.gz -C /

   # Restore Cognito configuration
   # (Manual process - update app client settings)
   ```

3. **Validation:**

   ```bash
   # Test authentication flow
   ./scripts/test-auth-flow.sh

   # Verify all endpoints
   ./scripts/health-check.sh

   # Load test
   artillery run loadtest/auth-load-test.yml
   ```

## Security Operations

### Daily Security Checks

```bash
#!/bin/bash
# Daily security check routine

echo "=== RMS Authentication Security Check ==="
echo "Date: $(date)"

# 1. Check for unusual login patterns
echo "1. Unusual Login Pattern Check:"
aws logs insights start-query \
  --log-group-name "/aws/cognito/userpool" \
  --start-time $(date -d "24 hours ago" +%s) \
  --end-time $(date +%s) \
  --query-string '
    fields @timestamp, sourceIPAddress, eventName
    | filter eventName = "SignIn_Success"
    | stats count() by sourceIPAddress
    | sort count desc
    | limit 10
  ' \
  --query 'queryId' --output text

# 2. Failed login attempts analysis
echo "2. Failed Login Analysis:"
FAILED_LOGINS=$(aws logs filter-log-events \
  --log-group-name "/aws/cognito/userpool" \
  --filter-pattern "SignIn_Failure" \
  --start-time $(date -d "24 hours ago" +%s)000 \
  --query 'length(events)' --output text)

echo "Failed logins in last 24h: $FAILED_LOGINS"

if [ "$FAILED_LOGINS" -gt 50 ]; then
  echo "WARNING: High number of failed logins detected"
  # Send alert
fi

# 3. Certificate expiration check
echo "3. Certificate Status:"
openssl x509 -in /etc/ssl/certs/rms.crt -noout -enddate

# 4. User account status review
echo "4. User Account Review:"
INACTIVE_USERS=$(aws cognito-idp list-users \
  --user-pool-id us-east-1_XXXXXXXXX \
  --filter "enabled = false" \
  --query 'length(Users)' --output text)

echo "Disabled user accounts: $INACTIVE_USERS"

echo "Security check completed: $(date)"
echo "=============================================="
```

### Security Audit Procedure

#### Monthly Security Audit

```bash
#!/bin/bash
# Monthly security audit

AUDIT_DATE=$(date +%Y%m)
REPORT_FILE="/var/log/rms/security-audit-$AUDIT_DATE.txt"

{
  echo "RMS Authentication Security Audit Report"
  echo "Period: $(date -d "1 month ago" +%B\ %Y)"
  echo "Generated: $(date)"
  echo "=========================================="
  echo

  # User access review
  echo "1. USER ACCESS REVIEW"
  echo "Total active users:"
  aws cognito-idp list-users \
    --user-pool-id us-east-1_XXXXXXXXX \
    --filter "enabled = true" \
    --query 'length(Users)' --output text

  echo "Inactive users (>90 days):"
  aws cognito-idp list-users \
    --user-pool-id us-east-1_XXXXXXXXX \
    --query 'Users[?UserLastModifiedDate < `$(date -d "90 days ago" --iso-8601)`].Username' \
    --output text | wc -w

  # Authentication statistics
  echo
  echo "2. AUTHENTICATION STATISTICS"
  echo "Successful logins (last 30 days):"
  # Query CloudWatch metrics

  echo "Failed login attempts (last 30 days):"
  # Query CloudWatch metrics

  # Security events
  echo
  echo "3. SECURITY EVENTS"
  echo "Rate limit violations:"
  # Query rate limit logs

  echo "Suspicious IP addresses:"
  # Analyze access patterns

  # Compliance status
  echo
  echo "4. COMPLIANCE STATUS"
  echo "Password policy compliance: ✓"
  echo "MFA enrollment rate: $(calculate_mfa_rate)%"
  echo "SSL/TLS configuration: ✓"

  # Recommendations
  echo
  echo "5. RECOMMENDATIONS"
  echo "- Review inactive user accounts"
  echo "- Update security policies if needed"
  echo "- Consider implementing additional security measures"

} > "$REPORT_FILE"

echo "Security audit report generated: $REPORT_FILE"
```

## Performance Management

### Performance Monitoring

```bash
#!/bin/bash
# Performance monitoring script

echo "=== RMS Authentication Performance Monitor ==="
echo "Timestamp: $(date)"

# 1. API response time measurement
echo "1. API Response Times:"
for endpoint in /health /api/profile /api/universe; do
  response_time=$(curl -o /dev/null -s -w "%{time_total}" \
    https://api.rms.company.com$endpoint 2>/dev/null)
  echo "$endpoint: ${response_time}s"
done

# 2. Database performance
echo "2. Database Performance:"
psql -h localhost -U rms_user -d rms_db -t -c "
  SELECT
    'Avg query time: ' || round(avg(mean_time)::numeric, 2) || 'ms',
    'Total queries: ' || sum(calls),
    'Cache hit ratio: ' || round(
      (sum(blks_hit) * 100.0 / (sum(blks_hit) + sum(blks_read)))::numeric, 2
    ) || '%'
  FROM pg_stat_statements s
  JOIN pg_stat_database d ON d.datname = 'rms_db';"

# 3. Redis performance
echo "3. Redis Performance:"
redis-cli --latency-history -i 1 | head -5 &
REDIS_PID=$!
sleep 5
kill $REDIS_PID 2>/dev/null

# 4. System resources
echo "4. System Resources:"
echo "CPU usage: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)%"
echo "Memory usage: $(free | grep Mem | awk '{printf "%.1f%%", $3/$2 * 100.0}')"
echo "Disk usage: $(df / | tail -1 | awk '{print $5}')"

echo "Performance monitoring completed: $(date)"
echo "=============================================="
```

### Performance Optimization

#### Application Performance Tuning

```bash
#!/bin/bash
# Performance optimization script

echo "=== RMS Authentication Performance Optimization ==="

# 1. Database optimization
echo "1. Database optimization..."
psql -h localhost -U rms_user -d rms_db -c "
  -- Update table statistics
  ANALYZE;

  -- Reindex auth tables
  REINDEX TABLE auth_sessions;
  REINDEX TABLE auth_audit_log;

  -- Update query planner statistics
  UPDATE pg_class SET relpages = 0, reltuples = 0
  WHERE relname IN ('auth_sessions', 'auth_audit_log');
"

# 2. Redis optimization
echo "2. Redis optimization..."
redis-cli CONFIG SET maxmemory-policy allkeys-lru
redis-cli CONFIG SET save "900 1 300 10 60 10000"
redis-cli MEMORY PURGE

# 3. Application cache warming
echo "3. Cache warming..."
curl -s https://api.rms.company.com/health > /dev/null
curl -s https://api.rms.company.com/api/universe?warmup=true > /dev/null

# 4. Connection pool optimization
echo "4. Connection pool tuning..."
# Update database connection pool settings
# This would typically be done in configuration files

echo "Performance optimization completed: $(date)"
```

## User Management

### User Onboarding

```bash
#!/bin/bash
# User onboarding script

USER_EMAIL="$1"
USER_ROLE="$2"

if [ -z "$USER_EMAIL" ] || [ -z "$USER_ROLE" ]; then
  echo "Usage: $0 <email> <role>"
  echo "Roles: admin, user, readonly"
  exit 1
fi

echo "Creating user account for: $USER_EMAIL"

# 1. Create user in Cognito
aws cognito-idp admin-create-user \
  --user-pool-id us-east-1_XXXXXXXXX \
  --username "$USER_EMAIL" \
  --user-attributes Name=email,Value="$USER_EMAIL" \
  --temporary-password "TempPass$(openssl rand -hex 4)!" \
  --message-action SUPPRESS

# 2. Add user to appropriate group
aws cognito-idp admin-add-user-to-group \
  --user-pool-id us-east-1_XXXXXXXXX \
  --username "$USER_EMAIL" \
  --group-name "$USER_ROLE"

# 3. Send welcome email
cat << EOF > /tmp/welcome_email.txt
Subject: Welcome to RMS

Dear User,

Your RMS account has been created with email: $USER_EMAIL
Role: $USER_ROLE

Please log in at: https://rms.company.com
You will be prompted to set a permanent password on first login.

Best regards,
RMS Administration Team
EOF

# Send email using AWS SES
aws ses send-email \
  --source "noreply@company.com" \
  --destination "ToAddresses=$USER_EMAIL" \
  --message file:///tmp/welcome_email.txt

echo "User account created successfully"
```

### User Offboarding

```bash
#!/bin/bash
# User offboarding script

USER_EMAIL="$1"

if [ -z "$USER_EMAIL" ]; then
  echo "Usage: $0 <email>"
  exit 1
fi

echo "Offboarding user: $USER_EMAIL"

# 1. Disable user account
aws cognito-idp admin-disable-user \
  --user-pool-id us-east-1_XXXXXXXXX \
  --username "$USER_EMAIL"

# 2. Sign out all sessions
aws cognito-idp admin-user-global-sign-out \
  --user-pool-id us-east-1_XXXXXXXXX \
  --username "$USER_EMAIL"

# 3. Log the offboarding
echo "$(date): User $USER_EMAIL offboarded" >> /var/log/rms/user-management.log

# 4. Clean up related data (if applicable)
psql -h localhost -U rms_user -d rms_db -c "
  UPDATE user_sessions SET active = false
  WHERE user_email = '$USER_EMAIL';
"

echo "User offboarding completed"
```

## Change Management

### Deployment Procedure

```bash
#!/bin/bash
# Authentication service deployment

VERSION="$1"
ENVIRONMENT="$2"

if [ -z "$VERSION" ] || [ -z "$ENVIRONMENT" ]; then
  echo "Usage: $0 <version> <environment>"
  echo "Environments: dev, staging, prod"
  exit 1
fi

echo "Deploying RMS Authentication v$VERSION to $ENVIRONMENT"

# 1. Pre-deployment checks
echo "1. Pre-deployment validation..."
./scripts/pre-deploy-check.sh "$ENVIRONMENT"

# 2. Create deployment backup
echo "2. Creating backup..."
./scripts/backup-config.sh "$ENVIRONMENT"

# 3. Deploy new version
echo "3. Deploying application..."
ansible-playbook -i inventory/$ENVIRONMENT deploy.yml \
  --extra-vars "version=$VERSION"

# 4. Post-deployment validation
echo "4. Post-deployment validation..."
sleep 30
./scripts/health-check.sh "$ENVIRONMENT"

# 5. Smoke tests
echo "5. Running smoke tests..."
./scripts/smoke-test.sh "$ENVIRONMENT"

if [ $? -eq 0 ]; then
  echo "Deployment successful!"
else
  echo "Deployment failed, initiating rollback..."
  ./scripts/rollback.sh "$ENVIRONMENT"
  exit 1
fi
```

### Rollback Procedure

```bash
#!/bin/bash
# Emergency rollback procedure

ENVIRONMENT="$1"

echo "EMERGENCY ROLLBACK - RMS Authentication ($ENVIRONMENT)"
echo "Started: $(date)"

# 1. Stop current services
systemctl stop rms-api

# 2. Restore previous version
BACKUP_DIR="/backup/deployment/$(date -d '1 day ago' +%Y%m%d)"
if [ -d "$BACKUP_DIR" ]; then
  tar -xzf "$BACKUP_DIR/rms-api.tar.gz" -C /opt/rms/
  tar -xzf "$BACKUP_DIR/config.tar.gz" -C /etc/rms/
else
  echo "ERROR: No backup found for rollback!"
  exit 1
fi

# 3. Restore database (if needed)
# psql -h localhost -U rms_user -d rms_db < "$BACKUP_DIR/database.sql"

# 4. Start services
systemctl start rms-api
systemctl start nginx

# 5. Verify rollback
sleep 15
curl -f https://api.rms.company.com/health

if [ $? -eq 0 ]; then
  echo "Rollback successful!"
  echo "Completed: $(date)"
else
  echo "Rollback failed! Manual intervention required!"
  exit 1
fi
```

---

_This operational runbook should be reviewed monthly and updated with any changes to procedures or infrastructure. All operators should be familiar with these procedures and have access to necessary credentials and tools._
