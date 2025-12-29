# Local Authentication Setup

This guide explains how to run the DMS application locally without requiring AWS Cognito infrastructure.

## Overview

The DMS application includes a **Mock Authentication Service** for local development that simulates AWS Cognito behavior without requiring cloud infrastructure setup.

## Quick Start

### Default Development Credentials

The mock auth service accepts these default credentials:

- **Email**: `dev@dms.local`
- **Password**: `DevPassword123!`

### Alternative Login Options

You can also login with **any valid email format** and **any password with 8+ characters**:

Examples:

- Email: `test@example.com`, Password: `password123`
- Email: `admin@company.com`, Password: `mypassword`
- Email: `user@domain.org`, Password: `secretpass`

## Configuration

### Enable Mock Authentication

Mock authentication is enabled by default in development. The setting is controlled in `apps/dms/src/environments/environment.ts`:

```typescript
export const environment = {
  // ... other config
  auth: {
    useMockAuth: true, // Set to false when using real AWS Cognito
  },
  // ... rest of config
};
```

### Switch to Real AWS Cognito

To use real AWS Cognito authentication:

1. Set `useMockAuth: false` in `environment.ts`
2. Follow the [Cognito Setup Guide](../setup/cognito-setup-guide.md)
3. Update the Cognito configuration with real values

## How It Works

The mock authentication service:

1. **Accepts flexible credentials**: Any valid email + password (8+ chars)
2. **Simulates network delays**: Includes realistic loading states
3. **Generates mock JWT tokens**: Compatible with the HTTP interceptor
4. **Persists sessions**: Uses localStorage to maintain login state
5. **Provides same interface**: Drop-in replacement for real AuthService

## Features Supported

✅ **Login/Logout flows**
✅ **Route protection** (auth guards work normally)
✅ **HTTP token injection** (mock JWT tokens sent with API calls)
✅ **Session persistence** (login survives page refreshes)
✅ **Token expiration** (mock tokens expire after 1 hour)
✅ **Error handling** (invalid credentials, network errors)

## Development Workflow

### Step 1: Start the Application

```bash
pnpm nx serve dms
```

### Step 2: Navigate to Login

The app will redirect you to `http://localhost:4200/auth/login`

### Step 3: Login

Use either:

- Default: `dev@dms.local` / `DevPassword123!`
- Custom: Any email format with 8+ character password

### Step 4: Access Protected Routes

After login, you'll be redirected to the main application.

## Troubleshooting

### "Invalid email format or password too short"

- Ensure email follows standard format (`user@domain.com`)
- Password must be at least 8 characters

### Login form not accepting credentials

- Check browser console for errors
- Verify `useMockAuth: true` in environment config
- Clear localStorage if needed: `localStorage.clear()`

### Session not persisting

- Check if localStorage is available in your browser
- Ensure no browser extensions are blocking localStorage

### Still seeing AWS Cognito errors

- Confirm `environment.auth.useMockAuth` is set to `true`
- Restart the dev server after changing configuration

## Production Deployment

**Important**: Mock authentication is for **development only**.

For production deployments:

1. Set `useMockAuth: false` in production environment files
2. Configure real AWS Cognito infrastructure
3. Update environment variables with real Cognito values

## Session Data

Mock sessions store the following in localStorage:

- `dms_mock_access_token`: Mock JWT access token
- `dms_mock_id_token`: Mock JWT ID token
- `dms_mock_refresh_token`: Mock refresh token
- `dms_mock_token_expiration`: Token expiration timestamp
- `dms_mock_user`: User profile data

## Mock JWT Token Structure

The mock service generates JWT-like tokens with this payload:

```json
{
  "sub": "mock-user-id-12345",
  "email": "user@example.com",
  "username": "user@example.com",
  "exp": 1640995200,
  "iat": 1640991600,
  "iss": "mock-auth-service"
}
```

---

**Note**: This mock authentication system provides a complete local development experience without requiring cloud infrastructure setup or internet connectivity.
