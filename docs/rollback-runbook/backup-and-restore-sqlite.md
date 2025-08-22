# Backup and Restore (SQLite)

Comprehensive guide for backing up and restoring the SQLite database before deployments and during recovery scenarios.

## Prerequisites

- **SQLite3 CLI**: Required for integrity checks and advanced operations
  ```bash
  # Install on Ubuntu/Debian
  sudo apt-get install sqlite3
  
  # Install on macOS
  brew install sqlite3
  
  # Install on Windows
  # Download from https://sqlite.org/download.html
  ```

- **File System Access**: Read/write permissions to database file location
- **Sufficient Disk Space**: For backup storage (typically 2-3x database size)

## Quick Reference

### Pre-Deployment Backup
```bash
# 1. Stop the server
./scripts/stop-server.sh

# 2. Create timestamped backup
cp database.db "backups/database_$(date +%Y%m%d_%H%M%S).db"

# 3. Verify backup integrity
sqlite3 "backups/database_$(date +%Y%m%d_%H%M%S).db" "PRAGMA integrity_check;"
```

### Emergency Restore
```bash
# 1. Stop the server
./scripts/stop-server.sh

# 2. Restore from backup
cp backups/database_YYYYMMDD_HHMMSS.db database.db

# 3. Verify and start
sqlite3 database.db "PRAGMA integrity_check;" && ./scripts/start-server.sh
```

## Detailed Procedures

### Backup Process

#### 1. Determine Database Location
The database file location is specified in the `DATABASE_URL` environment variable:

```bash
# Check current database URL
echo $DATABASE_URL
# Expected output: file:./database.db or file:../database.db
```

For different environments:
- **Development**: Usually `file:./database.db` (in project root)
- **Production**: May be `file:./production.db` or absolute path
- **Testing**: Temporary files like `file:./test.db`

#### 2. Pre-Backup Checklist
- [ ] Identify the correct database file from `DATABASE_URL`
- [ ] Ensure sufficient disk space for backup
- [ ] Verify backup directory exists: `mkdir -p backups/`
- [ ] Stop all database connections (server processes)

#### 3. Create Backup

**Manual Backup:**
```bash
# Stop the server first
pkill -f "node.*server" || ./scripts/stop-server.sh

# Create timestamped backup
BACKUP_FILE="backups/database_$(date +%Y%m%d_%H%M%S).db"
cp database.db "$BACKUP_FILE"

# Verify backup was created successfully
if [ -f "$BACKUP_FILE" ]; then
    echo "Backup created successfully: $BACKUP_FILE"
    ls -lh "$BACKUP_FILE"
else
    echo "ERROR: Backup failed!"
    exit 1
fi
```

**Automated Backup Script:**
Create `/scripts/backup-database.sh`:
```bash
#!/bin/bash
set -e

# Configuration
DB_FILE="database.db"
BACKUP_DIR="backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/database_$TIMESTAMP.db"

# Ensure backup directory exists
mkdir -p "$BACKUP_DIR"

# Stop server if running
echo "Stopping server..."
pkill -f "node.*server" || echo "Server not running"
sleep 2

# Create backup
echo "Creating backup: $BACKUP_FILE"
cp "$DB_FILE" "$BACKUP_FILE"

# Verify integrity
echo "Verifying backup integrity..."
sqlite3 "$BACKUP_FILE" "PRAGMA integrity_check;" | grep -q "ok" || {
    echo "ERROR: Backup integrity check failed!"
    exit 1
}

# Show backup info
echo "Backup completed successfully:"
ls -lh "$BACKUP_FILE"

# Cleanup old backups (keep last 10)
ls -t $BACKUP_DIR/database_*.db | tail -n +11 | xargs rm -f 2>/dev/null || true

echo "Backup process completed. You can now restart the server."
```

Make it executable:
```bash
chmod +x scripts/backup-database.sh
```

### Restore Process

#### 1. Pre-Restore Checklist
- [ ] Identify the backup file to restore from
- [ ] Verify backup file integrity
- [ ] Stop all server processes
- [ ] Create a backup of current database (if not corrupted)

#### 2. Restore Steps

**Standard Restore:**
```bash
#!/bin/bash
set -e

BACKUP_FILE="$1"
DB_FILE="database.db"

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: $0 <backup_file>"
    echo "Available backups:"
    ls -la backups/database_*.db
    exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
    echo "ERROR: Backup file not found: $BACKUP_FILE"
    exit 1
fi

# Stop server
echo "Stopping server..."
pkill -f "node.*server" || echo "Server not running"
sleep 2

# Backup current database if it exists and isn't corrupted
if [ -f "$DB_FILE" ]; then
    echo "Creating safety backup of current database..."
    cp "$DB_FILE" "database_pre_restore_$(date +%Y%m%d_%H%M%S).db"
fi

# Verify backup integrity before restore
echo "Verifying backup file integrity..."
sqlite3 "$BACKUP_FILE" "PRAGMA integrity_check;" | grep -q "ok" || {
    echo "ERROR: Backup file is corrupted!"
    exit 1
}

# Restore from backup
echo "Restoring from: $BACKUP_FILE"
cp "$BACKUP_FILE" "$DB_FILE"

# Verify restored database
echo "Verifying restored database..."
sqlite3 "$DB_FILE" "PRAGMA integrity_check;" | grep -q "ok" || {
    echo "ERROR: Restored database is corrupted!"
    exit 1
}

# Show database info
echo "Restore completed successfully:"
sqlite3 "$DB_FILE" "SELECT count(*) as total_records FROM (
    SELECT 'accounts' as table_name, count(*) as count FROM accounts
    UNION ALL SELECT 'universe', count(*) FROM universe
    UNION ALL SELECT 'trades', count(*) FROM trades
    UNION ALL SELECT 'risk_group', count(*) FROM risk_group
);"

echo "Database restored. You can now restart the server."
```

