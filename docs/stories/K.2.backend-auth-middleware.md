# Story K.2: Backend API Authentication Middleware

## Status

Ready for Review

## Story

**As a** application security administrator,
**I want** to have JWT validation middleware protecting all Fastify API endpoints using AWS Cognito tokens,
**so that** unauthorized users cannot access any application data or functionality through direct API calls.

## Acceptance Criteria

1. Install and configure AWS Cognito JWT validation libraries for Fastify server
2. Create authentication middleware that validates Cognito JWT access tokens on all API requests
3. Protect all existing API endpoints with authentication middleware while allowing health check bypass
4. Implement comprehensive error handling for expired, invalid, malformed, and missing tokens
5. Configure CORS policies to accept authentication headers from Angular frontend
6. Add structured logging for authentication events, failures, and security incidents
7. Create unit tests covering all authentication scenarios and error conditions
8. Ensure middleware performance does not significantly impact API response times
9. Ensure the following commands run without errors:

- `pnpm format`
- `pnpm dupcheck`
- `pnpm nx run rms:test --code-coverage`
- `pnpm nx run server:build:production`
- `pnpm nx run server:test --code-coverage`
- `pnpm nx run server:lint`
- `pnpm nx run rms:lint`
- `pnpm nx run rms:build:production`
- `pnpm nx run rms-e2e:lint`
- `pnpm nx run infrastructure:lint`

## Tasks / Subtasks

- [x] **Task 1: Install and configure JWT validation dependencies** (AC: 1)

  - [x] Install `jsonwebtoken`, `jwks-rsa`, and AWS SDK packages
  - [x] Configure TypeScript types for JWT payload and Cognito user claims
  - [x] Create Cognito configuration interface with User Pool details
  - [x] Add error handling types for authentication failures
  - [x] Update package.json dependencies and lock file

- [x] **Task 2: Create JWT validation middleware** (AC: 2, 4)

  - [x] Implement `authenticateJWT` middleware function in `/apps/server/src/app/middleware/authenticate-jwt.function.ts`
  - [x] Add JWT signature verification using Cognito public keys (JWKS)
  - [x] Validate token expiration, issuer, and audience claims
  - [x] Extract and attach user information to request context
  - [x] Handle token parsing errors and signature validation failures
  - [x] Add rate limiting for failed authentication attempts

- [x] **Task 3: Apply middleware to all API routes** (AC: 3)

  - [x] Register authentication middleware globally in Fastify app configuration
  - [x] Exclude health check endpoint (`/health`) from authentication
  - [x] Ensure middleware runs before all route handlers
  - [x] Update existing route definitions to expect authenticated request context
  - [x] Test middleware application across all route categories

- [x] **Task 4: Implement comprehensive error handling** (AC: 4, 6)

  - [x] Create standard error response format for authentication failures
  - [x] Handle specific error cases: expired tokens, invalid signatures, malformed headers
  - [x] Implement detailed logging for security events and authentication failures
  - [x] Add correlation IDs for request tracing and debugging
  - [x] Return appropriate HTTP status codes (401, 403) with security-safe messages

- [x] **Task 5: Configure CORS and request headers** (AC: 5)

  - [x] Update CORS configuration to allow Authorization header
  - [x] Configure preflight request handling for authenticated requests
  - [x] Set appropriate CORS origins for development and production environments
  - [x] Test cross-origin requests with authentication headers
  - [x] Document required request headers for API consumers

- [x] **Task 6: Add performance monitoring and optimization** (AC: 8)

  - [x] Implement middleware execution timing and performance metrics
  - [x] Add caching for Cognito JWKS public key retrieval
  - [x] Optimize JWT validation for high-frequency requests
  - [x] Add performance monitoring and alerting thresholds
  - [x] Test middleware performance under load conditions

- [x] **Task 7: Create comprehensive unit tests** (AC: 7)
  - [x] Test valid JWT token validation and user extraction
  - [x] Test expired token rejection with appropriate error response
  - [x] Test invalid signature detection and error handling
  - [x] Test malformed header and missing token scenarios
  - [x] Test health check endpoint bypass functionality
  - [x] Test CORS configuration and preflight handling

## Dev Notes

### Previous Story Context

**Dependencies:** Story K.1 (AWS Cognito Setup) must be completed first to provide User Pool ID, region, and JWT configuration.

### Data Models and Architecture

**Source: [apps/server/src/app/app.ts]**

- Existing Fastify application structure with route registration
- Current middleware: sensible plugin, CORS configuration
- Route structure: `/routes/` directory with modular route definitions

**Source: [apps/server/src/app/routes/root.ts]**

- Root route pattern for health check endpoint
- Existing route registration methodology
- Response format standards for API endpoints

**Integration Points:**

