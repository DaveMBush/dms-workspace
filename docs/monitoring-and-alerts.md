# Monitoring and Alerts: Universe Sync from Screener

This document defines monitoring criteria, alerting thresholds, and procedures for the Universe sync from Screener feature.

## Overview

The Universe sync operation generates structured logs (detailed in [Logging and Metrics Extraction](./logging-metrics-extraction.md)) that can be monitored for errors, performance issues, and data integrity problems.

## Error Detection Criteria

### Sync Operation Errors

**Critical Errors (Immediate Alert):**

- Sync operation fails to complete (no success log entry)
- Database transaction rollback occurs
- Complete loss of connectivity to Yahoo Finance API
- Prisma/database connection failures
- Feature flag read failures

**Warning Errors (Monitor Closely):**

- Individual symbol update failures (< 10% of total)
- Yahoo API rate limit warnings
- Slow response times from external APIs
- Partial data retrieval from Yahoo Finance

### Detection Queries

```bash
# Critical: Find failed sync operations
grep '"level":"error"' logs/sync-*.log | grep '"message":"Sync from screener operation failed"'

# Critical: Find transaction rollbacks
grep '"level":"error"' logs/sync-*.log | grep "transaction.*rollback"

# Warning: Find individual symbol failures
grep '"level":"warn"' logs/sync-*.log | grep '"message":"Failed to update existing universe record"'

# Warning: Find API rate limit issues
grep '"level":"warn"' logs/sync-*.log | grep "rate.*limit"
```

## Large Expiration Detection

### Threshold Definitions

**Normal Expiration Patterns:**

- Daily variance: ≤ 5% of total active Universe symbols
- Weekly variance: ≤ 15% of total active Universe symbols
- Expected range: 1-50 symbols expired per sync operation

**Alert Thresholds:**

**WARNING (Yellow Alert):**

- Single operation expires > 10% of active Universe symbols
- Daily total expirations > 15% of active Universe symbols
- 3+ consecutive sync operations with increasing expiration counts

**CRITICAL (Red Alert):**

- Single operation expires > 25% of active Universe symbols
- Daily total expirations > 30% of active Universe symbols
- Mass expiration event (> 100 symbols in single operation)

### Detection Scripts

```bash
#!/bin/bash
# Check for large expiration events

# Get current active Universe count
ACTIVE_COUNT=$(sqlite3 database.db "SELECT COUNT(*) FROM universe WHERE expired = false")

# Check latest sync operation expiration count
LATEST_EXPIRED=$(grep '"message":"Sync from screener operation completed successfully"' logs/sync-*.log | \
  tail -1 | jq -r '.data.summary.markedExpired')

# Calculate percentage
EXPIRE_PERCENTAGE=$(echo "scale=2; $LATEST_EXPIRED * 100 / $ACTIVE_COUNT" | bc)

# Alert thresholds
if (( $(echo "$EXPIRE_PERCENTAGE > 25" | bc -l) )); then
  echo "CRITICAL: ${EXPIRE_PERCENTAGE}% of Universe expired in latest sync"
elif (( $(echo "$EXPIRE_PERCENTAGE > 10" | bc -l) )); then
  echo "WARNING: ${EXPIRE_PERCENTAGE}% of Universe expired in latest sync"
else
  echo "NORMAL: ${EXPIRE_PERCENTAGE}% expiration rate"
fi
```

## Log Review Procedures

### Daily Log Review (5 minutes)

**Automated Checks:**

1. Run error detection queries for last 24 hours
2. Check expiration threshold script
3. Verify sync operation success rate
4. Review performance metrics (duration trends)

**Manual Review:**

1. Scan error-level log entries for patterns
2. Check for new error types not covered by automated detection
3. Verify correlation IDs for failed operations match expected workflow
4. Review any user-reported issues against log timeline

### Weekly Log Analysis (30 minutes)

**Trend Analysis:**

1. Calculate weekly success rate and compare to baseline
2. Analyze performance trends (duration, throughput)
3. Review expiration patterns for seasonality
4. Identify recurring error patterns

**Capacity Planning:**

1. Monitor log file growth and storage usage
2. Review peak operation times and frequency
3. Assess need for performance optimization
4. Plan for log retention and archival

### Log Review Commands

```bash
# Daily summary script
./scripts/daily-sync-summary.sh $(date -d '1 day ago' +%Y-%m-%d)

# Error analysis for specific date range
grep '"timestamp":"2025-08-2[0-9]' logs/sync-*.log | grep '"level":"error"' | \
  jq -r '{time: .timestamp, error: .message, data: .data}'

# Performance analysis for last week
grep '"message":"Sync from screener operation completed successfully"' logs/sync-*.log | \
  grep '"timestamp":"2025-08-' | jq -r '.data.duration' | \
  awk '{sum += $1; count++} END {print "Avg duration:", sum/count, "ms"}'
```

## Metrics Monitoring and Alerting Thresholds

### Performance Metrics

**Response Time Thresholds:**

- **Normal:** < 10 seconds for sync operation
- **Warning:** 10-30 seconds (monitor for trends)
- **Critical:** > 30 seconds (investigate immediately)

**Throughput Thresholds:**

- **Normal:** 1-1000 records processed per operation
- **Warning:** > 1000 records (validate data integrity)
- **Critical:** > 2000 records (potential performance impact)

