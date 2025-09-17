#!/bin/bash

# RMS Local Development Environment Stop Script
# This script stops the Docker Compose services gracefully

set -e

echo "🛑 Stopping RMS Local Development Environment"
echo "=============================================="

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_status "Stopping Docker Compose services..."
docker-compose -f docker-compose.local.yml down

print_status "Removing unused Docker volumes (optional)..."
read -p "Do you want to remove database volumes? This will delete all local data. (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    docker-compose -f docker-compose.local.yml down -v
    print_status "Database volumes removed."
else
    print_status "Database volumes preserved."
fi

print_success "Local development environment stopped!"
echo ""
echo "📋 To restart the environment, run:"
echo "   ./scripts/start-local-dev.sh"