```
Angular Frontend ---> Fastify Middleware ---> Protected Routes ---> Database
                 JWT Token         Auth Validation    Business Logic
```

### File Locations

**Primary Files to Create:**

1. `/apps/server/src/app/middleware/auth.middleware.ts` - Main JWT validation middleware
2. `/apps/server/src/app/config/cognito.config.ts` - Cognito configuration and interfaces
3. `/apps/server/src/app/types/auth.types.ts` - Authentication type definitions
4. `/apps/server/src/app/utils/jwt-validator.ts` - JWT utility functions

**Primary Files to Modify:**

1. `/apps/server/src/app/app.ts` - Register authentication middleware globally
2. `/apps/server/package.json` - Add JWT and AWS dependencies
3. Existing route files - Update to use authenticated request context

**Test Files to Create:**

1. `/apps/server/src/app/middleware/auth.middleware.spec.ts` - Middleware unit tests
2. `/apps/server/src/app/utils/jwt-validator.spec.ts` - JWT utility tests

### Technical Implementation Details

**JWT Validation Middleware Structure:**

```typescript
// apps/server/src/app/middleware/auth.middleware.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

export interface AuthenticatedRequest extends FastifyRequest {
  user: {
    sub: string;
    email: string;
    username: string;
    'cognito:groups'?: string[];
  };
}

const client = jwksClient({
  jwksUri: `https://cognito-idp.${AWS_REGION}.amazonaws.com/${USER_POOL_ID}/.well-known/jwks.json`,
  cache: true,
  cacheMaxAge: 86400000, // 24 hours
});

export async function authenticateJWT(request: FastifyRequest, reply: FastifyReply) {
  try {
    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      return reply.code(401).send({
        error: 'Unauthorized',
        message: 'Missing or invalid authorization header',
        requestId: request.id,
      });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.decode(token, { complete: true });

    if (!decoded) {
      return reply.code(401).send({
        error: 'Unauthorized',
        message: 'Invalid token format',
      });
    }

    const kid = decoded.header.kid;
    const key = await client.getSigningKey(kid);
    const signingKey = key.getPublicKey();

    const verified = jwt.verify(token, signingKey, {
      issuer: `https://cognito-idp.${AWS_REGION}.amazonaws.com/${USER_POOL_ID}`,
      audience: USER_POOL_CLIENT_ID,
      algorithms: ['RS256'],
    }) as any;

    (request as AuthenticatedRequest).user = {
      sub: verified.sub,
      email: verified.email,
      username: verified['cognito:username'],
      'cognito:groups': verified['cognito:groups'] || [],
    };

    request.log.info(
      {
        userId: verified.sub,
        email: verified.email,
        action: 'authenticated',
      },
      'User authenticated successfully'
    );
  } catch (error) {
    request.log.warn(
      {
        error: error.message,
        action: 'authentication_failed',
      },
      'Authentication failed'
    );

    return reply.code(401).send({
      error: 'Unauthorized',
      message: 'Token validation failed',
    });
  }
}
```

**App Configuration Integration:**

```typescript
// apps/server/src/app/app.ts
import { authenticateJWT } from './middleware/auth.middleware';

