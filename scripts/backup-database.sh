#!/bin/bash
set -e

# SQLite Database Backup Script
# Safely backs up the SQLite database with integrity verification

# Configuration
DB_FILE="database.db"
BACKUP_DIR="backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/database_$TIMESTAMP.db"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== SQLite Database Backup Script ===${NC}"

# Ensure backup directory exists
mkdir -p "$BACKUP_DIR"

# Check if database file exists
if [ ! -f "$DB_FILE" ]; then
    echo -e "${RED}ERROR: Database file not found: $DB_FILE${NC}"
    echo "Please check the DATABASE_URL environment variable and ensure the database exists."
    exit 1
fi

# Stop server if running
echo -e "${YELLOW}Checking for running server processes...${NC}"
if pgrep -f "node.*server" > /dev/null; then
    echo -e "${YELLOW}Stopping server processes...${NC}"
    pkill -f "node.*server" || echo -e "${YELLOW}No server processes to stop${NC}"
    sleep 2
else
    echo -e "${GREEN}No server processes running${NC}"
fi

# Check database integrity before backup
echo -e "${YELLOW}Checking database integrity before backup...${NC}"
if ! sqlite3 "$DB_FILE" "PRAGMA integrity_check;" | grep -q "ok"; then
    echo -e "${RED}ERROR: Source database integrity check failed!${NC}"
    echo "The database may be corrupted. Please investigate before backup."
    exit 1
fi
echo -e "${GREEN}Source database integrity check passed${NC}"

# Create backup
echo -e "${YELLOW}Creating backup: $BACKUP_FILE${NC}"
cp "$DB_FILE" "$BACKUP_FILE"

# Verify backup was created successfully
if [ ! -f "$BACKUP_FILE" ]; then
    echo -e "${RED}ERROR: Backup file was not created!${NC}"
    exit 1
fi

# Verify backup integrity
echo -e "${YELLOW}Verifying backup integrity...${NC}"
if ! sqlite3 "$BACKUP_FILE" "PRAGMA integrity_check;" | grep -q "ok"; then
    echo -e "${RED}ERROR: Backup integrity check failed!${NC}"
    echo "The backup file may be corrupted. Removing corrupted backup."
    rm -f "$BACKUP_FILE"
    exit 1
fi
echo -e "${GREEN}Backup integrity check passed${NC}"

# Show backup information
echo -e "${GREEN}Backup completed successfully!${NC}"
echo "Backup file: $BACKUP_FILE"
echo "Size: $(ls -lh "$BACKUP_FILE" | awk '{print $5}')"

# Quick database statistics
echo -e "${YELLOW}Database statistics:${NC}"
sqlite3 "$BACKUP_FILE" "
SELECT 
    'accounts' as table_name, count(*) as records FROM accounts
UNION ALL SELECT 'universe', count(*) FROM universe  
UNION ALL SELECT 'trades', count(*) FROM trades
UNION ALL SELECT 'risk_group', count(*) FROM risk_group
UNION ALL SELECT 'screener', count(*) FROM screener
UNION ALL SELECT 'holidays', count(*) FROM holidays
UNION ALL SELECT 'divDepositType', count(*) FROM divDepositType
UNION ALL SELECT 'divDeposits', count(*) FROM divDeposits;
"

# Cleanup old backups (keep last 10)
echo -e "${YELLOW}Cleaning up old backups (keeping last 10)...${NC}"
ls -t $BACKUP_DIR/database_*.db 2>/dev/null | tail -n +11 | while read file; do
    if [ -f "$file" ]; then
        echo "Removing old backup: $file"
        rm -f "$file"
    fi
done

echo -e "${GREEN}Backup process completed successfully!${NC}"
echo -e "${YELLOW}You can now safely restart the server.${NC}"