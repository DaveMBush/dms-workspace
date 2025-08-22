# Database Backup and Server Management Scripts

This directory contains scripts for database backup, restore, and server management operations.

## Scripts Overview

### Database Backup & Restore

- **`backup-database.sh`** - Creates timestamped backups with integrity verification
- **`restore-database.sh`** - Restores database from backup with safety checks
- **`pre-deployment-backup.sh`** - Comprehensive pre-deployment backup with manifest

### Server Management

- **`start-server.sh`** - Starts the Node.js server
- **`stop-server.sh`** - Gracefully stops server processes

## Usage Examples

### Basic Backup
```bash
./scripts/backup-database.sh
```

### Pre-Deployment Backup
```bash
# With automatic timestamp
./scripts/pre-deployment-backup.sh

# With custom deployment tag
./scripts/pre-deployment-backup.sh "v1.2.0"
```

### Restore Database
```bash
# List available backups
./scripts/restore-database.sh

# Restore from specific backup
./scripts/restore-database.sh backups/database_20231215_143022.db
```

### Server Control
```bash
# Stop server
./scripts/stop-server.sh

# Start server
./scripts/start-server.sh
```

## Backup Directory Structure

```
backups/
├── database_YYYYMMDD_HHMMSS.db     # Regular backups
├── deployments/
│   ├── pre_deployment_TAG.db       # Deployment-specific backups
│   └── manifest_TAG.txt            # Backup manifests
└── database_pre_restore_*.db       # Safety backups from restore operations
```

## Safety Features

- **Integrity Checks**: All backups are verified before and after creation
- **Safety Backups**: Restore operations create safety backups of current database
- **Server Management**: Scripts safely stop/start server processes
- **Cleanup**: Automatic cleanup of old backups (configurable retention)
- **Colored Output**: Clear visual feedback for all operations

## Requirements

- **SQLite3 command-line tool** (for integrity checks)
  - Install: `sudo apt-get install sqlite3` (Ubuntu/Debian)
  - Install: `brew install sqlite3` (macOS)
  - Without sqlite3: Scripts will do basic file operations but skip integrity checks
- **Bash shell** (Linux/macOS/WSL)
- **File permissions** for database files (read/write access)
- **Node.js server processes** (for server management)

## Error Handling

All scripts include comprehensive error handling and will:
- Exit with error codes on failure
- Create safety backups when appropriate
- Provide clear error messages
- Verify operations before proceeding

## Best Practices

1. **Always backup before deployments** - Use `pre-deployment-backup.sh`
2. **Test backups regularly** - Verify restore procedures work
3. **Monitor disk space** - Backups consume storage
4. **Secure backup files** - Set appropriate permissions (600/640)
5. **Document restore procedures** - Keep team informed of processes