### Success Rate Thresholds

**Operation Success Rate:**

- **Healthy:** > 95% success rate over 24 hours
- **Warning:** 90-95% success rate
- **Critical:** < 90% success rate

**Individual Symbol Success Rate:**

- **Healthy:** > 98% symbols processed successfully
- **Warning:** 95-98% symbol success rate
- **Critical:** < 95% symbol success rate

### Data Quality Metrics

**Universe Population:**

- **Normal:** 500-2000 active Universe symbols
- **Warning:** < 500 or > 2000 active symbols
- **Critical:** < 100 or > 5000 active symbols

**Expiration Rate:**

- **Normal:** 1-5% of Universe expired per sync
- **Warning:** 5-10% expiration rate
- **Critical:** > 10% expiration rate

## Alerting Implementation

### Alert Levels and Response Times

**CRITICAL Alerts (Immediate Response - 5 minutes):**

- Sync operation complete failure
- Mass expiration event (> 25% of Universe)
- Database connectivity loss
- Feature flag system failure

**WARNING Alerts (Response within 1 hour):**

- Elevated error rate (5-10%)
- Performance degradation (> 10 seconds)
- Moderate expiration increase (10-25%)
- API rate limiting

**INFO Alerts (Response within 4 hours):**

- Success rate below optimal (90-95%)
- Performance trends indicating degradation
- Unusual patterns in expiration data

### Alert Notification Channels

**Critical Alerts:**

- Immediate notification (SMS, push notification)
- Email to operations team
- Dashboard red status indicator
- Slack/Teams urgent channel

**Warning Alerts:**

- Email notification
- Dashboard yellow status indicator
- Slack/Teams monitoring channel

**Info Alerts:**

- Dashboard info indicator
- Daily digest email
- Weekly summary report

### Monitoring Commands

```bash
# Real-time monitoring script (run every 5 minutes)
#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Check for recent errors (last 5 minutes)
RECENT_ERRORS=$(find logs -name "sync-*.log" -newermt "5 minutes ago" | \
  xargs grep '"level":"error"' | wc -l)

if [ "$RECENT_ERRORS" -gt 0 ]; then
  echo "ALERT: $RECENT_ERRORS sync errors in last 5 minutes"
  # Send alert notification
fi

# Check latest sync operation status
LATEST_LOG=$(find logs -name "sync-*.log" -type f -printf '%T@ %p\n' | \
  sort -n | tail -1 | cut -d' ' -f2-)

if [ -n "$LATEST_LOG" ]; then
  LATEST_STATUS=$(tail -1 "$LATEST_LOG" | jq -r '.message')
  if [[ "$LATEST_STATUS" != *"completed successfully"* ]]; then
    echo "ALERT: Latest sync operation did not complete successfully"
  fi
fi
```

## Incident Response Workflows

### Critical Incident Response

**Immediate Actions (0-5 minutes):**

1. Acknowledge alert and begin investigation
2. Check feature flag status and disable if necessary
3. Verify current sync operations are stopped
4. Assess scope of impact (how many users affected)

**Assessment Phase (5-15 minutes):**

1. Review recent log entries for root cause
2. Check database integrity with quick queries
3. Verify external service (Yahoo Finance) availability
4. Determine if rollback is necessary

**Resolution Phase (15-60 minutes):**

1. Implement fix or execute rollback procedure
2. Verify resolution with monitoring checks
3. Re-enable feature if issue resolved
4. Monitor for 1 hour post-resolution

**Post-Incident (1-24 hours):**

1. Document incident timeline and root cause
2. Update monitoring thresholds if needed
3. Review alert effectiveness and timing
4. Plan preventive measures for similar issues

### Warning Incident Response

**Initial Assessment (0-60 minutes):**

1. Review alert details and log context
2. Determine trend vs. one-time event
3. Check if automatic recovery occurred
4. Assess need for immediate intervention

**Investigation (1-4 hours):**

1. Analyze trends over larger time window
2. Check for correlations with external events
3. Review system resources and performance
4. Determine if intervention needed

**Follow-up (4-24 hours):**

1. Continue monitoring for pattern development
2. Document findings and any actions taken
3. Update monitoring if new patterns identified
4. Schedule review if recurring issue

## Monitoring Dashboard Requirements

### Real-Time Status Panel

**Current Status Indicators:**

- Feature flag status (enabled/disabled)
- Last sync operation result (success/failure/in-progress)
- Current error rate (last hour)
- Active Universe symbol count

### Historical Trends (Last 7 Days)

**Performance Metrics:**

- Sync operation duration trends
- Success rate over time
- Throughput (records processed per day)
- Error rate trends

**Data Quality Metrics:**

- Universe population changes
- Expiration rate trends
- Risk group distribution
- Symbol turnover rate

### Alert Status

**Active Alerts:**

- Current critical and warning alerts
- Alert acknowledgment status
- Time since last alert
- Alert resolution status

**Alert History:**

- Recent alert timeline
- Alert frequency patterns
- Resolution time metrics
- False positive tracking

> **📖 Related Documentation:**
>
> - [Logging and Metrics Extraction](./logging-metrics-extraction.md) - Technical log analysis
> - [Rollback Runbook](./rollback-runbook.md) - Emergency procedures
> - [Feature Flag Configuration](./configuration/feature-flags.md) - Configuration management