### Verification and Testing

#### Database Integrity Check
```bash
# Check database integrity
sqlite3 database.db "PRAGMA integrity_check;"

# Expected output: ok
```

#### Quick Data Validation
```bash
# Check table counts
sqlite3 database.db "
SELECT 
    'accounts' as table_name, count(*) as records FROM accounts
UNION ALL SELECT 'universe', count(*) FROM universe  
UNION ALL SELECT 'trades', count(*) FROM trades
UNION ALL SELECT 'risk_group', count(*) FROM risk_group
UNION ALL SELECT 'screener', count(*) FROM screener;
"
```

#### Post-Restore Application Test
```bash
# Start server in test mode
NODE_ENV=test npm start &
SERVER_PID=$!

# Wait for server to start
sleep 5

# Test basic endpoints
curl -f http://localhost:3000/health || echo "Health check failed"

# Stop test server
kill $SERVER_PID
```

## Best Practices

### Backup Frequency
- **Before deployments**: Always
- **Scheduled backups**: Daily at minimum
- **Before schema migrations**: Required
- **Before data imports**: Recommended

### Backup Storage
- **Local**: Keep recent backups in `./backups/` directory
- **Retention**: Keep last 10 local backups automatically
- **External**: Consider copying critical backups to cloud storage
- **Naming**: Use timestamp format: `database_YYYYMMDD_HHMMSS.db`

### Security Considerations
- Backup files contain sensitive data - secure appropriately
- Set proper file permissions: `chmod 600 backups/*.db`
- Consider encryption for backups stored externally
- Regular cleanup of old backup files

### Recovery Scenarios

#### Scenario 1: Deployment Rollback
```bash
# Use most recent pre-deployment backup
./scripts/backup-database.sh  # Current state backup first
cp backups/database_YYYYMMDD_HHMMSS.db database.db
```

#### Scenario 2: Data Corruption
```bash
# Restore from last known good backup
sqlite3 database.db "PRAGMA integrity_check;"  # Confirm corruption
cp backups/database_YYYYMMDD_HHMMSS.db database.db
```

#### Scenario 3: Accidental Data Loss
```bash
# Point-in-time recovery using most recent backup
# Note: SQLite doesn't have point-in-time recovery
# Data loss = time since last backup
```

## Alternative Approaches

### When SQLite3 CLI is Not Available

If `sqlite3` command-line tool is not available, you can still create backups using:

**Simple File Copy (Basic Backup):**
```bash
# Stop server first
./scripts/stop-server.sh

# Create timestamped backup
BACKUP_FILE="backups/database_$(date +%Y%m%d_%H%M%S).db"
mkdir -p backups
cp database.db "$BACKUP_FILE"

echo "Backup created: $BACKUP_FILE"
ls -lh "$BACKUP_FILE"
```

**Using Node.js Script for Integrity Check:**
Create a simple Node.js script to verify database:
```javascript
// scripts/verify-db.js
const Database = require('better-sqlite3');

const dbPath = process.argv[2] || 'database.db';
try {
    const db = new Database(dbPath, { readonly: true });
    const result = db.pragma('integrity_check');
    console.log('Database integrity:', result[0].integrity_check);
    db.close();
} catch (error) {
    console.error('Database verification failed:', error.message);
    process.exit(1);
}
```

**Using Prisma for Database Operations:**
```bash
# Check database schema
pnpm exec prisma db pull --print

# Execute custom SQL (if needed)
pnpm exec prisma db execute --file sql/check-integrity.sql
```

## Troubleshooting

### Common Issues

**Database locked error:**
```bash
# Check for running processes
lsof database.db
# Kill processes and try again
```

**Backup file corrupted:**
```bash
# Check integrity
sqlite3 backup_file.db "PRAGMA integrity_check;"
# Try previous backup if available
```

**Insufficient disk space:**
```bash
# Check available space
df -h .
# Clean up old backups
ls -t backups/database_*.db | tail -n +6 | xargs rm -f
```

**Permission denied:**
```bash
# Fix file permissions
chmod 644 database.db
chmod 600 backups/*.db
```

## Migration Considerations

When schema migrations are involved:

1. **Pre-migration backup** is critical
2. **Test migration** on backup copy first  
3. **Rollback plan** must include schema downgrade
4. **Data validation** after migration completion

See [Schema Migrations Documentation](./notes-on-schema-migrations-if-applied.md) for detailed migration backup procedures.
