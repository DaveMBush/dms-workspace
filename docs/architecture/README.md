# RMS Architecture Documentation

This document provides a comprehensive overview of the RMS (Risk Management System) architecture, including system components, data flows, and architectural decisions.

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture Diagrams](#architecture-diagrams)
3. [Component Details](#component-details)
4. [Data Flow](#data-flow)
5. [Security Architecture](#security-architecture)
6. [Infrastructure Components](#infrastructure-components)
7. [Technology Stack](#technology-stack)
8. [Architecture Decision Records (ADRs)](#architecture-decision-records-adrs)
9. [Scalability and Performance](#scalability-and-performance)
10. [Monitoring and Observability](#monitoring-and-observability)

## System Overview

RMS is a cloud-native risk management application built on AWS using modern microservices architecture principles. The system follows a three-tier architecture pattern with clear separation between presentation, application, and data layers.

### High-Level Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│                 │    │                  │    │                 │
│   Frontend      │    │   Backend API    │    │   Database      │
│   (Angular 20)  │────│   (Fastify)      │────│   (PostgreSQL)  │
│   CloudFront+S3 │    │   ECS Fargate    │    │   Amazon RDS    │
│                 │    │                  │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### Key Characteristics

- **Cloud-Native**: Designed for AWS cloud with managed services
- **Serverless-First**: Uses managed services to reduce operational overhead
- **Microservices**: Modular architecture with loosely coupled components
- **API-First**: RESTful API design with OpenAPI specification
- **Event-Driven**: Asynchronous processing for scalability
- **Infrastructure as Code**: Everything managed through Terraform
- **Security by Design**: Multi-layered security approach

## Architecture Diagrams

### Network Architecture

```
Internet Gateway
       │
   ┌───▼────┐
   │  ALB   │ (Application Load Balancer)
   └────────┘
       │
   ┌───▼────┐
   │  VPC   │ (Virtual Private Cloud)
   └────────┘
       │
   ┌───▼────────────────────────┐
   │     Public Subnets         │
   │  ┌─────────┐ ┌─────────┐  │
   │  │  AZ-1a  │ │  AZ-1b  │  │
   │  │   ALB   │ │   ALB   │  │
   │  └─────────┘ └─────────┘  │
   └────────────────────────────┘
   ┌───▼────────────────────────┐
   │    Private Subnets         │
   │  ┌─────────┐ ┌─────────┐  │
   │  │  AZ-1a  │ │  AZ-1b  │  │
   │  │   ECS   │ │   ECS   │  │
   │  └─────────┘ └─────────┘  │
   └────────────────────────────┘
   ┌───▼────────────────────────┐
   │     Data Subnets           │
   │  ┌─────────┐ ┌─────────┐  │
   │  │  AZ-1a  │ │  AZ-1b  │  │
   │  │   RDS   │ │   RDS   │  │
   │  └─────────┘ └─────────┘  │
   └────────────────────────────┘
```

### Application Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Users/Clients                        │
└─────────────────────┬───────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────┐
│                 Route53 DNS                             │
└─────────────────────┬───────────────────────────────────┘
                      │
     ┌────────────────┼────────────────┐
     │                │                │
┌────▼────┐      ┌────▼────┐      ┌───▼────┐
│CloudFront│      │   ALB   │      │  WAF   │
│   CDN    │      │   LB    │      │Security│
└────┬────┘      └────┬────┘      └────────┘
     │                │
┌────▼────┐      ┌────▼────────────────────┐
│    S3   │      │      ECS Cluster        │
│Frontend │      │  ┌─────────────────┐    │
│ Assets  │      │  │   ECS Service   │    │
└─────────┘      │  │ ┌─────────────┐ │    │
                 │  │ │   Task 1    │ │    │
                 │  │ │  Container  │ │    │
                 │  │ └─────────────┘ │    │
                 │  │ ┌─────────────┐ │    │
                 │  │ │   Task 2    │ │    │
                 │  │ │  Container  │ │    │
                 │  │ └─────────────┘ │    │
                 │  └─────────────────┘    │
                 └──────────┬──────────────┘
                            │
                   ┌────────▼────────┐
                   │       RDS       │
                   │   PostgreSQL    │
                   │   Multi-AZ      │
                   └─────────────────┘
```

### Data Flow Architecture

```
┌─────────┐    HTTP/S     ┌─────────────┐
│ Browser │────────────────→│ CloudFront  │
│         │←───────────────│    CDN      │
└─────────┘    Static      └─────────────┘
               Assets               │
                                   │ Cache Miss
                                   ▼
                            ┌─────────────┐
                            │     S3      │
                            │   Bucket    │
                            └─────────────┘

┌─────────┐    API Calls   ┌─────────────┐
│Frontend │────────────────→│    ALB      │
│  SPA    │←───────────────│Load Balancer│
└─────────┘    JSON        └──────┬──────┘
                                  │
                                  ▼
                           ┌─────────────┐    ┌─────────────┐
                           │     ECS     │────→│ CloudWatch  │
                           │   Fargate   │    │   Logs      │
                           │             │    └─────────────┘
                           └──────┬──────┘
                                  │ SQL Queries
                                  ▼
                           ┌─────────────┐    ┌─────────────┐
                           │     RDS     │────→│   Backup    │
                           │ PostgreSQL  │    │    S3       │
                           └─────────────┘    └─────────────┘
```

## Component Details

### Frontend (Angular 20 SPA)

**Location**: `apps/rms/`
**Deployment**: CloudFront + S3
**Key Features**:

- Angular 20 with standalone components
- PrimeNG UI components with TailwindCSS
- Signal-based state management
- Lazy loading and code splitting
- Progressive Web App (PWA) capabilities

**Build Process**:

1. TypeScript compilation
2. Angular optimization and bundling
3. Asset optimization and minification
4. Upload to S3 bucket
5. CloudFront cache invalidation

### Backend API (Node.js Fastify)

**Location**: `apps/server/`
**Deployment**: ECS Fargate
**Key Features**:

- Fastify framework for high performance
- TypeScript with strict mode
- OpenAPI/Swagger documentation
- Request validation and serialization
- Structured logging with correlation IDs
- Health checks and monitoring endpoints

**Container Configuration**:

- Base Image: `node:22-alpine`
- CPU: 256-1024 units (configurable)
- Memory: 512-2048 MB (configurable)
- Port: 3000 (internal)

### Database (PostgreSQL on RDS)

**Configuration**:

- Engine: PostgreSQL 15+
- Instance Class: t3.micro (dev) to t3.large (prod)
- Storage: 20GB-500GB with auto-scaling
- Multi-AZ: Enabled in production
- Backup Retention: 7-30 days
- Encryption: At rest and in transit

**Schema Management**:

- Prisma ORM for database operations
- Database migrations via Prisma
- Connection pooling enabled
- Read replicas for read-heavy workloads (future)

## Data Flow

### Request Flow

1. **User Request**: Browser sends request to Route53
2. **DNS Resolution**: Route53 resolves to CloudFront or ALB
3. **Static Assets**: CloudFront serves cached assets from S3
4. **API Requests**: ALB routes API calls to healthy ECS tasks
5. **Application Processing**: Fastify processes request with business logic
6. **Database Query**: Prisma executes PostgreSQL queries
7. **Response**: JSON response sent back through the chain

### Monitoring Flow

1. **Application Metrics**: ECS tasks send metrics to CloudWatch
2. **Log Aggregation**: Structured logs sent to CloudWatch Logs
3. **Tracing**: X-Ray collects distributed traces
4. **Alerting**: CloudWatch Alarms trigger SNS notifications
5. **Dashboard**: CloudWatch Dashboard displays key metrics

## Security Architecture

### Network Security

- **VPC**: Isolated network environment
- **Subnets**: Multi-tier subnet architecture
  - Public: ALB and NAT Gateway
  - Private: ECS tasks
  - Data: RDS instances
- **Security Groups**: Principle of least privilege
- **NACLs**: Additional network-level filtering
- **WAF**: Web Application Firewall protection

### Application Security

- **Authentication**: JWT-based authentication
- **Authorization**: Role-based access control (RBAC)
- **Input Validation**: Comprehensive request validation
- **SQL Injection**: Parameterized queries via Prisma
- **XSS Protection**: Content Security Policy (CSP)
- **HTTPS**: TLS 1.2+ encryption for all traffic

### Data Security

- **Encryption at Rest**: RDS and S3 encryption
- **Encryption in Transit**: TLS for all communications
- **Secret Management**: AWS Systems Manager Parameter Store
- **Backup Encryption**: Encrypted backups and snapshots
- **Access Logging**: CloudTrail for audit trails

## Infrastructure Components

### Compute Layer

| Component        | Service                   | Purpose                                  |
| ---------------- | ------------------------- | ---------------------------------------- |
| Frontend Hosting | S3 + CloudFront           | Static asset delivery                    |
| API Hosting      | ECS Fargate               | Containerized application runtime        |
| Load Balancing   | Application Load Balancer | Traffic distribution and SSL termination |

### Data Layer

| Component        | Service           | Purpose                                  |
| ---------------- | ----------------- | ---------------------------------------- |
| Primary Database | RDS PostgreSQL    | Transactional data storage               |
| Object Storage   | S3                | Static assets and backups                |
| Cache Layer      | ElastiCache Redis | Session and application caching (future) |

### Networking Layer

| Component | Service               | Purpose                 |
| --------- | --------------------- | ----------------------- |
| DNS       | Route53               | Domain name resolution  |
| CDN       | CloudFront            | Global content delivery |
| VPC       | Virtual Private Cloud | Network isolation       |
| Security  | WAF + Security Groups | Traffic filtering       |

### Operations Layer

| Component     | Service         | Purpose                     |
| ------------- | --------------- | --------------------------- |
| Monitoring    | CloudWatch      | Metrics and alerting        |
| Logging       | CloudWatch Logs | Centralized log aggregation |
| Tracing       | X-Ray           | Distributed request tracing |
| Notifications | SNS             | Alert delivery              |

## Technology Stack

### Frontend Stack

| Layer            | Technology      | Version  | Purpose               |
| ---------------- | --------------- | -------- | --------------------- |
| Framework        | Angular         | 20.x     | UI framework          |
| UI Library       | PrimeNG         | 20.x     | Component library     |
| Styling          | TailwindCSS     | 3.x      | Utility-first CSS     |
| State Management | Angular Signals | Built-in | Reactive state        |
| Build Tool       | Angular CLI     | 20.x     | Build and development |
| Package Manager  | pnpm            | 8.x      | Dependency management |

### Backend Stack

| Layer      | Technology  | Version | Purpose              |
| ---------- | ----------- | ------- | -------------------- |
| Runtime    | Node.js     | 22.x    | JavaScript runtime   |
| Framework  | Fastify     | 4.x     | Web framework        |
| Language   | TypeScript  | 5.x     | Type-safe JavaScript |
| ORM        | Prisma      | 5.x     | Database toolkit     |
| Validation | JSON Schema | 7.x     | Request validation   |
| Testing    | Vitest      | 3.x     | Testing framework    |

### Infrastructure Stack

| Layer            | Technology    | Purpose                 |
| ---------------- | ------------- | ----------------------- |
| Cloud Provider   | AWS           | Cloud infrastructure    |
| IaC              | Terraform     | Infrastructure as Code  |
| Containerization | Docker        | Application packaging   |
| Orchestration    | ECS Fargate   | Container orchestration |
| Database         | PostgreSQL 15 | Relational database     |
| Monitoring       | CloudWatch    | Observability platform  |

## Architecture Decision Records (ADRs)

### ADR-001: Container Orchestration Platform

**Status**: Accepted  
**Date**: 2024-08-30  
**Deciders**: DevOps Team, Architecture Committee

**Context**: Need container orchestration for backend deployment with requirements for simplicity, cost-effectiveness, and AWS integration.

**Decision**: Use AWS ECS Fargate instead of Amazon EKS

**Rationale**:

- **Simplicity**: ECS has lower learning curve and operational complexity
- **Cost**: No control plane costs, pay only for running tasks
- **Integration**: Native AWS service integration
- **Maintenance**: Fully managed infrastructure
- **Time to Market**: Faster deployment and setup

**Consequences**:

- **Positive**:
  - Reduced operational overhead
  - Lower total cost of ownership
  - Faster time to production
  - Native AWS service integration
- **Negative**:
  - Vendor lock-in to AWS
  - Less flexibility than Kubernetes
  - Limited ecosystem compared to K8s

**Alternatives Considered**:

- Amazon EKS: More complex, higher costs
- EC2 with Docker Compose: Manual scaling, no orchestration
- AWS Lambda: Not suitable for persistent connections

### ADR-002: Database Selection

**Status**: Accepted  
**Date**: 2024-08-15  
**Deciders**: Backend Team, DBA

**Context**: Need robust relational database for risk management data with ACID properties, complex queries, and reporting capabilities.

**Decision**: Use PostgreSQL on Amazon RDS

**Rationale**:

- **ACID Compliance**: Strong consistency for financial data
- **Complex Queries**: Advanced SQL features and JSON support
- **Performance**: Excellent query optimization and indexing
- **Ecosystem**: Strong ORM support (Prisma)
- **Managed Service**: RDS handles maintenance and backups

**Consequences**:

- **Positive**:
  - Strong data consistency guarantees
  - Rich feature set for complex queries
  - Excellent ecosystem support
  - Managed backups and maintenance
- **Negative**:
  - Higher cost than DynamoDB for simple queries
  - Requires careful schema design
  - Vertical scaling limitations

### ADR-003: Frontend State Management

**Status**: Accepted  
**Date**: 2024-09-01  
**Deciders**: Frontend Team

**Context**: Need reactive state management for Angular 20 application with real-time updates and complex component interactions.

**Decision**: Use Angular Signals instead of NgRx

**Rationale**:

- **Native Solution**: Built into Angular 20
- **Performance**: Better performance with fine-grained reactivity
- **Simplicity**: Less boilerplate than NgRx
- **Bundle Size**: No additional dependencies
- **Learning Curve**: Easier for team to adopt

**Consequences**:

- **Positive**:
  - Better performance with fine-grained updates
  - Reduced complexity and boilerplate
  - Native Angular integration
  - Smaller bundle size
- **Negative**:
  - Less mature ecosystem than NgRx
  - No time-travel debugging
  - Limited complex state management patterns

### ADR-004: API Documentation Strategy

**Status**: Accepted  
**Date**: 2024-09-15  
**Deciders**: Backend Team, API Consumers

**Context**: Need comprehensive API documentation for internal teams and potential external integrations.

**Decision**: Use OpenAPI 3.0 with Fastify Swagger plugin

**Rationale**:

- **Standard**: OpenAPI is industry standard
- **Integration**: Native Fastify support
- **Automation**: Auto-generated from code
- **Tooling**: Rich ecosystem for testing and client generation
- **Validation**: Request/response validation

**Consequences**:

- **Positive**:
  - Standardized API documentation
  - Automated documentation generation
  - Built-in request validation
  - Client code generation capabilities
- **Negative**:
  - Requires discipline to maintain schemas
  - Additional complexity in route definitions

## Scalability and Performance

### Horizontal Scaling

**Frontend**:

- CloudFront global edge locations
- S3 scales automatically
- No server-side rendering required

**Backend**:

- ECS auto-scaling based on CPU/memory
- Application Load Balancer distributes traffic
- Stateless application design

**Database**:

- Connection pooling via Prisma
- Read replicas for read-heavy workloads (planned)
- RDS storage auto-scaling

### Performance Optimizations

**Frontend**:

- Lazy loading of feature modules
- OnPush change detection strategy
- Tree shaking and dead code elimination
- Compression and minification
- CDN caching with appropriate headers

**Backend**:

- Fastify's high-performance architecture
- JSON schema-based validation
- Database query optimization
- Connection pooling
- Response caching (planned)

**Database**:

- Proper indexing strategy
- Query optimization with EXPLAIN plans
- Connection pooling
- Prepared statements via Prisma

## Monitoring and Observability

### Metrics Collection

**Application Metrics**:

- Request latency and throughput
- Error rates and status codes
- Business metrics (user actions, transactions)
- Custom metrics via CloudWatch

**Infrastructure Metrics**:

- CPU and memory utilization
- Network I/O and disk usage
- Database connections and performance
- Load balancer metrics

### Logging Strategy

**Structured Logging**:

- JSON format for all logs
- Correlation IDs for request tracing
- Consistent log levels and formats
- Centralized aggregation in CloudWatch Logs

**Log Categories**:

- Application logs (info, warn, error)
- Access logs (ALB and CloudFront)
- Security logs (authentication, authorization)
- Performance logs (timing and resource usage)

### Distributed Tracing

**X-Ray Integration**:

- Request tracing across services
- Database query performance
- External API call tracking
- Error and exception tracking

### Alerting

**Critical Alerts**:

- Service unavailability
- High error rates
- Database connectivity issues
- Security incidents

**Warning Alerts**:

- High resource utilization
- Slow response times
- Unusual traffic patterns
- Cost threshold breaches

## Future Architecture Considerations

### Planned Enhancements

1. **Microservices Evolution**: Extract domain services as separate microservices
2. **Caching Layer**: Add Redis for session and application caching
3. **Event Streaming**: Implement event-driven architecture with EventBridge
4. **Read Replicas**: Add read replicas for improved read performance
5. **Multi-Region**: Expand to multi-region deployment for disaster recovery

### Technology Evolution

1. **Serverless Functions**: Evaluate Lambda for background processing
2. **GraphQL**: Consider GraphQL for more flexible API queries
3. **Service Mesh**: Evaluate AWS App Mesh for service-to-service communication
4. **ML/AI Integration**: Integrate AWS ML services for risk analytics

---

**Last Updated**: 2024-12-16  
**Version**: 1.0  
**Next Review**: 2025-03-16
