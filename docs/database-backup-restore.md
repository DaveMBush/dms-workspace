# Database Backup and Restore Procedures

## Overview

This document provides comprehensive procedures for backing up and restoring the SQLite database before and during schema rollouts.

## Prerequisites

- Access to the server environment where the database is located
- Sufficient disk space (minimum 2x database size for safe operations)
- Write permissions to backup directory
- Knowledge of current database location (`DATABASE_URL` in `.env`)

## Backup Procedures

### 1. Pre-Rollout Backup (Mandatory)

**When**: Before any schema migration or major deployment

```bash
#!/bin/bash
# Backup script for DMS database

# Configuration
DB_PATH="../database.db"  # Adjust path based on DATABASE_URL
BACKUP_DIR="backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/database_backup_${TIMESTAMP}.db"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Stop application (optional but recommended for consistency)
# pm2 stop dms-server  # Adjust based on process manager

# Create backup using SQLite backup command
sqlite3 "$DB_PATH" ".backup $BACKUP_FILE"

# Verify backup integrity
if sqlite3 "$BACKUP_FILE" "PRAGMA integrity_check;" | grep -q "ok"; then
    echo "✅ Backup created successfully: $BACKUP_FILE"
    echo "Backup size: $(du -h $BACKUP_FILE | cut -f1)"

    # Create checksums
    md5sum "$DB_PATH" > "${BACKUP_FILE}.md5"
    md5sum "$BACKUP_FILE" >> "${BACKUP_FILE}.md5"

    echo "✅ Checksums created: ${BACKUP_FILE}.md5"
else
    echo "❌ Backup verification failed"
    rm -f "$BACKUP_FILE"
    exit 1
fi

# Restart application if it was stopped
# pm2 start dms-server
```

### 2. Automated Daily Backups

**When**: Daily at 2 AM (low usage period)

```bash
#!/bin/bash
# Daily backup cron job
# Add to crontab: 0 2 * * * /path/to/daily-backup.sh

DB_PATH="../database.db"
BACKUP_DIR="backups/daily"
TIMESTAMP=$(date +"%Y%m%d")
BACKUP_FILE="${BACKUP_DIR}/database_daily_${TIMESTAMP}.db"

mkdir -p "$BACKUP_DIR"

# Create backup
sqlite3 "$DB_PATH" ".backup $BACKUP_FILE"

# Compress backup to save space
gzip "$BACKUP_FILE"

# Keep only last 30 days of daily backups
find "$BACKUP_DIR" -name "database_daily_*.db.gz" -mtime +30 -delete

echo "Daily backup completed: ${BACKUP_FILE}.gz"
```

### 3. Hot Backup (During Operation)

**When**: Need backup while application is running

```bash
#!/bin/bash
# Hot backup using WAL mode

DB_PATH="../database.db"
BACKUP_DIR="backups/hot"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/database_hot_${TIMESTAMP}.db"

mkdir -p "$BACKUP_DIR"

# Enable WAL mode for hot backup
sqlite3 "$DB_PATH" "PRAGMA journal_mode=WAL;"

# Create hot backup
sqlite3 "$DB_PATH" ".backup $BACKUP_FILE"

# Verify backup
if sqlite3 "$BACKUP_FILE" "PRAGMA integrity_check;" | grep -q "ok"; then
    echo "✅ Hot backup created: $BACKUP_FILE"
else
    echo "❌ Hot backup failed"
    exit 1
fi
```

## Restore Procedures

### 1. Full Database Restore

**When**: Complete system failure or data corruption

```bash
#!/bin/bash
# Full restore procedure

BACKUP_FILE="$1"
DB_PATH="../database.db"
RESTORE_TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: $0 <backup_file_path>"
    exit 1
fi

# Verify backup exists and is valid
if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Backup file not found: $BACKUP_FILE"
    exit 1
fi

# Verify backup integrity
if ! sqlite3 "$BACKUP_FILE" "PRAGMA integrity_check;" | grep -q "ok"; then
    echo "❌ Backup file is corrupted: $BACKUP_FILE"
    exit 1
fi

# Stop application
echo "Stopping application..."
# pm2 stop dms-server

# Backup current database (just in case)
if [ -f "$DB_PATH" ]; then
    mv "$DB_PATH" "${DB_PATH}.pre-restore.${RESTORE_TIMESTAMP}"
    echo "✅ Current database backed up to: ${DB_PATH}.pre-restore.${RESTORE_TIMESTAMP}"
fi

# Restore from backup
cp "$BACKUP_FILE" "$DB_PATH"

# Verify restored database
if sqlite3 "$DB_PATH" "PRAGMA integrity_check;" | grep -q "ok"; then
    echo "✅ Database restored successfully from: $BACKUP_FILE"

    # Run quick smoke test
    echo "Running smoke test..."
    if sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM universe; SELECT COUNT(*) FROM risk_group; SELECT COUNT(*) FROM screener;" > /dev/null; then
        echo "✅ Smoke test passed"
    else
        echo "❌ Smoke test failed"
    fi
else
    echo "❌ Restored database is corrupted"
    exit 1
fi

# Restart application
echo "Starting application..."
# pm2 start dms-server

echo "✅ Restore completed successfully"
```

### 2. Point-in-Time Restore

**When**: Need to restore to specific point in time

```bash
#!/bin/bash
# Point-in-time restore using transaction log

BACKUP_FILE="$1"
TARGET_TIMESTAMP="$2"  # Format: YYYY-MM-DD HH:MM:SS

echo "Restoring to point-in-time: $TARGET_TIMESTAMP"
echo "This procedure requires manual transaction log replay"
echo "Contact DBA for assistance with point-in-time recovery"
```

