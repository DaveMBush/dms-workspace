# Logging and Metrics Extraction Guide

## Overview

The Universe sync from Screener operation now generates structured logs for each request. Each log file contains detailed information about the sync operation, including counts, timing, and error details.

## Log File Structure

### File Naming Convention
```
logs/sync-{timestamp}-{correlationId}.log
```

Example: `logs/sync-2025-08-20T15-30-45-123Z-a1b2c3d4-e5f6-7890-abcd-ef1234567890.log`

### Log Entry Format
Each log entry is a JSON object with the following structure:
```json
{
  "timestamp": "2025-08-20T15:30:45.123Z",
  "correlationId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "level": "info|warn|error",
  "message": "Human readable message",
  "data": {
    // Additional structured data
  }
}
```

## Metrics Available

### Request-Level Metrics
- **Correlation ID**: Unique identifier for each sync request
- **Duration**: Total processing time in milliseconds
- **Feature Flag Status**: Whether the sync feature was enabled

### Operation Counts
- **Selected Count**: Number of eligible screener records
- **Inserted**: New universe records created
- **Updated**: Existing universe records modified
- **Marked Expired**: Records marked as expired

### Error Context
- **Symbol Information**: Which symbols were involved in failures
- **Operation Type**: What operation failed (insert, update, expire)
- **Error Messages**: Relevant error details without sensitive data

## Extracting Metrics

### Using Command Line Tools

#### Count Total Operations
```bash
# Count total sync operations
grep -c '"message":"Sync from screener operation started"' logs/sync-*.log

# Count successful operations
grep -c '"message":"Sync from screener operation completed successfully"' logs/sync-*.log

# Count failed operations
grep -c '"message":"Sync from screener operation failed"' logs/sync-*.log
```

#### Extract Operation Counts
```bash
# Extract inserted counts
grep '"message":"Sync from screener operation completed successfully"' logs/sync-*.log | \
  jq -r '.data.summary.inserted' | \
  awk '{sum += $1} END {print "Total inserted:", sum}'

# Extract updated counts
grep '"message":"Sync from screener operation completed successfully"' logs/sync-*.log | \
  jq -r '.data.summary.updated' | \
  awk '{sum += $1} END {print "Total updated:", sum}'

# Extract expired counts
grep '"message":"Sync from screener operation completed successfully"' logs/sync-*.log | \
  jq -r '.data.summary.markedExpired' | \
  awk '{sum += $1} END {print "Total expired:", sum}'
```

#### Performance Metrics
```bash
# Extract operation durations
grep '"message":"Sync from screener operation completed successfully"' logs/sync-*.log | \
  jq -r '.data.duration' | \
  awk '{sum += $1; count++; if ($1 > max) max = $1; if ($1 < min || min == 0) min = $1} \
  END {print "Count:", count, "Avg:", sum/count, "Min:", min, "Max:", max}'
```

### Using Scripts

#### TypeScript/Node.js Script Example
```typescript
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

interface LogEntry {
  timestamp: string;
  correlationId: string;
  level: 'error' | 'info' | 'warn';
  message: string;
  data?: {
    summary?: {
      inserted: number;
      updated: number;
      markedExpired: number;
    };
    duration?: number;
  };
}

interface Metrics {
  inserted: number[];
  updated: number[];
  expired: number[];
  duration: number[];
}

function analyzeSyncLogs(): void {
  const logsDir = join(process.cwd(), 'logs');
  const metrics: Metrics = {
    inserted: [],
    updated: [],
    expired: [],
    duration: [],
  };

  try {
    const logFiles = readdirSync(logsDir)
      .filter(file => file.startsWith('sync-') && file.endsWith('.log'));

    for (const logFile of logFiles) {
      const logPath = join(logsDir, logFile);
      const content = readFileSync(logPath, 'utf-8');
      
      for (const line of content.split('\n')) {
        if (!line.trim()) continue;
        
        try {
          const entry: LogEntry = JSON.parse(line);
          if (entry.message === 'Sync from screener operation completed successfully' && entry.data?.summary) {
            metrics.inserted.push(entry.data.summary.inserted);
            metrics.updated.push(entry.data.summary.updated);
            metrics.expired.push(entry.data.summary.markedExpired);
            if (entry.data.duration) {
              metrics.duration.push(entry.data.duration);
            }
          }
        } catch (parseError) {
          // Skip malformed JSON lines
          continue;
        }
      }
    }

    const totalOperations = metrics.duration.length;
    const totalInserted = metrics.inserted.reduce((sum, count) => sum + count, 0);
    const totalUpdated = metrics.updated.reduce((sum, count) => sum + count, 0);
    const totalExpired = metrics.expired.reduce((sum, count) => sum + count, 0);
    const avgDuration = totalOperations > 0 
      ? metrics.duration.reduce((sum, duration) => sum + duration, 0) / totalOperations 
      : 0;

    console.log('Sync Operation Metrics:');
    console.log(`Total Operations: ${totalOperations}`);
    console.log(`Total Inserted: ${totalInserted}`);
    console.log(`Total Updated: ${totalUpdated}`);
    console.log(`Total Expired: ${totalExpired}`);
    console.log(`Average Duration: ${avgDuration.toFixed(2)}ms`);
  } catch (error) {
    console.error('Error analyzing logs:', error);
  }
}

// Run the analysis
analyzeSyncLogs();
```

## Error Analysis

### Finding Failed Operations
```bash
# Get all error entries
grep '"level":"error"' logs/sync-*.log

# Find specific error types
grep '"message":"Failed to update existing universe record"' logs/sync-*.log

# Extract error context
grep '"level":"error"' logs/sync-*.log | \
  jq -r '.data | {symbol: .symbol, error: .error, correlationId: .correlationId}'
```

### Correlation ID Tracing
```bash
# Get all log entries for a specific request
correlation_id="a1b2c3d4-e5f6-7890-abcd-ef1234567890"
grep "$correlation_id" logs/sync-*.log
```

## Dashboard Considerations

For future log viewer implementation, consider these metrics:

### Key Performance Indicators (KPIs)
- **Success Rate**: Successful operations / Total operations
- **Average Processing Time**: Mean duration across all operations
- **Throughput**: Operations per time period
- **Error Rate**: Failed operations / Total operations

### Operational Metrics
- **Records Processed**: Total inserted + updated + expired
- **Data Quality**: Distribution of record types
- **Peak Usage**: Operations per hour/day patterns

### Alerting Thresholds
- **High Error Rate**: >5% failure rate
- **Slow Operations**: Duration > 30 seconds
- **High Volume**: >1000 records processed in single operation

## Log Retention

Consider implementing log rotation and retention policies:
- Keep detailed logs for 30 days
- Archive older logs for compliance
- Implement log compression for storage efficiency
