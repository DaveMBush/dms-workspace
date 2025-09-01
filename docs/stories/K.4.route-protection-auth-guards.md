# Story K.4: Route Protection and Auth Guards

## Status

Draft

## Story

**As a** single-user application owner,  
**I want** to have all application routes protected by authentication guards with automatic redirects and HTTP request token injection,  
**so that** unauthorized access is prevented and my authenticated sessions work seamlessly across the entire application.

## Acceptance Criteria

1. Create Angular authentication guard (CanActivate) that validates user authentication status before route access
2. Protect all existing application routes with the authentication guard while maintaining navigation structure
3. Implement automatic redirect to login page for unauthenticated users with original URL preservation
4. Add redirect back to original route after successful login to maintain user workflow
5. Handle token expiration with automatic logout and redirect to login page
6. Create HTTP interceptor to automatically add JWT tokens to all API requests
7. Handle 401/403 responses with automatic logout and redirect to prevent stale authentication
8. Create comprehensive integration tests covering all route protection scenarios

## Tasks / Subtasks

- [ ] **Task 1: Create authentication guard with route protection logic** (AC: 1, 3, 4)

  - [ ] Create `AuthGuard` service in `/apps/rms/src/app/auth/guards/auth.guard.ts`
  - [ ] Implement `canActivate` method with authentication status validation
  - [ ] Add logic to redirect unauthenticated users to login page
  - [ ] Implement return URL preservation using query parameters
  - [ ] Add route activation logging for security monitoring
  - [ ] Handle edge cases: loading states, network failures, invalid tokens

- [ ] **Task 2: Apply authentication guard to all application routes** (AC: 2)

  - [ ] Update main route configuration in `/apps/rms/src/app/app.routes.ts`
  - [ ] Apply `canActivate: [AuthGuard]` to all protected routes
  - [ ] Ensure login route remains unprotected for initial access
  - [ ] Test route protection across all application modules
  - [ ] Verify nested route protection and child route inheritance
  - [ ] Document route structure and protection coverage

- [ ] **Task 3: Implement return URL handling and navigation flow** (AC: 3, 4)

  - [ ] Add query parameter handling for return URLs in AuthGuard
  - [ ] Update login component to redirect to original URL after authentication
  - [ ] Handle complex URLs with query parameters and fragments
  - [ ] Implement fallback navigation for invalid return URLs
  - [ ] Test navigation flow with deep-linked routes and bookmarks
  - [ ] Add user feedback during redirect operations

- [ ] **Task 4: Create HTTP interceptor for automatic token injection** (AC: 6)

  - [ ] Create `AuthInterceptor` in `/apps/rms/src/app/auth/interceptors/auth.interceptor.ts`
  - [ ] Implement automatic Authorization header injection for API requests
  - [ ] Add logic to skip authentication for public endpoints (health checks)
  - [ ] Handle requests during token refresh operations
  - [ ] Add request correlation IDs for debugging and monitoring
  - [ ] Implement error handling for missing or invalid tokens

- [ ] **Task 5: Handle authentication errors and token expiration** (AC: 5, 7)

  - [ ] Add global error handling for 401 and 403 HTTP responses
  - [ ] Implement automatic logout on token expiration
  - [ ] Add user notification for session timeout events
  - [ ] Handle concurrent request failures gracefully
  - [ ] Prevent infinite redirect loops and authentication cycles
  - [ ] Add proper cleanup of authentication state on errors

- [ ] **Task 6: Integrate with existing routing and navigation** (AC: 2, 4)

  - [ ] Update existing navigation components to work with protected routes
  - [ ] Ensure breadcrumbs and navigation menus respect authentication state
  - [ ] Test deep linking and direct URL access to protected routes
  - [ ] Verify browser back/forward button functionality
  - [ ] Handle route changes during authentication operations
  - [ ] Test navigation with concurrent user sessions (multiple tabs)

- [ ] **Task 7: Add user feedback and loading states** (AC: 3, 4)

  - [ ] Add loading indicators during authentication checks
  - [ ] Display user-friendly messages for authentication redirects
  - [ ] Show progress feedback during login redirect operations
  - [ ] Add error messages for failed authentication attempts
  - [ ] Implement proper ARIA labels for accessibility during transitions
  - [ ] Create smooth transitions between protected and public routes

- [ ] **Task 8: Create comprehensive integration tests** (AC: 8)
  - [ ] Test route protection with authenticated and unauthenticated users
  - [ ] Test automatic redirect to login page and return URL handling
  - [ ] Test HTTP interceptor token injection and error handling
  - [ ] Test token expiration scenarios and automatic logout
  - [ ] Test concurrent requests and race condition handling
  - [ ] Test navigation flow and deep linking scenarios

