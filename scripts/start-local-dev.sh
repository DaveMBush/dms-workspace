#!/bin/bash

# DMS Local Deployment Environment Startup Script
# This script starts the full containerized stack locally (PostgreSQL + LocalStack + Backend)

set -e

echo "🚀 Starting DMS Local Deployment Environment"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is running
if ! docker info &> /dev/null; then
    print_error "Docker is not running. Please start Docker first."
    exit 1
fi

# Check if Docker Compose is available
if ! command -v docker-compose &> /dev/null; then
    print_error "docker-compose is not installed. Please install Docker Compose."
    exit 1
fi

print_status "Stopping any existing containers..."
docker-compose -f docker-compose.local.yml down || true

print_status "Building and starting all services (LocalStack, PostgreSQL, Backend)..."
docker-compose -f docker-compose.local.yml up -d --build

print_status "Waiting for services to be healthy..."
echo "⏳ LocalStack initialization may take 60-90 seconds on first run..."

# Wait for PostgreSQL to be ready
until docker-compose -f docker-compose.local.yml exec -T postgres pg_isready -U dms_user -d dms_local &> /dev/null; do
    echo "Waiting for PostgreSQL..."
    sleep 2
done
print_success "PostgreSQL is ready!"

# Wait for LocalStack to be ready
until curl -s http://localhost:4566/health | grep -q '"s3": "available"' &> /dev/null; do
    echo "Waiting for LocalStack..."
    sleep 3
done
print_success "LocalStack is ready!"

# Wait for backend to be ready
print_status "Waiting for backend application to be ready..."
until curl -s http://localhost:3000/health &> /dev/null; do
    echo "Waiting for DMS Backend..."
    sleep 5
done
print_success "DMS Backend is ready!"

print_success "Local deployment environment is ready!"
echo ""
echo "📋 Service Information:"
echo "   🚀 DMS Backend: http://localhost:3000"
echo "   💚 Health Check: http://localhost:3000/health"
echo "   🐘 PostgreSQL: localhost:5432"
echo "   📊 PgAdmin: http://localhost:8080 (admin@dms.local / admin)"
echo "   ☁️  LocalStack: http://localhost:4566"
echo "   📝 LocalStack Dashboard: https://app.localstack.cloud"
echo ""
echo "🔧 Available commands:"
echo "   View logs: docker-compose -f docker-compose.local.yml logs -f"
echo "   View backend logs: docker-compose -f docker-compose.local.yml logs -f dms-backend"
echo "   Stop services: docker-compose -f docker-compose.local.yml down"
echo "   Rebuild and restart: docker-compose -f docker-compose.local.yml up -d --build"
echo ""
echo "🎉 Full stack is running in containers!"
