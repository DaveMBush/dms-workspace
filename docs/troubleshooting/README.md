# RMS Troubleshooting Guide

This guide provides systematic approaches to diagnosing and resolving common issues in the RMS system.

## Quick Reference

### Emergency Contacts

- **DevOps Team**: slack://rms-devops or +1-800-RMS-HELP
- **Database Issues**: dba@company.com
- **Security Issues**: security@company.com

### Critical System Status

- **Health Dashboard**: https://status.rms.company.com
- **CloudWatch Dashboards**: https://console.aws.amazon.com/cloudwatch/home#dashboards:
- **X-Ray Traces**: https://console.aws.amazon.com/xray/home

## Common Issues and Solutions

### 1. Application Not Responding

#### Symptoms

- HTTP 502/503 errors
- Timeouts on API requests
- Users unable to access the application

#### Diagnosis Steps

1. Check service health:

   ```bash
   ./scripts/daily-health-check.sh
   ```

2. Verify ECS service status:

   ```bash
   aws ecs describe-services \
     --cluster rms-production \
     --services rms-backend rms-frontend
   ```

3. Check ALB target health:
   ```bash
   aws elbv2 describe-target-health \
     --target-group-arn arn:aws:elasticloadbalancing:us-east-1:ACCOUNT:targetgroup/rms-backend/xxx
   ```

#### Resolution

- **If tasks are unhealthy**: Force new deployment

  ```bash
  aws ecs update-service \
    --cluster rms-production \
    --service rms-backend \
    --force-new-deployment
  ```

- **If ALB is failing**: Check security groups and VPC routing
- **If persistent**: Scale up service capacity

### 2. Database Connection Issues

#### Symptoms

- "Connection timed out" errors
- "Too many connections" errors
- Slow query responses

#### Diagnosis Steps

1. Check RDS instance status:

   ```bash
   aws rds describe-db-instances \
     --db-instance-identifier rms-production-db
   ```

2. Monitor active connections:

   ```sql
   SELECT count(*) FROM pg_stat_activity WHERE state = 'active';
   ```

3. Check connection pool metrics in CloudWatch:
   - DatabaseConnections
   - DatabaseConnectionsMax

#### Resolution

- **Connection limit reached**: Scale up RDS instance or optimize connection pooling
- **Network issues**: Verify security group rules and VPC routing
- **Performance issues**: Review slow query log and optimize queries

### 3. High Memory Usage

#### Symptoms

- ECS tasks being killed and restarted
- OutOfMemory errors in CloudWatch logs
- Slow application performance

#### Diagnosis Steps

1. Check ECS task memory metrics:

   ```bash
   aws cloudwatch get-metric-statistics \
     --namespace AWS/ECS \
     --metric-name MemoryUtilization \
     --dimensions Name=ServiceName,Value=rms-backend \
     --start-time 2024-01-01T00:00:00Z \
     --end-time 2024-01-01T23:59:59Z \
     --period 300 \
     --statistics Average,Maximum
   ```

2. Review application logs for memory leaks
3. Check for stuck processes or infinite loops

#### Resolution

- **Immediate**: Increase task memory allocation in task definition
- **Long-term**: Profile application for memory leaks and optimize

### 4. SSL/TLS Certificate Issues

#### Symptoms

- "Certificate has expired" warnings
- SSL handshake failures
- Browser security warnings

#### Diagnosis Steps

1. Check certificate expiration:

   ```bash
   aws acm list-certificates \
     --certificate-statuses ISSUED
   ```

2. Verify ALB listener configuration:
   ```bash
   aws elbv2 describe-listeners \
     --load-balancer-arn arn:aws:elasticloadbalancing:us-east-1:ACCOUNT:loadbalancer/app/rms-alb/xxx
   ```

#### Resolution

- **Expired certificates**: Request new certificate through ACM
- **Configuration issues**: Update ALB listener to use correct certificate

### 5. CDN/Static Asset Issues

#### Symptoms

- Images/CSS/JS files not loading
- Slow page load times
- 404 errors for static assets

#### Diagnosis Steps

1. Check CloudFront distribution status:

   ```bash
   aws cloudfront list-distributions \
     --query 'DistributionList.Items[?Comment==`RMS Frontend`]'
   ```