## Dev Notes

### Previous Story Context

**Dependencies:**

- Story K.1 (AWS Cognito Setup) provides authentication foundation
- Story K.2 (Backend Auth Middleware) provides protected API endpoints
- Story K.3 (Frontend Login Component) provides authentication service and login UI

### Data Models and Architecture

**Source: [apps/rms/src/app/app.routes.ts]**

- Current route structure: main application routes without protection
- Navigation patterns: direct routing and programmatic navigation
- Route configuration: standalone components with lazy loading

**Source: [apps/rms/src/app/auth/auth.service.ts from Story K.3]**

- Authentication service with signal-based state management
- `isAuthenticated` computed signal for guard integration
- Token storage and retrieval methods for HTTP interceptor

**Route Protection Flow:**

```
Route Request -> AuthGuard -> Authentication Check -> Route Access/Login Redirect
                    ↓              ↓                        ↓
               Check AuthService   Token Validation    Navigate to Login with Return URL
```

**HTTP Request Flow:**

```
HTTP Request -> AuthInterceptor -> Add JWT Token -> API Endpoint -> Response
                     ↓                  ↓              ↓           ↓
              Get Token from Storage  Authorization Header   Protected Resource  Handle Errors
```

### File Locations

**Primary Files to Create:**

1. `/apps/rms/src/app/auth/guards/auth.guard.ts` - Main authentication guard
2. `/apps/rms/src/app/auth/interceptors/auth.interceptor.ts` - HTTP token interceptor
3. `/apps/rms/src/app/auth/services/route.service.ts` - Route management utilities

**Primary Files to Modify:**

1. `/apps/rms/src/app/app.routes.ts` - Add guard protection to all routes
2. `/apps/rms/src/app/app.config.ts` - Register HTTP interceptor
3. `/apps/rms/src/app/auth/login/login.ts` - Add return URL handling

**Test Files to Create:**

1. `/apps/rms/src/app/auth/guards/auth.guard.spec.ts` - Guard unit tests
2. `/apps/rms/src/app/auth/interceptors/auth.interceptor.spec.ts` - Interceptor tests
3. `/apps/rms/src/app/auth/auth-integration.spec.ts` - Integration test suite

### Technical Implementation Details

**Authentication Guard Implementation:**

```typescript
// apps/rms/src/app/auth/guards/auth.guard.ts
import { Injectable, inject } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../auth.service';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate {
  private authService = inject(AuthService);
  private router = inject(Router);

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean | Promise<boolean> {
    return this.checkAuthentication(state.url);
  }

  private async checkAuthentication(url: string): Promise<boolean> {
    // Check if user is authenticated
    if (this.authService.isAuthenticated()) {
      return true;
    }

    // Check for valid token in storage
    const token = this.authService.getAccessToken();
    if (token) {
      try {
        // Validate token is not expired
        const payload = this.parseJWT(token);
        if (payload.exp * 1000 > Date.now()) {
          return true;
        }
      } catch (error) {
        console.warn('Invalid token found:', error);
      }
    }

    // User not authenticated, redirect to login
    console.log('Redirecting unauthenticated user to login', { originalUrl: url });

    await this.router.navigate(['/login'], {
      queryParams: { returnUrl: url },
    });

    return false;
  }

  private parseJWT(token: string): any {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      return JSON.parse(window.atob(base64));
    } catch (error) {
      throw new Error('Invalid JWT token');
    }
  }
}
```

**HTTP Interceptor Implementation:**

