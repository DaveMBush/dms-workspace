import { TestBed } from '@angular/core/testing';
import {
  Router,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
} from '@angular/router';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { AuthService } from '../auth.service';
import { authGuard, guestGuard } from './auth.guard';

describe('Auth Guards', () => {
  let mockAuthService: {
    isAuthenticated: ReturnType<typeof vi.fn>;
    isSessionValid: ReturnType<typeof vi.fn>;
    signOut: ReturnType<typeof vi.fn>;
  };
  let mockRouter: {
    navigate: ReturnType<typeof vi.fn>;
  };
  let mockRoute: ActivatedRouteSnapshot;
  let mockState: RouterStateSnapshot;

  beforeEach(() => {
    mockAuthService = {
      isAuthenticated: vi.fn(),
      isSessionValid: vi.fn(),
      signOut: vi.fn(),
    };
    mockRouter = {
      navigate: vi.fn(),
    };

    mockRoute = {} as ActivatedRouteSnapshot;
    mockState = {
      url: '/protected-route',
    } as RouterStateSnapshot;

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter },
      ],
    });
  });

  describe('authGuard', () => {
    it('should allow access when user is authenticated and session is valid', async () => {
      mockAuthService.isAuthenticated.mockReturnValue(true);
      mockAuthService.isSessionValid.mockResolvedValue(true);

      const result = await TestBed.runInInjectionContext(() =>
        authGuard(mockRoute, mockState)
      );

      expect(result).toBe(true);
      expect(mockAuthService.isAuthenticated).toHaveBeenCalled();
      expect(mockAuthService.isSessionValid).toHaveBeenCalled();
      expect(mockRouter.navigate).not.toHaveBeenCalled();
    });

    it('should sign out and deny access when user is authenticated but session is invalid', async () => {
      mockAuthService.isAuthenticated.mockReturnValue(true);
      mockAuthService.isSessionValid.mockResolvedValue(false);
      mockAuthService.signOut.mockResolvedValue(undefined);

      const result = await TestBed.runInInjectionContext(() =>
        authGuard(mockRoute, mockState)
      );

      expect(result).toBe(false);
      expect(mockAuthService.isAuthenticated).toHaveBeenCalled();
      expect(mockAuthService.isSessionValid).toHaveBeenCalled();
      expect(mockAuthService.signOut).toHaveBeenCalled();
    });

    it('should redirect to login when user is not authenticated', async () => {
      mockAuthService.isAuthenticated.mockReturnValue(false);
      mockRouter.navigate.mockResolvedValue(true);

      const result = await TestBed.runInInjectionContext(() =>
        authGuard(mockRoute, mockState)
      );

      expect(result).toBe(false);
      expect(mockAuthService.isAuthenticated).toHaveBeenCalled();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/auth/login'], {
        queryParams: { returnUrl: '/protected-route' },
      });
    });

    it('should handle navigation errors gracefully', async () => {
      mockAuthService.isAuthenticated.mockReturnValue(false);
      mockRouter.navigate.mockRejectedValue(new Error('Navigation failed'));

      const result = await TestBed.runInInjectionContext(() =>
        authGuard(mockRoute, mockState)
      );

      expect(result).toBe(false);
      expect(mockAuthService.isAuthenticated).toHaveBeenCalled();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/auth/login'], {
        queryParams: { returnUrl: '/protected-route' },
      });
    });

    it('should handle session validation errors', async () => {
      mockAuthService.isAuthenticated.mockReturnValue(true);
      mockAuthService.isSessionValid.mockRejectedValue(
        new Error('Session check failed')
      );
      mockAuthService.signOut.mockResolvedValue(undefined);

      const result = await TestBed.runInInjectionContext(() =>
        authGuard(mockRoute, mockState)
      );

      expect(result).toBe(false);
      expect(mockAuthService.isAuthenticated).toHaveBeenCalled();
      expect(mockAuthService.isSessionValid).toHaveBeenCalled();
      expect(mockAuthService.signOut).toHaveBeenCalled();
    });

    it('should handle signOut errors gracefully', async () => {
      mockAuthService.isAuthenticated.mockReturnValue(true);
      mockAuthService.isSessionValid.mockResolvedValue(false);
      mockAuthService.signOut.mockRejectedValue(new Error('SignOut failed'));

      const result = await TestBed.runInInjectionContext(() =>
        authGuard(mockRoute, mockState)
      );

      expect(result).toBe(false);
      expect(mockAuthService.isAuthenticated).toHaveBeenCalled();
      expect(mockAuthService.isSessionValid).toHaveBeenCalled();
      expect(mockAuthService.signOut).toHaveBeenCalled();
    });

    it('should preserve complex URLs with query params and fragments', async () => {
      const complexState = {
        url: '/protected-route?param=value&other=test#section',
      } as RouterStateSnapshot;

      mockAuthService.isAuthenticated.mockReturnValue(false);
      mockRouter.navigate.mockResolvedValue(true);

      const result = await TestBed.runInInjectionContext(() =>
        authGuard(mockRoute, complexState)
      );

      expect(result).toBe(false);
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/auth/login'], {
        queryParams: {
          returnUrl: '/protected-route?param=value&other=test#section',
        },
      });
    });
  });

  describe('guestGuard', () => {
    it('should allow access when user is not authenticated', async () => {
      mockAuthService.isAuthenticated.mockReturnValue(false);

      const result = await TestBed.runInInjectionContext(() =>
        guestGuard(mockRoute, mockState)
      );

      expect(result).toBe(true);
      expect(mockAuthService.isAuthenticated).toHaveBeenCalled();
      expect(mockRouter.navigate).not.toHaveBeenCalled();
    });

    it('should redirect to dashboard when user is authenticated', async () => {
      mockAuthService.isAuthenticated.mockReturnValue(true);
      mockRouter.navigate.mockResolvedValue(true);

      const result = await TestBed.runInInjectionContext(() =>
        guestGuard(mockRoute, mockState)
      );

      expect(result).toBe(false);
      expect(mockAuthService.isAuthenticated).toHaveBeenCalled();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/']);
    });

    it('should handle navigation errors gracefully', async () => {
      mockAuthService.isAuthenticated.mockReturnValue(true);
      mockRouter.navigate.mockRejectedValue(new Error('Navigation failed'));

      const result = await TestBed.runInInjectionContext(() =>
        guestGuard(mockRoute, mockState)
      );

      expect(result).toBe(false);
      expect(mockAuthService.isAuthenticated).toHaveBeenCalled();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/']);
    });
  });

  describe('integration scenarios', () => {
    it('should handle rapid successive guard checks', async () => {
      mockAuthService.isAuthenticated.mockReturnValue(true);
      mockAuthService.isSessionValid.mockResolvedValue(true);

      const results = await Promise.all([
        TestBed.runInInjectionContext(() => authGuard(mockRoute, mockState)),
        TestBed.runInInjectionContext(() => authGuard(mockRoute, mockState)),
        TestBed.runInInjectionContext(() => authGuard(mockRoute, mockState)),
      ]);

      expect(results).toEqual([true, true, true]);
      expect(mockAuthService.isAuthenticated).toHaveBeenCalledTimes(3);
      expect(mockAuthService.isSessionValid).toHaveBeenCalledTimes(3);
    });

    it('should handle mixed authentication states in concurrent requests', async () => {
      let callCount = 0;
      mockAuthService.isAuthenticated.mockImplementation(() => {
        callCount++;
        return callCount <= 2; // First two calls authenticated, third not
      });
      mockAuthService.isSessionValid.mockResolvedValue(true);
      mockRouter.navigate.mockResolvedValue(true);

      const results = await Promise.all([
        TestBed.runInInjectionContext(() => authGuard(mockRoute, mockState)),
        TestBed.runInInjectionContext(() => authGuard(mockRoute, mockState)),
        TestBed.runInInjectionContext(() => authGuard(mockRoute, mockState)),
      ]);

      expect(results).toEqual([true, true, false]);
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/auth/login'], {
        queryParams: { returnUrl: '/protected-route' },
      });
    });
  });
});
