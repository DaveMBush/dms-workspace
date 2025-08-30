# Epic K: Authentication & Security

Goal: Implement AWS-based authentication system to secure the application for single-user access while meeting production security standards.

## Context

Currently, there is no authentication system. User mentioned they are the only one who will use this application, but want proper security to prevent unauthorized access. They correctly identified that AWS provides authentication services.

**AWS Authentication Options:**
- **AWS Cognito**: Managed user identity service (recommended for this use case)
- **AWS IAM**: Identity and Access Management (more complex, enterprise-focused)
- **Third-party**: Auth0, Firebase Auth, etc. (but user specifically wants AWS)

## Technical Context

**Current State:** No authentication, all routes/API endpoints are open
**Target State:** AWS Cognito-based authentication with:
- Login screen protecting the application
- JWT token-based API authentication
- Single user management (user's personal account)
- Session management and token refresh

**Integration Points:**
- Angular frontend: Login component, auth guard, HTTP interceptor
- Fastify backend: JWT validation middleware, protected routes
- AWS Cognito: User pool, app client, hosted UI (optional)

## Story K1: AWS Cognito Setup and Configuration

Description: Setup AWS Cognito User Pool and configure it for single-user authentication with appropriate security settings.

Acceptance Criteria:

- Create Cognito User Pool with email/password authentication
- Configure password policy (minimum security requirements)
- Setup App Client for the RMS application
- Configure User Pool domain for hosted authentication (optional)
- Setup Admin user account for the single user
- Configure JWT token expiration and refresh token policies
- Document Cognito configuration and user management procedures
- Add Cognito configuration to Terraform (if Epic J is implemented first)

Dependencies: AWS account with Cognito permissions

## Story K2: Backend API Authentication Middleware

Description: Implement JWT validation middleware in the Fastify backend to protect all API endpoints.

Acceptance Criteria:

- Install and configure AWS Cognito JWT validation libraries
- Create authentication middleware to validate Cognito JWT tokens
- Protect all existing API endpoints with authentication middleware
- Add error handling for expired, invalid, or missing tokens
- Configure CORS policies for authentication headers
- Create health check endpoint that bypasses authentication
- Add logging for authentication events and failures
- Unit tests for authentication middleware and error scenarios

Dependencies: Story K1

## Story K3: Frontend Login Component and Auth Service

Description: Create Angular login component and authentication service integrated with AWS Cognito.

Acceptance Criteria:

- Create login component with email/password form
- Implement authentication service using AWS Amplify or AWS SDK
- Add form validation and error handling
- Implement token storage in secure browser storage
- Create logout functionality with proper token cleanup
- Add loading states and user feedback during authentication
- Style login form to match existing PrimeNG theme
- Unit tests for authentication service and login component

Dependencies: Stories K1, K2

## Story K4: Route Protection and Auth Guards

Description: Implement Angular route guards to protect all application routes and redirect unauthenticated users to login.

Acceptance Criteria:

- Create authentication guard (CanActivate) for route protection
- Protect all existing routes with the authentication guard
- Implement automatic redirect to login page for unauthenticated users
- Add redirect back to original route after successful login
- Handle token expiration with automatic logout and redirect
- Create HTTP interceptor to add JWT tokens to API requests
- Handle 401/403 responses with automatic redirect to login
- Integration tests for route protection scenarios

Dependencies: Story K3

## Story K5: Token Refresh and Session Management

Description: Implement automatic token refresh and proper session management to provide seamless user experience.

Acceptance Criteria:

- Implement automatic token refresh using Cognito refresh tokens
- Handle token refresh failures with graceful logout
- Add session timeout warnings before automatic logout
- Implement "Remember Me" functionality (optional)
- Add activity-based session extension
- Handle concurrent token refresh requests properly
- Store minimal user information in client state (username, email)
- Unit and integration tests for token refresh scenarios

Dependencies: Stories K3, K4

## Story K6: User Profile and Account Management

Description: Create basic user profile management interface for the authenticated user.

Acceptance Criteria:

- Create user profile component showing basic user information
- Allow user to change password through Cognito
- Implement email verification flow (if required)
- Add user logout functionality with confirmation
- Display current session information (last login, token expiration)
- Handle password reset flow through Cognito
- Add navigation to user profile from main application
- Style profile management to match existing application theme

Dependencies: Story K3

## Story K7: Security Hardening and Production Readiness

Description: Implement additional security measures and prepare authentication system for production deployment.

Acceptance Criteria:

- Configure secure HTTP-only cookies for token storage (alternative to localStorage)
- Implement Content Security Policy (CSP) headers
- Add rate limiting for login attempts
- Configure proper CORS policies for production domains
- Implement secure logout (token revocation)
- Add audit logging for authentication events
- Security testing for common vulnerabilities (XSS, CSRF)
- Document security configuration and incident response procedures

Dependencies: Stories K1-K6

## Story K8: Integration Testing and Documentation

Description: Comprehensive testing of the complete authentication flow and create user documentation.

Acceptance Criteria:

- End-to-end testing of complete authentication flow
- Test authentication with all existing application features
- Performance testing of authentication overhead
- Test error scenarios (network failures, service outages)
- Create user guide for login and account management
- Document authentication architecture and security decisions
- Create troubleshooting guide for common authentication issues
- Load testing with authenticated requests

Dependencies: Stories K1-K7

## Technical Notes

**Architecture Integration:**
```
Frontend (Angular) → AWS Cognito → Backend (Fastify) → RDS Database
                   ↓
               JWT Tokens
```

**AWS Cognito Configuration:**
- User Pool: Manages user accounts and authentication
- App Client: Application registration with Cognito
- Hosted UI: Optional pre-built login interface
- Custom Domain: Professional appearance for login pages

**Security Considerations:**
- Use HTTPS everywhere (required for production)
- Secure token storage (consider HTTP-only cookies)
- Implement proper CORS policies
- Rate limiting and abuse protection
- Audit logging for compliance

**File Modifications (Minimal Changes):**
1. New: `auth/` module with login component and service
2. New: Authentication guard and HTTP interceptor
3. Modify: App routing to include auth guard
4. Modify: API endpoints to require authentication
5. New: Authentication middleware for Fastify
6. Update: Environment configuration for Cognito settings

**Cost Considerations:**
- Cognito pricing: $0.0055 per MAU (Monthly Active User)
- Single user cost: ~$0.01 per month
- JWT validation has no additional AWS costs
- Consider Cognito free tier (50,000 MAUs)

**Resume Value:**
- AWS Cognito expertise
- JWT authentication implementation
- Angular authentication patterns
- Security best practices
- Production authentication architecture