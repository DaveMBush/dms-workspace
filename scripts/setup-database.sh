#!/bin/bash

# Database setup script for RMS workspace
# This script helps switch between SQLite and PostgreSQL configurations

set -e

DB_TYPE="${1:-sqlite}"

case "$DB_TYPE" in
  "sqlite")
    echo "Setting up for SQLite development..."
    (
      cd prisma
      if [ -d migrations ]; then
        echo "Backing up existing migrations to migrations-backup/"
        rm -rf migrations-backup
        mv migrations migrations-backup
      fi
      cp -r migrations-sqlite migrations
      echo "✅ Copied SQLite migrations to migrations/"
    )
    echo "Use: DATABASE_URL=\"file:./database.db\" for SQLite operations"
    ;;

  "postgresql")
    echo "Setting up for PostgreSQL development..."
    (
      cd prisma
      if [ -d migrations ]; then
        echo "Backing up existing migrations to migrations-backup/"
        rm -rf migrations-backup
        mv migrations migrations-backup
      fi
      cp -r migrations-postgresql migrations
      echo "✅ Copied PostgreSQL migrations to migrations/"
    )
    echo "Use PostgreSQL DATABASE_URL for operations"
    ;;

  *)
    echo "Usage: $0 [sqlite|postgresql]"
    echo ""
    echo "Examples:"
    echo "  $0 sqlite      # Setup for SQLite development (default)"
    echo "  $0 postgresql  # Setup for PostgreSQL development"
    echo ""
    echo "Current active migrations:"
    if [ -d prisma/migrations ]; then
      echo "  prisma/migrations/ (copied from source)"
    else
      echo "  No migrations directory found"
    fi
    exit 1
    ;;
esac

echo ""
echo "Migration directories:"
echo "  prisma/migrations-sqlite/     - SQLite migrations (source)"
echo "  prisma/migrations-postgresql/ - PostgreSQL migrations (source)"
# Check for migration directories (looking for timestamp directories like 20250101_...)
MIGRATION_COUNT=$(find prisma/migrations -type d -name '2*' 2>/dev/null | wc -l)
if [ -d prisma/migrations ] && [ "$MIGRATION_COUNT" -gt 0 ]; then
  echo "  prisma/migrations/            - Active migrations (copied from source) - $MIGRATION_COUNT migrations"
else
  echo "  prisma/migrations/            - No active migrations"
fi