```typescript
// apps/rms/src/app/auth/interceptors/auth.interceptor.ts
import { Injectable, inject } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, EMPTY } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { AuthService } from '../auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private authService = inject(AuthService);
  private router = inject(Router);

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Skip authentication for public endpoints
    if (this.isPublicEndpoint(request.url)) {
      return next.handle(request);
    }

    // Add authorization header
    const token = this.authService.getAccessToken();
    if (token) {
      request = request.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`,
          'X-Request-ID': this.generateRequestId(),
        },
      });
    }

    // Handle response errors
    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401 || error.status === 403) {
          console.warn('Authentication error, logging out user', {
            status: error.status,
            url: request.url,
          });

          // Automatic logout on authentication errors
          this.authService.signOut();
          this.router.navigate(['/login']);

          return EMPTY; // Prevent error propagation to component
        }

        return throwError(() => error);
      })
    );
  }

  private isPublicEndpoint(url: string): boolean {
    const publicEndpoints = ['/health', '/api/health'];
    return publicEndpoints.some((endpoint) => url.includes(endpoint));
  }

  private generateRequestId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }
}
```

**Route Configuration with Guards:**

```typescript
// apps/rms/src/app/app.routes.ts
import { Routes } from '@angular/router';
import { AuthGuard } from './auth/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./auth/login/login').then((m) => m.Login),
  },
  {
    path: '',
    canActivate: [AuthGuard],
    children: [
      {
        path: '',
        redirectTo: '/universe',
        pathMatch: 'full',
      },
      {
        path: 'universe',
        loadComponent: () => import('./global/global-universe/global-universe.component').then((m) => m.GlobalUniverseComponent),
      },
      {
        path: 'accounts',
        loadComponent: () => import('./accounts/accounts.component').then((m) => m.AccountsComponent),
      },
      {
        path: 'trades',
        loadComponent: () => import('./trades/trades.component').then((m) => m.TradesComponent),
      },
      {
        path: 'settings',
        loadComponent: () => import('./settings/settings.component').then((m) => m.SettingsComponent),
      },
    ],
  },
  {
    path: '**',
    redirectTo: '/universe',
  },
];
```

**Updated Login Component with Return URL:**

```typescript
// Update to apps/rms/src/app/auth/login/login.ts
async onSubmit(): Promise<void> {
  if (this.loginForm.valid && !this.isSubmitting()) {
    this.isSubmitting.set(true);

    try {
      const { email, password } = this.loginForm.value;
      await this.authService.signIn(email, password);

      // Get return URL from query parameters
      const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
      await this.router.navigateByUrl(returnUrl);

    } catch (error) {
      console.error('Login failed:', error);
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
```

**App Configuration with Interceptor:**

```typescript
// apps/rms/src/app/app.config.ts
import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { AuthInterceptor } from './auth/interceptors/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideHttpClient(withInterceptors([AuthInterceptor])),
    // ... other providers
  ],
};
```

**Security Considerations:**

- Validate JWT tokens client-side before sending requests
- Implement proper CSRF protection for state-changing operations
- Use secure redirect URL validation to prevent open redirect vulnerabilities
- Log authentication events for security monitoring
- Implement rate limiting for authentication attempts
- Handle concurrent tab scenarios and token conflicts

### Testing Standards

**Source: [docs/architecture/ci-and-testing.md]**

**Testing Framework:** Vitest with Angular TestBed and HttpTestingController
**Test Location:** Test files collocated with guard and interceptor files
**Coverage Requirements:** Lines: 85%, Branches: 75%, Functions: 85%

**Testing Strategy:**

- **Unit Tests:** Test guard logic, interceptor behavior, and route protection
- **Integration Tests:** Test complete authentication flow with routing
- **E2E Tests:** Test user workflow with protected routes and redirects
- **Security Tests:** Test unauthorized access attempts and error scenarios

**Mock Setup:**

```typescript
// Mock AuthService for guard testing
const mockAuthService = {
  isAuthenticated: vi.fn(),
  getAccessToken: vi.fn(),
  signOut: vi.fn(),
};

// Mock Router for navigation testing
const mockRouter = {
  navigate: vi.fn(),
  navigateByUrl: vi.fn(),
};

// HTTP Testing setup
let httpMock: HttpTestingController;

beforeEach(() => {
  TestBed.configureTestingModule({
    imports: [HttpClientTestingModule],
    providers: [
      { provide: AuthService, useValue: mockAuthService },
      { provide: Router, useValue: mockRouter },
    ],
  });

  httpMock = TestBed.inject(HttpTestingController);
});
```

**Key Test Scenarios:**

- Authenticated user can access protected routes
- Unauthenticated user redirected to login with return URL
- HTTP requests include Authorization header with valid token
- 401/403 responses trigger automatic logout and redirect
- Return URL handling after successful login
- Token expiration detection and handling
- Concurrent request handling and error states
- Route protection inheritance for nested routes

## Change Log

| Date       | Version | Description            | Author           |
| ---------- | ------- | ---------------------- | ---------------- |
| 2024-08-30 | 1.0     | Initial story creation | Scrum Master Bob |

## Dev Agent Record

_This section will be populated by the development agent during implementation_

### Agent Model Used

_To be filled by dev agent_

### Debug Log References

_To be filled by dev agent_

### Completion Notes List

_To be filled by dev agent_

### File List

_To be filled by dev agent_

## QA Results

_Results from QA Agent review will be populated here after implementation_