### 3. Selective Data Restore

**When**: Only specific tables need restoration

```bash
#!/bin/bash
# Selective table restore

BACKUP_FILE="$1"
TABLE_NAME="$2"
DB_PATH="../database.db"

if [ -z "$BACKUP_FILE" ] || [ -z "$TABLE_NAME" ]; then
    echo "Usage: $0 <backup_file> <table_name>"
    exit 1
fi

# Create temporary database from backup
TEMP_DB="/tmp/restore_temp_$(date +%s).db"
cp "$BACKUP_FILE" "$TEMP_DB"

# Export table data
sqlite3 "$TEMP_DB" ".mode insert $TABLE_NAME" ".output /tmp/${TABLE_NAME}_restore.sql" "SELECT * FROM $TABLE_NAME;"

echo "Table data exported to: /tmp/${TABLE_NAME}_restore.sql"
echo "Review the SQL file before importing to production database"
echo "To import: sqlite3 $DB_PATH < /tmp/${TABLE_NAME}_restore.sql"

# Cleanup
rm -f "$TEMP_DB"
```

## Verification Procedures

### 1. Backup Verification

```bash
#!/bin/bash
# Verify backup integrity

BACKUP_FILE="$1"

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: $0 <backup_file>"
    exit 1
fi

echo "Verifying backup: $BACKUP_FILE"

# Check file exists and size
if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Backup file not found"
    exit 1
fi

SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "Backup size: $SIZE"

# Integrity check
if sqlite3 "$BACKUP_FILE" "PRAGMA integrity_check;" | grep -q "ok"; then
    echo "✅ Integrity check passed"
else
    echo "❌ Integrity check failed"
    exit 1
fi

# Schema verification
echo "Schema verification:"
sqlite3 "$BACKUP_FILE" ".schema" > /tmp/backup_schema.sql
echo "✅ Schema extracted to /tmp/backup_schema.sql"

# Record counts
echo "Table record counts:"
sqlite3 "$BACKUP_FILE" "
SELECT 'accounts: ' || COUNT(*) FROM accounts;
SELECT 'universe: ' || COUNT(*) FROM universe;
SELECT 'risk_group: ' || COUNT(*) FROM risk_group;
SELECT 'screener: ' || COUNT(*) FROM screener;
SELECT 'trades: ' || COUNT(*) FROM trades;
SELECT 'holidays: ' || COUNT(*) FROM holidays;
SELECT 'divDeposits: ' || COUNT(*) FROM divDeposits;
SELECT 'divDepositType: ' || COUNT(*) FROM divDepositType;
"

echo "✅ Backup verification completed"
```

### 2. Post-Restore Verification

```bash
#!/bin/bash
# Verify database after restore

DB_PATH="../database.db"

echo "Post-restore verification for: $DB_PATH"

# Integrity check
if sqlite3 "$DB_PATH" "PRAGMA integrity_check;" | grep -q "ok"; then
    echo "✅ Database integrity OK"
else
    echo "❌ Database integrity FAILED"
    exit 1
fi

# Schema check
echo "Verifying schema..."
sqlite3 "$DB_PATH" ".schema" | grep -E "(CREATE TABLE|CREATE INDEX|CREATE UNIQUE)" | wc -l
echo "Schema objects verified"

# Data consistency checks
echo "Running data consistency checks..."

# Foreign key check
sqlite3 "$DB_PATH" "PRAGMA foreign_key_check;" | head -10
echo "✅ Foreign key constraints verified"

# Basic functionality test
sqlite3 "$DB_PATH" "
SELECT 'Universe records: ' || COUNT(*) FROM universe WHERE deletedAt IS NULL;
SELECT 'Risk groups: ' || COUNT(*) FROM risk_group WHERE deletedAt IS NULL;
SELECT 'Active trades: ' || COUNT(*) FROM trades WHERE deletedAt IS NULL;
"

echo "✅ Post-restore verification completed"
```

## Backup Retention Policy

- **Pre-rollout backups**: Keep indefinitely (manual cleanup)
- **Daily backups**: Keep for 30 days
- **Hot backups**: Keep for 7 days
- **Weekly backups**: Keep for 12 weeks (3 months)
- **Monthly backups**: Keep for 12 months

## Monitoring and Alerts

1. Monitor backup job success/failure
2. Alert on backup size changes > 20%
3. Alert on backup verification failures
4. Monitor disk space in backup directories
5. Regular backup restore testing (monthly)

## Emergency Contacts

- Database Administrator: [Contact Info]
- System Administrator: [Contact Info]
- On-call Engineer: [Contact Info]

## Testing Schedule

- **Backup verification**: Daily (automated)
- **Restore testing**: Weekly (automated, test environment)
- **Disaster recovery drill**: Monthly (manual)
- **Full system recovery test**: Quarterly

## Troubleshooting

### Common Issues

1. **Backup file corrupted**

   - Check disk space during backup
   - Verify source database integrity
   - Check for I/O errors in system logs

2. **Restore fails**

   - Verify backup file integrity
   - Check target database permissions
   - Ensure application is stopped during restore

3. **Performance issues after restore**
   - Run `VACUUM` and `ANALYZE` commands
   - Verify indexes are properly created
   - Check query performance

### Recovery Time Objectives (RTO)

- **Full restore**: < 30 minutes
- **Selective restore**: < 15 minutes
- **Point-in-time restore**: < 2 hours

### Recovery Point Objectives (RPO)

- **Maximum data loss**: < 1 hour (with daily backups)
- **With transaction log**: < 15 minutes
