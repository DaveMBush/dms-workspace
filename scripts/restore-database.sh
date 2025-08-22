#!/bin/bash
set -e

# SQLite Database Restore Script
# Safely restores the SQLite database from backup with verification

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DB_FILE="database.db"
BACKUP_DIR="backups"

echo -e "${GREEN}=== SQLite Database Restore Script ===${NC}"

# Function to show usage
show_usage() {
    echo "Usage: $0 <backup_file>"
    echo ""
    echo "Examples:"
    echo "  $0 backups/database_20231215_143022.db"
    echo "  $0 database_20231215_143022.db  # Assumes backups/ directory"
    echo ""
    echo "Available backups:"
    if ls $BACKUP_DIR/database_*.db 1> /dev/null 2>&1; then
        ls -la $BACKUP_DIR/database_*.db | awk '{print "  " $9 " (" $5 ", " $6 " " $7 " " $8 ")"}'
    else
        echo "  No backup files found in $BACKUP_DIR/"
    fi
}

# Check if backup file parameter is provided
if [ -z "$1" ]; then
    echo -e "${RED}ERROR: Backup file parameter is required${NC}"
    echo ""
    show_usage
    exit 1
fi

BACKUP_FILE="$1"

# Handle relative path (assume backups directory)
if [ ! -f "$BACKUP_FILE" ] && [ -f "$BACKUP_DIR/$BACKUP_FILE" ]; then
    BACKUP_FILE="$BACKUP_DIR/$BACKUP_FILE"
fi

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo -e "${RED}ERROR: Backup file not found: $BACKUP_FILE${NC}"
    echo ""
    show_usage
    exit 1
fi

echo -e "${BLUE}Restore source: $BACKUP_FILE${NC}"

# Verify backup file integrity before proceeding
echo -e "${YELLOW}Verifying backup file integrity...${NC}"
if ! sqlite3 "$BACKUP_FILE" "PRAGMA integrity_check;" | grep -q "ok"; then
    echo -e "${RED}ERROR: Backup file is corrupted!${NC}"
    echo "Cannot restore from a corrupted backup. Please use a different backup file."
    exit 1
fi
echo -e "${GREEN}Backup file integrity check passed${NC}"

# Show backup file statistics
echo -e "${YELLOW}Backup file statistics:${NC}"
echo "File size: $(ls -lh "$BACKUP_FILE" | awk '{print $5}')"
echo "Modified: $(ls -l "$BACKUP_FILE" | awk '{print $6, $7, $8}')"

echo -e "${YELLOW}Database contents:${NC}"
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

# Confirmation prompt
echo ""
echo -e "${YELLOW}WARNING: This will replace the current database file${NC}"
if [ -f "$DB_FILE" ]; then
    echo -e "${YELLOW}Current database: $DB_FILE ($(ls -lh "$DB_FILE" | awk '{print $5}'))${NC}"
fi
echo ""
read -p "Are you sure you want to continue? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Restore cancelled by user${NC}"
    exit 0
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

# Create safety backup of current database if it exists and isn't corrupted
if [ -f "$DB_FILE" ]; then
    SAFETY_BACKUP="database_pre_restore_$(date +%Y%m%d_%H%M%S).db"
    echo -e "${YELLOW}Creating safety backup of current database: $SAFETY_BACKUP${NC}"
    
    # Check if current database is readable
    if sqlite3 "$DB_FILE" "PRAGMA integrity_check;" | grep -q "ok" 2>/dev/null; then
        cp "$DB_FILE" "$SAFETY_BACKUP"
        echo -e "${GREEN}Safety backup created: $SAFETY_BACKUP${NC}"
    else
        echo -e "${YELLOW}Current database appears corrupted, skipping safety backup${NC}"
    fi
fi

# Perform the restore
echo -e "${YELLOW}Restoring database from backup...${NC}"
cp "$BACKUP_FILE" "$DB_FILE"

# Verify restored database
echo -e "${YELLOW}Verifying restored database...${NC}"
if ! sqlite3 "$DB_FILE" "PRAGMA integrity_check;" | grep -q "ok"; then
    echo -e "${RED}ERROR: Restored database is corrupted!${NC}"
    
    # Attempt to restore from safety backup if it exists
    if [ -f "$SAFETY_BACKUP" ]; then
        echo -e "${YELLOW}Attempting to restore from safety backup...${NC}"
        cp "$SAFETY_BACKUP" "$DB_FILE"
        if sqlite3 "$DB_FILE" "PRAGMA integrity_check;" | grep -q "ok"; then
            echo -e "${GREEN}Successfully restored from safety backup${NC}"
        else
            echo -e "${RED}Safety backup is also corrupted!${NC}"
        fi
    fi
    
    exit 1
fi
echo -e "${GREEN}Restored database integrity check passed${NC}"

# Show restored database information
echo -e "${GREEN}Database restored successfully!${NC}"
echo "Restored database: $DB_FILE"
echo "Size: $(ls -lh "$DB_FILE" | awk '{print $5}')"

echo -e "${YELLOW}Restored database statistics:${NC}"
sqlite3 "$DB_FILE" "
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

echo ""
echo -e "${GREEN}Restore completed successfully!${NC}"
echo -e "${YELLOW}You can now restart the server.${NC}"

# Clean up safety backup if restore was successful
if [ -f "$SAFETY_BACKUP" ]; then
    echo ""
    read -p "Remove safety backup file $SAFETY_BACKUP? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        rm -f "$SAFETY_BACKUP"
        echo -e "${GREEN}Safety backup removed${NC}"
    else
        echo -e "${YELLOW}Safety backup preserved: $SAFETY_BACKUP${NC}"
    fi
fi