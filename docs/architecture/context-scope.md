# Context & scope

- **Project type**: Brownfield with UI (Angular 20 + PrimeNG + Tailwind)
- **Backend**: Fastify + Prisma with multi-database support
- **Database**: Environment-specific (SQLite for dev, PostgreSQL for Docker/prod)
- **Authentication**: Environment-specific (Mock for dev/Docker, AWS Cognito for prod)
- **Goal**: Replace manual symbol entry with a flow that derives the tradable
  Universe from the curated Screener results where three booleans are true.

## System Overview

DMS Workspace is a **Risk Management System** for financial portfolio management that tracks investment portfolios, manages universes of tradable Closed End Funds (CEFs), and provides risk group analysis with real-time data synchronization.

## Environment Configurations

### **Development Environment** (Port 4200)

- **Database**: SQLite (`file:./database.db`)
- **Authentication**: Mock authentication (`useMockAuth: true`)
- **API**: Proxied to localhost:3000
- **Environment File**: `apps/dms/src/environments/environment.ts`

### **Docker Local Environment** (Port 8080)

- **Database**: PostgreSQL via docker-compose
- **Authentication**: Mock authentication (`useMockAuth: true`)
- **API**: Nginx proxy to backend container
- **Environment File**: `apps/dms/src/environments/environment.docker.ts`

### **Production Environment**

- **Database**: PostgreSQL (AWS RDS or similar)
- **Authentication**: AWS Cognito (`useMockAuth: false`)
- **API**: Production API endpoints
- **Environment File**: `apps/dms/src/environments/environment.prod.ts`
