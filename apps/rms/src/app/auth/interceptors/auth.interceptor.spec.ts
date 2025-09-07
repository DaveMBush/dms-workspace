import {
  HttpRequest,
  HttpErrorResponse,
  HttpResponse,
} from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { AuthService } from '../auth.service';
import { authInterceptor } from './auth.interceptor';

describe('authInterceptor', () => {
  let mockAuthService: {
    getAccessToken: ReturnType<typeof vi.fn>;
    signOut: ReturnType<typeof vi.fn>;
  };
  let mockRouter: {
    navigate: ReturnType<typeof vi.fn>;
  };
  let mockNext: {
    handle: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockAuthService = {
      getAccessToken: vi.fn(),
      signOut: vi.fn(),
    };
    mockRouter = {
      navigate: vi.fn(),
    };
    mockNext = {
      handle: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter },
      ],
    });
  });

  describe('public endpoints', () => {
    it('should not add authorization header for health endpoint', async () => {
      const req = new HttpRequest('GET', '/health');
      const response = new HttpResponse({ status: 200 });
      mockNext.handle.mockReturnValue(of(response));

      const result = TestBed.runInInjectionContext(() =>
        authInterceptor(req, mockNext.handle)
      );

      await new Promise((resolve) => {
        result.subscribe(() => resolve(undefined));
      });

      expect(mockNext.handle).toHaveBeenCalledWith(req);
      expect(mockAuthService.getAccessToken).not.toHaveBeenCalled();
    });

    it('should not add authorization header for favicon', async () => {
      const req = new HttpRequest('GET', '/favicon.ico');
      const response = new HttpResponse({ status: 200 });
      mockNext.handle.mockReturnValue(of(response));

      const result = TestBed.runInInjectionContext(() =>
        authInterceptor(req, mockNext.handle)
      );

      await new Promise((resolve) => {
        result.subscribe(() => resolve(undefined));
      });

      expect(mockNext.handle).toHaveBeenCalledWith(req);
      expect(mockAuthService.getAccessToken).not.toHaveBeenCalled();
    });
  });

  describe('auth endpoints', () => {
    it('should not add authorization header for auth endpoints', async () => {
      const req = new HttpRequest('POST', '/auth/login');
      const response = new HttpResponse({ status: 200 });
      mockNext.handle.mockReturnValue(of(response));

      const result = TestBed.runInInjectionContext(() =>
        authInterceptor(req, mockNext.handle)
      );

      await new Promise((resolve) => {
        result.subscribe(() => resolve(undefined));
      });

      expect(mockNext.handle).toHaveBeenCalledWith(req);
      expect(mockAuthService.getAccessToken).not.toHaveBeenCalled();
    });
  });

  describe('protected endpoints', () => {
    it('should add authorization header when token exists', async () => {
      const token = 'valid-jwt-token';
      const req = new HttpRequest('GET', '/api/protected');
      const response = new HttpResponse({ status: 200 });

      mockAuthService.getAccessToken.mockResolvedValue(token);
      mockNext.handle.mockReturnValue(of(response));

      const result = TestBed.runInInjectionContext(() =>
        authInterceptor(req, mockNext.handle)
      );

      await new Promise((resolve) => {
        result.subscribe(() => resolve(undefined));
      });

      expect(mockAuthService.getAccessToken).toHaveBeenCalled();

      // Check that the request was called with proper headers
      const calledRequest = mockNext.handle.mock
        .calls[0][0] as HttpRequest<unknown>;
      expect(calledRequest.headers.get('Authorization')).toBe(
        `Bearer ${token}`
      );
      expect(calledRequest.headers.get('X-Request-ID')).toBeTruthy();
    });

    it('should proceed without token when getAccessToken returns null', async () => {
      const req = new HttpRequest('GET', '/api/protected');
      const response = new HttpResponse({ status: 200 });

      mockAuthService.getAccessToken.mockResolvedValue(null);
      mockNext.handle.mockReturnValue(of(response));

      const result = TestBed.runInInjectionContext(() =>
        authInterceptor(req, mockNext.handle)
      );

      await new Promise((resolve) => {
        result.subscribe(() => resolve(undefined));
      });

      expect(mockAuthService.getAccessToken).toHaveBeenCalled();
      expect(mockNext.handle).toHaveBeenCalledWith(req);
    });

    it('should add request ID header with token', async () => {
      const token = 'valid-jwt-token';
      const req = new HttpRequest('GET', '/api/protected');
      const response = new HttpResponse({ status: 200 });

      mockAuthService.getAccessToken.mockResolvedValue(token);
      mockNext.handle.mockReturnValue(of(response));

      const result = TestBed.runInInjectionContext(() =>
        authInterceptor(req, mockNext.handle)
      );

      await new Promise((resolve) => {
        result.subscribe(() => resolve(undefined));
      });

      // Check that the request was called with request ID header
      const calledRequest = mockNext.handle.mock
        .calls[0][0] as HttpRequest<unknown>;
      expect(calledRequest.headers.get('X-Request-ID')).toBeTruthy();
    });
  });

  describe('error handling', () => {
    it('should handle 401 error and sign out user', async () => {
      const token = 'expired-token';
      const req = new HttpRequest('GET', '/api/protected');
      const error = new HttpErrorResponse({
        status: 401,
        statusText: 'Unauthorized',
      });

      mockAuthService.getAccessToken.mockResolvedValue(token);
      mockAuthService.signOut.mockResolvedValue(undefined);
      mockRouter.navigate.mockResolvedValue(true);
      mockNext.handle.mockReturnValue(throwError(() => error));

      const result = TestBed.runInInjectionContext(() =>
        authInterceptor(req, mockNext.handle)
      );

      await new Promise((resolve) => {
        result.subscribe({
          complete: () => resolve(undefined),
          error: () => resolve(undefined),
        });
      });

      expect(mockAuthService.signOut).toHaveBeenCalled();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/auth/login']);
    });

    it('should handle 403 error and sign out user', async () => {
      const token = 'insufficient-permissions-token';
      const req = new HttpRequest('GET', '/api/protected');
      const error = new HttpErrorResponse({
        status: 403,
        statusText: 'Forbidden',
      });

      mockAuthService.getAccessToken.mockResolvedValue(token);
      mockAuthService.signOut.mockResolvedValue(undefined);
      mockRouter.navigate.mockResolvedValue(true);
      mockNext.handle.mockReturnValue(throwError(() => error));

      const result = TestBed.runInInjectionContext(() =>
        authInterceptor(req, mockNext.handle)
      );

      await new Promise((resolve) => {
        result.subscribe({
          complete: () => resolve(undefined),
          error: () => resolve(undefined),
        });
      });

      expect(mockAuthService.signOut).toHaveBeenCalled();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/auth/login']);
    });

    it('should not handle non-auth errors', async () => {
      const token = 'valid-token';
      const req = new HttpRequest('GET', '/api/protected');
      const error = new HttpErrorResponse({
        status: 500,
        statusText: 'Server Error',
      });

      mockAuthService.getAccessToken.mockResolvedValue(token);
      mockNext.handle.mockReturnValue(throwError(() => error));

      const result = TestBed.runInInjectionContext(() =>
        authInterceptor(req, mockNext.handle)
      );

      await new Promise((resolve) => {
        result.subscribe({
          error: (err: unknown) => {
            expect(err).toBe(error);
            resolve(undefined);
          },
        });
      });

      expect(mockAuthService.signOut).not.toHaveBeenCalled();
      expect(mockRouter.navigate).not.toHaveBeenCalled();
    });

    it('should handle signOut errors gracefully', async () => {
      const token = 'expired-token';
      const req = new HttpRequest('GET', '/api/protected');
      const error = new HttpErrorResponse({
        status: 401,
        statusText: 'Unauthorized',
      });

      mockAuthService.getAccessToken.mockResolvedValue(token);
      mockAuthService.signOut.mockRejectedValue(new Error('SignOut failed'));
      mockRouter.navigate.mockResolvedValue(true);
      mockNext.handle.mockReturnValue(throwError(() => error));

      const result = TestBed.runInInjectionContext(() =>
        authInterceptor(req, mockNext.handle)
      );

      await new Promise((resolve) => {
        result.subscribe({
          complete: () => resolve(undefined),
          error: () => resolve(undefined),
        });
      });

      expect(mockAuthService.signOut).toHaveBeenCalled();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/auth/login']);
    });

    it('should handle navigation errors gracefully', async () => {
      const token = 'expired-token';
      const req = new HttpRequest('GET', '/api/protected');
      const error = new HttpErrorResponse({
        status: 401,
        statusText: 'Unauthorized',
      });

      mockAuthService.getAccessToken.mockResolvedValue(token);
      mockAuthService.signOut.mockResolvedValue(undefined);
      mockRouter.navigate.mockRejectedValue(new Error('Navigation failed'));
      mockNext.handle.mockReturnValue(throwError(() => error));

      const result = TestBed.runInInjectionContext(() =>
        authInterceptor(req, mockNext.handle)
      );

      await new Promise((resolve) => {
        result.subscribe({
          complete: () => resolve(undefined),
          error: () => resolve(undefined),
        });
      });

      expect(mockAuthService.signOut).toHaveBeenCalled();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/auth/login']);
    });
  });

  describe('token retrieval failure', () => {
    it('should proceed without authentication when token retrieval fails', async () => {
      const req = new HttpRequest('GET', '/api/protected');
      const response = new HttpResponse({ status: 200 });

      mockAuthService.getAccessToken.mockRejectedValue(
        new Error('Token retrieval failed')
      );
      mockNext.handle.mockReturnValue(of(response));

      const result = TestBed.runInInjectionContext(() =>
        authInterceptor(req, mockNext.handle)
      );

      await new Promise((resolve) => {
        result.subscribe(() => resolve(undefined));
      });

      expect(mockNext.handle).toHaveBeenCalledWith(req);
    });
  });
});
