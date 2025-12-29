# LocalStack Authentication Configuration Guide

This document describes the local authentication and configuration management setup using LocalStack for the DMS Workspace project.

## Overview

The LocalStack integration provides:

- **Local Cognito emulation** for user authentication
- **Local Parameter Store** for configuration management
- **Environment-aware configuration** that switches seamlessly between local and cloud services
- **JWT token compatibility** between local and production environments

## Architecture

### Environment Detection

The system automatically detects the environment using:

1. `USE_LOCAL_SERVICES=true` environment variable
2. `AWS_ENDPOINT_URL` environment variable pointing to LocalStack

When either is set, the system routes all AWS service calls to LocalStack.

### Configuration Flow

```
Application Start
       ↓
Environment Detection
       ↓
    Local?  →  YES  →  LocalStack Services
       ↓                    ↓
      NO                AWS Services
       ↓                    ↓
   AWS Services  ←─────────────
```

## Setup Instructions

### 1. Start LocalStack Services

```bash
# Start the complete local development stack
./scripts/start-local-development.sh

# Or manually start just LocalStack and PostgreSQL
docker-compose -f docker-compose.local.yml up -d postgres localstack
```

### 2. Environment Configuration

The following environment variables are automatically configured:

```bash
# Environment
NODE_ENV=local
USE_LOCAL_SERVICES=true

# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test
AWS_ENDPOINT_URL=http://localhost:4566

# Database
DATABASE_URL=postgresql://dms_user:dms_password@localhost:5432/dms_local?schema=public
```

### 3. Cognito Configuration

LocalStack automatically creates:

- **User Pool**: `us-east-1_LOCAL123` (dynamic, actual ID will vary)
- **Client ID**: `local-client-id-123` (dynamic, actual ID will vary)
- **Test User**: `testuser@example.com` / `TestPass123!`

### 4. Parameter Store Configuration

The following parameters are automatically populated:

```
/dms/local/database-url
/dms/local/database-password
/dms/local/cognito-user-pool-id
/dms/local/cognito-user-pool-client-id
/dms/local/cognito-jwt-issuer
/dms/local/aws-region
```

## JWT Token Compatibility

### LocalStack URLs

When running locally, the system uses:

- **JWKS URI**: `http://localhost:4566/cognito-idp/us-east-1/{userPoolId}/.well-known/jwks.json`
- **JWT Issuer**: `http://localhost:4566/cognito-idp/us-east-1/{userPoolId}`

### Token Validation

The backend JWT validation middleware automatically:

1. Detects the local environment
2. Uses LocalStack endpoints for JWKS key retrieval
3. Validates tokens using the same logic as production

## Frontend Configuration

### Local Cognito Config

A specific configuration file for local development:

```typescript
// apps/dms/src/environments/cognito-config-local.ts
export const cognitoConfigLocal: CognitoConfig = {
  region: 'us-east-1',
  userPoolId: 'us-east-1_LOCAL123',
  userPoolWebClientId: 'local-client-id-123',
  domain: 'localhost.auth.us-east-1.amazoncognito.com',
  redirectSignIn: 'http://localhost:4200',
  redirectSignOut: 'http://localhost:4200/auth/signout',
  // ... other config
};
```

### Environment Selection

The frontend automatically selects the appropriate configuration:

```typescript
const environment = process.env.NODE_ENV;
const config = getCognitoConfig(environment); // 'local' | 'dev' | 'staging' | 'prod'
```

## Testing Local Authentication

### 1. Verify LocalStack Services

```bash
# Check LocalStack health
curl http://localhost:4566/health

# List Cognito User Pools
aws --endpoint-url=http://localhost:4566 cognito-idp list-user-pools --max-items 10

# List Parameters
aws --endpoint-url=http://localhost:4566 ssm describe-parameters
```

### 2. Test User Authentication

Use the pre-created test user:

- **Email**: `testuser@example.com`
- **Password**: `TestPass123!`

### 3. Verify JWT Token

```bash
# Get a JWT token using AWS CLI
aws --endpoint-url=http://localhost:4566 cognito-idp admin-initiate-auth \
  --user-pool-id us-east-1_LOCAL123 \
  --client-id local-client-id-123 \
  --auth-flow ADMIN_NO_SRP_AUTH \
  --auth-parameters USERNAME=testuser@example.com,PASSWORD=TestPass123!
```

## Troubleshooting

### Common Issues

1. **LocalStack not ready**: Wait for health check to pass before starting applications
2. **Parameter Store empty**: Run the LocalStack initialization script
3. **JWT validation fails**: Verify LocalStack Cognito is running and JWKS endpoint is accessible
4. **Token format issues**: Ensure LocalStack version supports proper JWT generation

### Debugging Commands

```bash
# View LocalStack logs
docker-compose -f docker-compose.local.yml logs -f localstack

# Check parameter values
aws --endpoint-url=http://localhost:4566 ssm get-parameter \
  --name "/dms/local/cognito-user-pool-id" --with-decryption

# Verify JWKS endpoint
curl http://localhost:4566/cognito-idp/us-east-1/us-east-1_LOCAL123/.well-known/jwks.json
```

## Production vs Local Differences

| Feature          | Production                                   | Local                     |
| ---------------- | -------------------------------------------- | ------------------------- |
| Cognito Endpoint | `https://cognito-idp.{region}.amazonaws.com` | `http://localhost:4566`   |
| Parameter Store  | AWS Systems Manager                          | LocalStack SSM            |
| User Management  | AWS Console                                  | LocalStack/CLI            |
| Token Issuer     | AWS Cognito                                  | LocalStack Cognito        |
| JWKS Validation  | AWS Public Keys                              | LocalStack Generated Keys |

## Security Considerations

- LocalStack uses mock credentials (`test`/`test`)
- All data is ephemeral unless persistence is enabled
- JWT tokens are generated with LocalStack's private keys
- No real AWS charges are incurred
- Test users have default passwords for development only

## Next Steps

After successful local setup:

1. Start the backend: `pnpm nx run server:serve`
2. Start the frontend: `pnpm nx run dms:serve`
3. Visit `http://localhost:4200`
4. Log in with test credentials
5. Verify authentication flows work end-to-end
