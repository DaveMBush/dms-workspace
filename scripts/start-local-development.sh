#!/bin/bash

# Local Development Startup Script for RMS Workspace
# This script starts the complete local development environment with LocalStack

set -e

echo "🚀 Starting RMS Local Development Environment..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Start LocalStack and PostgreSQL services
echo "📦 Starting LocalStack and PostgreSQL services..."
docker-compose -f docker-compose.local.yml up -d postgres localstack

# Wait for LocalStack to be ready
echo "⏳ Waiting for LocalStack to initialize..."
timeout 120 bash -c 'until curl -s http://localhost:4566/health | grep -q "running"; do echo "Waiting for LocalStack..."; sleep 5; done'

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
timeout 60 bash -c 'until docker exec rms-postgres pg_isready -U rms_user -d rms_local; do echo "Waiting for PostgreSQL..."; sleep 3; done'

# Set up environment for local development
export NODE_ENV=local
export USE_LOCAL_SERVICES=true
export DATABASE_URL="postgresql://rms_user:rms_password@localhost:5432/rms_local?schema=public"
export AWS_REGION=us-east-1
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
export AWS_ENDPOINT_URL=http://localhost:4566

echo "🔧 Environment configured for local development"
echo "📋 Local Services Status:"
echo "   LocalStack: http://localhost:4566"
echo "   PostgreSQL: localhost:5432"
echo "   PgAdmin: http://localhost:8080 (optional, use --profile admin to start)"
echo ""
echo "🔑 Test User Credentials:"
echo "   Email: testuser@example.com"
echo "   Password: TestPass123!"
echo ""
echo "✅ Local development environment is ready!"
echo ""
echo "📖 Next steps:"
echo "   1. Run 'pnpm nx run server:serve' to start the backend"
echo "   2. Run 'pnpm nx run rms:serve' to start the frontend"
echo "   3. Visit http://localhost:4200 to access the application"
echo ""
echo "🛠️  Useful commands:"
echo "   Stop services: docker-compose -f docker-compose.local.yml down"
echo "   View logs: docker-compose -f docker-compose.local.yml logs -f"
echo "   Reset data: docker-compose -f docker-compose.local.yml down -v"