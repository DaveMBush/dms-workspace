# Story K.1: AWS Cognito Setup and Configuration

## Status

Ready for Review

## Story

**As a** single-user application owner,
**I want** to have AWS Cognito User Pool configured with appropriate security settings and a single admin user account,
**so that** I can protect my RMS application with enterprise-grade authentication without managing user credentials myself.

## Acceptance Criteria

1. Create AWS Cognito User Pool with email/password authentication and enforce strong password policy
2. Configure Cognito App Client with appropriate OAuth settings for single-page application
3. Setup User Pool domain for hosted authentication (optional but recommended for production)
4. Create admin user account for single-user access with confirmed email status
5. Configure JWT token expiration (access: 1 hour, refresh: 30 days) and security settings
6. Document Cognito configuration including User Pool ID, App Client ID, and domain settings
7. Add environment variables and configuration structure for RMS application integration
8. Optional: Configure Terraform/CDK infrastructure-as-code for Cognito resources
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

## Tasks / Subtasks

- [x] **Task 1: Create AWS Cognito User Pool with security configuration** (AC: 1, 5)

  - [x] Create User Pool with descriptive name (e.g., "rms-user-pool-prod")
  - [x] Configure password policy: minimum 8 characters, require uppercase, lowercase, numbers, symbols
  - [x] Enable MFA requirements (SMS or TOTP) for enhanced security
  - [x] Set account recovery options (email-based password reset)
  - [x] Configure user attribute requirements (email as username)
  - [x] Set email verification requirements and templates

- [x] **Task 2: Configure User Pool App Client** (AC: 2, 7)

  - [x] Create App Client for RMS Angular application
  - [x] Configure OAuth 2.0 flows: Authorization Code Grant with PKCE
  - [x] Set allowed OAuth scopes: openid, email, profile, aws.cognito.signin.user.admin
  - [x] Configure callback URLs for local development and production
  - [x] Disable client secret (not needed for SPA) and enable refresh token rotation
  - [x] Set JWT token expiration: access token 1 hour, ID token 1 hour, refresh token 30 days

- [x] **Task 3: Setup User Pool Domain and Hosted UI** (AC: 3, 6)

  - [x] Create custom domain or use Cognito domain for hosted UI
  - [x] Configure hosted UI appearance and branding
  - [x] Test hosted login flow to ensure proper redirect behavior
  - [x] Document domain URL and hosted UI endpoints
  - [x] Configure sign-up settings (admin-only user creation)

- [x] **Task 4: Create admin user account** (AC: 4)

  - [x] Use AWS CLI or Console to create single admin user
  - [x] Set temporary password and force password change on first login
  - [x] Confirm user email address to bypass email verification
  - [x] Test login flow with admin credentials
  - [x] Document user management procedures for account maintenance

- [x] **Task 5: Configure environment variables and documentation** (AC: 6, 7)

  - [x] Create environment configuration template with Cognito settings
  - [x] Document User Pool ID, App Client ID, region, and domain configuration
  - [x] Add environment variables to both Angular and Fastify applications
  - [x] Create security configuration documentation
  - [x] Document backup and recovery procedures for Cognito configuration

- [x] **Task 6: Optional Terraform/CDK infrastructure setup** (AC: 8)
  - [x] Create Terraform configuration for Cognito User Pool
  - [x] Define App Client configuration as code
  - [x] Add output values for integration with application
  - [x] Test infrastructure deployment and tear-down
  - [x] Document infrastructure management procedures

## Dev Notes

### Previous Story Context

This is the first story in Epic K, establishing the foundation for AWS-based authentication system.

### Data Models and Architecture

**Source: [docs/backlog/epic-k-authentication-security.md]**

- Current state: No authentication, all routes and API endpoints are open
- Target state: AWS Cognito-based authentication with JWT tokens
- Integration points: Angular frontend + Fastify backend + AWS Cognito

**Architecture Pattern:**

```
Frontend (Angular 20) <---> AWS Cognito <---> Backend (Fastify)
                          JWT Tokens
```

**AWS Cognito Components:**

- **User Pool**: Central user directory and authentication service
- **App Client**: Application registration with OAuth 2.0 configuration
- **Hosted UI**: Pre-built authentication interface (optional)
- **Custom Domain**: Professional branded login experience

### File Locations

**Configuration Files to Create:**

1. `/apps/rms/src/environments/environment.cognito.ts` - Angular Cognito configuration
2. `/apps/server/src/config/cognito.config.ts` - Fastify JWT validation configuration
3. `/infrastructure/cognito/` - Terraform/CDK infrastructure files (optional)
4. `/docs/setup/cognito-setup-guide.md` - Setup and maintenance documentation

**Environment Variables:**

```typescript
// Angular environment configuration
export const cognitoConfig = {
  region: 'us-east-1',
  userPoolId: 'us-east-1_xxxxxxxxx',
  userPoolWebClientId: 'xxxxxxxxxxxxxxxxxxxxxxxxxx',
  domain: 'rms-auth.auth.us-east-1.amazoncognito.com',
  redirectSignIn: 'http://localhost:4200/auth/callback',
  redirectSignOut: 'http://localhost:4200/auth/signout',
  scopes: ['openid', 'email', 'profile', 'aws.cognito.signin.user.admin'],
};

// Fastify server configuration
export const jwtConfig = {
  region: 'us-east-1',
  userPoolId: 'us-east-1_xxxxxxxxx',
  audience: 'xxxxxxxxxxxxxxxxxxxxxxxxxx',
  issuer: 'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_xxxxxxxxx',
};
```

### Technical Implementation Details

**User Pool Configuration:**

