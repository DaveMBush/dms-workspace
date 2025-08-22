#!/bin/bash
set -e

# Pre-Deployment Backup Script
# Comprehensive backup script for deployment preparation

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOYMENT_TAG="${1:-$(date +%Y%m%d_%H%M%S)}"
BACKUP_DIR="backups"
DEPLOYMENT_BACKUP_DIR="$BACKUP_DIR/deployments"

echo -e "${BLUE}=== Pre-Deployment Backup Script ===${NC}"
echo -e "${BLUE}Deployment Tag: $DEPLOYMENT_TAG${NC}"

# Create deployment-specific backup directory
mkdir -p "$DEPLOYMENT_BACKUP_DIR"

# Step 1: Run standard backup
echo -e "${YELLOW}Step 1: Creating database backup...${NC}"
"$SCRIPT_DIR/backup-database.sh"

# Get the most recent backup file
LATEST_BACKUP=$(ls -t $BACKUP_DIR/database_*.db | head -n 1)

if [ -z "$LATEST_BACKUP" ]; then
    echo -e "${RED}ERROR: No backup file found after backup operation${NC}"
    exit 1
fi

# Step 2: Create deployment-specific backup
DEPLOYMENT_BACKUP="$DEPLOYMENT_BACKUP_DIR/pre_deployment_${DEPLOYMENT_TAG}.db"
echo -e "${YELLOW}Step 2: Creating deployment-specific backup: $DEPLOYMENT_BACKUP${NC}"
cp "$LATEST_BACKUP" "$DEPLOYMENT_BACKUP"

# Step 3: Verify backup integrity
echo -e "${YELLOW}Step 3: Verifying deployment backup integrity...${NC}"
if ! sqlite3 "$DEPLOYMENT_BACKUP" "PRAGMA integrity_check;" | grep -q "ok"; then
    echo -e "${RED}ERROR: Deployment backup integrity check failed!${NC}"
    exit 1
fi
echo -e "${GREEN}Deployment backup integrity verified${NC}"

# Step 4: Create backup manifest
MANIFEST_FILE="$DEPLOYMENT_BACKUP_DIR/manifest_${DEPLOYMENT_TAG}.txt"
echo -e "${YELLOW}Step 4: Creating backup manifest: $MANIFEST_FILE${NC}"

cat > "$MANIFEST_FILE" << EOF
Deployment Backup Manifest
==========================
Deployment Tag: $DEPLOYMENT_TAG
Created: $(date)
Backup File: $DEPLOYMENT_BACKUP
File Size: $(ls -lh "$DEPLOYMENT_BACKUP" | awk '{print $5}')
SHA256: $(sha256sum "$DEPLOYMENT_BACKUP" | awk '{print $1}')

Database Statistics:
EOF

sqlite3 "$DEPLOYMENT_BACKUP" "
SELECT 
    'accounts' as table_name, count(*) as records FROM accounts
UNION ALL SELECT 'universe', count(*) FROM universe  
UNION ALL SELECT 'trades', count(*) FROM trades
UNION ALL SELECT 'risk_group', count(*) FROM risk_group
UNION ALL SELECT 'screener', count(*) FROM screener
UNION ALL SELECT 'holidays', count(*) FROM holidays
UNION ALL SELECT 'divDepositType', count(*) FROM divDepositType
UNION ALL SELECT 'divDeposits', count(*) FROM divDeposits;
" >> "$MANIFEST_FILE"

echo "" >> "$MANIFEST_FILE"
echo "Environment Information:" >> "$MANIFEST_FILE"
echo "Current Branch: $(git branch --show-current 2>/dev/null || echo 'Unknown')" >> "$MANIFEST_FILE"
echo "Last Commit: $(git log -1 --pretty=format:'%h - %s (%an, %ad)' --date=short 2>/dev/null || echo 'Unknown')" >> "$MANIFEST_FILE"
echo "Working Directory: $(pwd)" >> "$MANIFEST_FILE"
echo "Database URL: ${DATABASE_URL:-'Not set'}" >> "$MANIFEST_FILE"

# Step 5: Test backup restore (dry run)
echo -e "${YELLOW}Step 5: Testing backup restore (dry run)...${NC}"
TEST_DB="test_restore_$(date +%s).db"
cp "$DEPLOYMENT_BACKUP" "$TEST_DB"

if sqlite3 "$TEST_DB" "PRAGMA integrity_check;" | grep -q "ok"; then
    echo -e "${GREEN}Backup restore test successful${NC}"
    rm -f "$TEST_DB"
else
    echo -e "${RED}ERROR: Backup restore test failed!${NC}"
    rm -f "$TEST_DB"
    exit 1
fi

# Step 6: Summary
echo -e "${GREEN}=== Pre-Deployment Backup Complete ===${NC}"
echo -e "${GREEN}✓ Database backup created: $LATEST_BACKUP${NC}"
echo -e "${GREEN}✓ Deployment backup created: $DEPLOYMENT_BACKUP${NC}"
echo -e "${GREEN}✓ Backup integrity verified${NC}"
echo -e "${GREEN}✓ Backup manifest created: $MANIFEST_FILE${NC}"
echo -e "${GREEN}✓ Restore test successful${NC}"

echo ""
echo -e "${BLUE}Deployment backup summary:${NC}"
echo "Backup file: $DEPLOYMENT_BACKUP"
echo "File size: $(ls -lh "$DEPLOYMENT_BACKUP" | awk '{print $5}')"
echo "SHA256: $(sha256sum "$DEPLOYMENT_BACKUP" | awk '{print $1}')"

echo ""
echo -e "${YELLOW}To restore this backup after deployment if needed:${NC}"
echo "$SCRIPT_DIR/restore-database.sh $DEPLOYMENT_BACKUP"

# Clean up old deployment backups (keep last 5)
echo -e "${YELLOW}Cleaning up old deployment backups (keeping last 5)...${NC}"
ls -t $DEPLOYMENT_BACKUP_DIR/pre_deployment_*.db 2>/dev/null | tail -n +6 | while read file; do
    if [ -f "$file" ]; then
        echo "Removing old deployment backup: $file"
        rm -f "$file"
        # Also remove corresponding manifest
        MANIFEST_NAME=$(basename "$file" .db | sed 's/pre_deployment_/manifest_/')
        if [ -f "$DEPLOYMENT_BACKUP_DIR/${MANIFEST_NAME}.txt" ]; then
            rm -f "$DEPLOYMENT_BACKUP_DIR/${MANIFEST_NAME}.txt"
        fi
    fi
done

echo -e "${GREEN}Pre-deployment backup process completed successfully!${NC}"
echo -e "${YELLOW}You may now proceed with the deployment.${NC}"