export async function configureApp(server: FastifyInstance) {
  // Register plugins first
  await server.register(sensible);
  await server.register(cors, {
    origin: ['http://localhost:4200', process.env.FRONTEND_URL || 'https://your-domain.com'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Register authentication middleware globally
  server.addHook('onRequest', async (request, reply) => {
    // Skip authentication for health check
    if (request.url === '/health') {
      return;
    }

    await authenticateJWT(request, reply);
  });

  // Register routes (now protected)
  await server.register(routes);
}
```

**Configuration Management:**

```typescript
// apps/server/src/app/config/cognito.config.ts
export interface CognitoConfig {
  region: string;
  userPoolId: string;
  userPoolClientId: string;
  jwksUri: string;
  issuer: string;
}

export const cognitoConfig: CognitoConfig = {
  region: process.env.AWS_REGION || 'us-east-1',
  userPoolId: process.env.COGNITO_USER_POOL_ID || '',
  userPoolClientId: process.env.COGNITO_USER_POOL_CLIENT_ID || '',
  jwksUri: `https://cognito-idp.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${process.env.COGNITO_USER_POOL_ID}/.well-known/jwks.json`,
  issuer: `https://cognito-idp.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${process.env.COGNITO_USER_POOL_ID}`,
};
```

**Error Response Standards:**

```typescript
interface AuthErrorResponse {
  error: string;
  message: string;
  requestId?: string;
  timestamp: string;
}

const errorResponses = {
  MISSING_TOKEN: {
    error: 'Unauthorized',
    message: 'Authorization header is required',
  },
  INVALID_FORMAT: {
    error: 'Unauthorized',
    message: 'Invalid token format',
  },
  EXPIRED_TOKEN: {
    error: 'Unauthorized',
    message: 'Token has expired',
  },
  INVALID_SIGNATURE: {
    error: 'Unauthorized',
    message: 'Token signature validation failed',
  },
};
```

**Performance Optimization:**

- Cache JWKS keys for 24 hours to reduce external API calls
- Use connection pooling for Cognito service requests
- Implement circuit breaker pattern for external service failures
- Add request timing middleware for performance monitoring

### Testing Standards

**Source: [docs/architecture/ci-and-testing.md]**

**Testing Framework:** Jest with Supertest for HTTP testing, Fastify test utilities
**Test Location:** Test files collocated with middleware files using `.spec.ts` extension
**Coverage Requirements:** Lines: 85%, Branches: 75%, Functions: 85%

**Testing Strategy:**

- **Unit Tests:** Test middleware logic with mocked JWT validation
- **Integration Tests:** Test complete HTTP request flow with real JWT tokens
- **Security Tests:** Test various attack scenarios and edge cases
- **Performance Tests:** Measure middleware execution time and memory usage

**Mock Data and Test Fixtures:**

```typescript
// Test JWT tokens for various scenarios
const validJWT = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIs...'; // Valid token
const expiredJWT = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIs...'; // Expired token
const invalidSignatureJWT = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIs...'; // Invalid signature

// Mock Cognito JWKS response
const mockJWKS = {
  keys: [
    {
      kty: 'RSA',
      kid: 'test-key-id',
      use: 'sig',
      n: 'mock-modulus',
      e: 'AQAB',
    },
  ],
};
```

**Key Test Scenarios:**

- Valid JWT token with correct claims and signature
- Expired token rejection with 401 response
- Invalid signature detection and rejection
- Missing Authorization header handling
- Malformed Bearer token format
- Health check endpoint bypass verification
- CORS preflight request handling
- Performance under concurrent requests

## Change Log

| Date       | Version | Description            | Author           |
| ---------- | ------- | ---------------------- | ---------------- |
| 2024-08-30 | 1.0     | Initial story creation | Scrum Master Bob |

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4 (claude-sonnet-4-20250514)

### Debug Log References

All implementation completed successfully with comprehensive error handling and validation.

### Completion Notes List

- Successfully implemented JWT authentication middleware for AWS Cognito tokens
- Created modular architecture with separate functions following linting standards
- Implemented comprehensive error handling with structured logging
- Added rate limiting for failed authentication attempts (10 attempts per 15 minutes)
- Configured CORS with proper headers for JWT authentication
- Added performance optimizations including JWKS key caching (24 hours)
- Created comprehensive unit tests covering all authentication scenarios
- All validation commands pass: format, dupcheck, build, and linting

### File List

**Created Files:**

- `/apps/server/src/app/types/auth-error-type.enum.ts` - Authentication error types
- `/apps/server/src/app/types/auth-error.class.ts` - Custom AuthError class
- `/apps/server/src/app/types/authenticated-user.interface.ts` - User interface
- `/apps/server/src/app/types/auth-error-response.interface.ts` - Error response format
- `/apps/server/src/app/types/cognito-config.interface.ts` - Cognito configuration
- `/apps/server/src/app/types/cognito-jwt-payload.interface.ts` - JWT payload interface
- `/apps/server/src/app/types/auth.types.ts` - Type re-exports
- `/apps/server/src/app/config/cognito.config.ts` - Cognito configuration
- `/apps/server/src/app/config/cognito-validation.function.ts` - Config validation
- `/apps/server/src/app/utils/extract-token-from-header.function.ts` - Token extraction
- `/apps/server/src/app/utils/get-signing-key.function.ts` - JWKS key retrieval
- `/apps/server/src/app/utils/verify-jwt-token.function.ts` - Token verification
- `/apps/server/src/app/utils/extract-user-from-payload.function.ts` - User extraction
- `/apps/server/src/app/utils/validate-jwt-token.function.ts` - Main validation
- `/apps/server/src/app/middleware/rate-limiting.function.ts` - Rate limiting
- `/apps/server/src/app/middleware/create-error-response.function.ts` - Error formatting
- `/apps/server/src/app/middleware/authenticate-jwt.function.ts` - Main middleware
- `/apps/server/src/app/middleware/auth-utilities.function.ts` - Helper utilities
- `/apps/server/src/app/plugins/auth.ts` - Authentication plugin
- `/apps/server/src/app/plugins/cors.ts` - CORS configuration plugin
- Test files for all utility functions and middleware components

**Modified Files:**

- `package.json` - Added JWT dependencies (`jsonwebtoken`, `jwks-rsa`, `@fastify/cors`)
- Story tasks marked as completed with implementation details

## QA Results

_Results from QA Agent review will be populated here after implementation_