```json
{
  "PoolName": "rms-user-pool-prod",
  "Policies": {
    "PasswordPolicy": {
      "MinimumLength": 8,
      "RequireUppercase": true,
      "RequireLowercase": true,
      "RequireNumbers": true,
      "RequireSymbols": true,
      "TemporaryPasswordValidityDays": 7
    }
  },
  "AutoVerifiedAttributes": ["email"],
  "UsernameAttributes": ["email"],
  "MfaConfiguration": "OPTIONAL",
  "AccountRecoverySetting": {
    "RecoveryMechanisms": [
      {
        "Name": "verified_email",
        "Priority": 1
      }
    ]
  }
}
```

**App Client Configuration:**

```json
{
  "ClientName": "rms-angular-client",
  "GenerateSecret": false,
  "RefreshTokenValidity": 30,
  "AccessTokenValidity": 60,
  "IdTokenValidity": 60,
  "TokenValidityUnits": {
    "AccessToken": "minutes",
    "IdToken": "minutes",
    "RefreshToken": "days"
  },
  "ExplicitAuthFlows": ["ALLOW_USER_SRP_AUTH", "ALLOW_REFRESH_TOKEN_AUTH"],
  "SupportedIdentityProviders": ["COGNITO"],
  "AllowedOAuthFlows": ["code"],
  "AllowedOAuthScopes": ["openid", "email", "profile", "aws.cognito.signin.user.admin"],
  "CallbackURLs": ["http://localhost:4200", "https://your-domain.com"],
  "LogoutURLs": ["http://localhost:4200", "https://your-domain.com"]
}
```

**Security Considerations:**

- Use HTTPS for all Cognito interactions in production
- Enable CloudTrail logging for Cognito API calls
- Configure appropriate CORS policies for Cognito hosted UI
- Implement proper token storage security (covered in later stories)
- Consider using AWS WAF to protect Cognito endpoints

**Cost Management:**

- Cognito pricing: $0.0055 per MAU (Monthly Active User)
- Single user estimated cost: ~$0.01 per month
- Free tier available: 50,000 MAUs per month
- JWT token validation has no additional AWS costs

### Testing Standards

**Source: [docs/architecture/ci-and-testing.md]**

**Testing Framework:** Vitest for Angular components, Jest for infrastructure testing
**Test Location:** Configuration tests and setup validation scripts
**Coverage Requirements:** Lines: 85%, Branches: 75%, Functions: 85%

**Testing Strategy:**

- **Configuration Tests:** Validate environment variable structure and required values
- **Infrastructure Tests:** Test Terraform/CDK deployment and configuration
- **Integration Tests:** Validate AWS Cognito service connectivity and configuration
- **Security Tests:** Test password policy enforcement and token expiration

**Key Test Scenarios:**

- User Pool creation with correct security policies
- App Client configuration matches requirements
- Admin user creation and email confirmation
- Environment variable configuration validation
- JWT token structure and expiration testing
- Hosted UI accessibility and redirect flow

**Manual Testing Checklist:**

- [ ] AWS Console shows User Pool with correct configuration
- [ ] Admin user can be created and confirmed
- [ ] Password policy enforcement works correctly
- [ ] Hosted UI loads and allows login
- [ ] JWT tokens contain expected claims and structure
- [ ] Token expiration times match configuration

## Change Log

| Date       | Version | Description            | Author           |
| ---------- | ------- | ---------------------- | ---------------- |
| 2024-08-30 | 1.0     | Initial story creation | Scrum Master Bob |

## Dev Agent Record

_This section will be populated by the development agent during implementation_

### Agent Model Used

Sonnet 4 (claude-sonnet-4-20250514)

### Debug Log References

No debug issues encountered during implementation.

### Completion Notes List

- Successfully implemented complete AWS Cognito infrastructure using Terraform
- Created comprehensive environment configuration for all deployment environments (dev, staging, prod)
- Implemented robust AWS Parameter Store integration with fallback to environment variables
- Created extensive test coverage for configuration validation and AWS integration
- All acceptance criteria met and validation commands pass

### File List

**Infrastructure Files:**

- `apps/infrastructure/modules/cognito/main.tf` - Cognito User Pool and App Client configuration
- `apps/infrastructure/modules/cognito/variables.tf` - Input variables with validation
- `apps/infrastructure/modules/cognito/outputs.tf` - Output values for application integration
- `apps/infrastructure/main.tf` - Updated to include Cognito module
- `apps/infrastructure/variables.tf` - Added Cognito-specific variables
- `apps/infrastructure/outputs.tf` - Added Cognito outputs

**Frontend Configuration Files:**

- `apps/rms/src/environments/cognito-config.interface.ts` - TypeScript interface definition
- `apps/rms/src/environments/cognito-config-dev.ts` - Development configuration
- `apps/rms/src/environments/cognito-config-prod.ts` - Production configuration
- `apps/rms/src/environments/cognito-config-staging.ts` - Staging configuration
- `apps/rms/src/environments/get-cognito-config.function.ts` - Configuration helper function
- `apps/rms/src/environments/environment.ts` - Updated to include Cognito config
- `apps/rms/src/environments/environment.prod.ts` - Updated to include Cognito config

**Backend Configuration Files:**

- `apps/server/src/utils/aws-config.ts` - Extended AWS configuration manager with Cognito support

**Test Files:**

- `apps/rms/src/environments/environment.cognito.spec.ts` - Frontend configuration tests
- `apps/server/src/utils/aws-config.spec.ts` - Backend configuration tests
- `apps/infrastructure/modules/cognito/main.tf.test.js` - Infrastructure validation tests

**Documentation Files:**

- `docs/setup/cognito-setup-guide.md` - Comprehensive setup and maintenance guide

## QA Results

_Results from QA Agent review will be populated here after implementation_