2. Test asset accessibility:
   ```bash
   curl -I https://d123456789.cloudfront.net/assets/logo.png
   ```

#### Resolution

- **Cache issues**: Create CloudFront invalidation
  ```bash
  aws cloudfront create-invalidation \
    --distribution-id E123456789ABCD \
    --paths "/*"
  ```
- **Origin issues**: Verify S3 bucket permissions and ALB health

## Performance Issues

### Slow API Responses

#### Investigation

1. Check X-Ray traces for bottlenecks:

   - Navigate to AWS X-Ray console
   - Filter by service name and time range
   - Identify slow subsegments

2. Review CloudWatch Insights logs:
   ```
   fields @timestamp, @message
   | filter @message like /ERROR/
   | sort @timestamp desc
   | limit 100
   ```

#### Common Causes

- Database query performance
- External API timeouts
- Memory/CPU constraints
- Network latency

### Database Performance

#### Monitoring Queries

```sql
-- Long-running queries
SELECT pid, now() - pg_stat_activity.query_start AS duration, query
FROM pg_stat_activity
WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes';

-- Connection count by state
SELECT state, count(*) FROM pg_stat_activity GROUP BY state;

-- Table sizes
SELECT schemaname,tablename,pg_size_pretty(size) as size
FROM (
  SELECT schemaname,tablename,pg_relation_size(schemaname||'.'||tablename) as size
  FROM pg_tables WHERE schemaname NOT IN ('information_schema','pg_catalog')
) s
ORDER BY size DESC;
```

#### Optimization Steps

1. Analyze slow queries with `EXPLAIN ANALYZE`
2. Add missing indexes
3. Update table statistics: `ANALYZE;`
4. Consider connection pooling optimization

## Deployment Issues

### Failed Deployments

#### Symptoms

- Deployment stuck in "PENDING" state
- Tasks failing health checks
- Rolling back to previous version

#### Common Causes

- Health check configuration issues
- Resource allocation problems
- Environment variable misconfigurations
- Network connectivity issues

#### Resolution Steps

1. Check ECS service events:

   ```bash
   aws ecs describe-services \
     --cluster rms-production \
     --services rms-backend \
     --query 'services[0].events[0:10]'
   ```

2. Review task definition:

   ```bash
   aws ecs describe-task-definition \
     --task-definition rms-backend:LATEST
   ```

3. Check CloudWatch logs for startup errors

### Environment-Specific Issues

#### Staging vs Production Differences

- Verify environment variables match expected values
- Check IAM role permissions
- Ensure security groups allow necessary traffic
- Validate database connection strings

## Monitoring and Alerting

### Key Metrics to Monitor

#### Application Metrics

- Request latency (p50, p90, p99)
- Error rate (4xx, 5xx responses)
- Throughput (requests per minute)
- Active user sessions

#### Infrastructure Metrics

- ECS task CPU/Memory utilization
- RDS connections and performance
- ALB target health
- CloudFront cache hit ratio

### Log Analysis

#### Application Logs

```bash
# Search for errors in the last hour
aws logs filter-log-events \
  --log-group-name /ecs/rms-backend \
  --start-time $(date -d '1 hour ago' +%s)000 \
  --filter-pattern 'ERROR'

# Count requests by status code
aws logs filter-log-events \
  --log-group-name /ecs/rms-backend \
  --filter-pattern '[timestamp, level="INFO", status_code=4*]' \
  | jq '.events | length'
```

#### Database Logs

```bash
# Check for connection issues
aws logs filter-log-events \
  --log-group-name /aws/rds/instance/rms-production-db/postgresql \
  --filter-pattern 'connection'
```

## Security Issues

### Suspicious Activity Detection

#### Signs of Issues

- Unusual traffic patterns
- Failed authentication attempts
- Unauthorized access attempts
- WAF rule violations

#### Investigation Steps

1. Check WAF logs:

   ```bash
   aws logs filter-log-events \
     --log-group-name aws-waf-logs-rms-production \
     --filter-pattern 'BLOCK'
   ```

2. Review ALB access logs in S3
3. Check CloudTrail for API activity

### Data Breach Response

#### Immediate Actions

1. Isolate affected systems
2. Change all credentials
3. Enable additional monitoring
4. Document incident timeline

#### Recovery Steps

1. Patch security vulnerabilities
2. Review and update IAM policies
3. Implement additional security controls
4. Conduct security audit

## Backup and Recovery

### Database Recovery

#### Point-in-Time Recovery

```bash
# Restore from automated backup
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier rms-recovery-$(date +%Y%m%d) \
  --db-snapshot-identifier rms-production-db-snapshot-2024-01-01

# Point-in-time restore
aws rds restore-db-instance-to-point-in-time \
  --source-db-instance-identifier rms-production-db \
  --target-db-instance-identifier rms-recovery-$(date +%Y%m%d) \
  --restore-time 2024-01-01T12:00:00.000Z
```

### Application Recovery

#### Service Rollback

```bash
# Rollback to previous task definition
aws ecs update-service \
  --cluster rms-production \
  --service rms-backend \
  --task-definition rms-backend:123  # Previous working version
```

#### Configuration Recovery

```bash
# Restore from Git
git checkout HEAD~1 -- apps/infrastructure/
terraform plan
terraform apply
```

## External Dependencies

### Third-Party Service Issues

#### Payment Gateway

- Check service status pages
- Verify API credentials
- Test connectivity with health checks
- Implement circuit breaker patterns

#### Email Service

- Monitor bounce rates
- Check sender reputation
- Verify DNS records (SPF, DKIM)
- Test email deliverability

## Escalation Procedures

### Level 1: Self-Service

- Use this troubleshooting guide
- Check automated monitoring dashboards
- Review recent deployments and changes

### Level 2: Team Support

- Contact DevOps team via Slack
- Create incident ticket with severity level
- Provide system state and error logs

### Level 3: Vendor Support

- AWS Support (Business/Enterprise plan)
- Database vendor support
- Third-party service providers

### Critical Issues (Level 0)

- System completely unavailable
- Data security breach
- Data corruption or loss

**Immediate Actions:**

1. Page on-call engineer
2. Create war room in Slack
3. Begin incident response procedure
4. Communicate with stakeholders

## Useful Commands and Scripts

### System Health Check

```bash
# Comprehensive health check
./scripts/daily-health-check.sh

# Quick service status
curl -f https://api.rms.company.com/health || echo "API Down"
curl -f https://rms.company.com || echo "Frontend Down"
```

### Log Aggregation

```bash
# Tail all service logs
aws logs tail /ecs/rms-backend --follow
aws logs tail /ecs/rms-frontend --follow

# Search across all logs
aws logs start-query \
  --log-group-names "/ecs/rms-backend" "/ecs/rms-frontend" \
  --start-time $(date -d '1 hour ago' +%s) \
  --end-time $(date +%s) \
  --query-string 'fields @timestamp, @message | filter @message like /ERROR/ | sort @timestamp desc'
```

### Resource Monitoring

```bash
# ECS resource utilization
aws ecs describe-services \
  --cluster rms-production \
  --services rms-backend rms-frontend \
  --query 'services[*].{Name:serviceName,Running:runningCount,Pending:pendingCount,Desired:desiredCount}'

# RDS performance
aws cloudwatch get-metric-statistics \
  --namespace AWS/RDS \
  --metric-name CPUUtilization \
  --dimensions Name=DBInstanceIdentifier,Value=rms-production-db \
  --start-time $(date -d '1 hour ago' --iso-8601) \
  --end-time $(date --iso-8601) \
  --period 300 \
  --statistics Average,Maximum
```

## Prevention and Best Practices

### Proactive Monitoring

- Set up comprehensive alerting rules
- Implement automated health checks
- Regular performance baselines
- Capacity planning reviews

### Change Management

- Always test in staging first
- Use blue/green deployments for critical changes
- Maintain rollback procedures
- Document all changes

### Documentation

- Keep this guide updated
- Document all custom procedures
- Maintain incident post-mortems
- Share knowledge across team

---

**Last Updated**: 2024-09-05  
**Next Review**: 2024-12-05  
**Contact**: DevOps Team - slack://rms-devops
