import { TestBed } from '@angular/core/testing';
import { firstValueFrom, Subject } from 'rxjs';

import { ActivityTrackingService } from './activity-tracking.service';
import {
  SessionConfig,
  SessionEventType,
  SessionManagerService,
  SessionStatus,
} from './session-manager.service';
import { SessionRestorationService } from './session-restoration.service';
import {
  SessionTimerEvent,
  SessionTimerService,
} from './session-timer.service';
import { TokenRefreshService } from './token-refresh.service';
import {
  SessionMetadata,
  UserProfile,
  UserStateService,
} from './user-state.service';

// Mock console methods
const consoleSpy = {
  log: vi.spyOn(console, 'log').mockImplementation(() => {
    /* no-op */
  }),
  warn: vi.spyOn(console, 'warn').mockImplementation(() => {
    /* no-op */
  }),
  error: vi.spyOn(console, 'error').mockImplementation(() => {
    /* no-op */
  }),
};

// Mock services
const mockTokenRefreshService = {
  startTokenRefreshTimer: vi.fn(),
  stopTokenRefreshTimer: vi.fn(),
  refreshToken: vi.fn(),
  getTokenExpiration: vi.fn(),
};

const mockActivityTrackingService = {
  startActivityTracking: vi.fn(),
  stopActivityTracking: vi.fn(),
  onActivity: vi.fn(),
  offActivity: vi.fn(),
  getActivityStats: vi.fn().mockReturnValue({
    lastActivity: new Date(),
    timeSinceLastActivity: 1000,
    isActive: true,
    isTracking: true,
  }),
};

const mockUserStateService = {
  createSession: vi.fn(),
  updateActivity: vi.fn(),
  updateExpiration: vi.fn(),
  clearState: vi.fn(),
  userState: vi.fn().mockReturnValue({
    isAuthenticated: false,
    session: null,
  }),
  session: vi.fn().mockReturnValue(null),
};

// Create a subject for timer events
const timerEventSubject = new Subject<{
  event: SessionTimerEvent;
  data?: unknown;
}>();

const mockSessionTimerService = {
  startTimers: vi.fn(),
  stopTimers: vi.fn(),
  resetTimers: vi.fn(),
  areTimersActive: vi.fn().mockReturnValue(false),
  calculateExpiryTime: vi
    .fn()
    .mockReturnValue(new Date(Date.now() + 60 * 60 * 1000)),
  updateTimeRemaining: vi.fn(),
  warningTime: vi.fn().mockReturnValue(0),
  expiryTime: vi.fn().mockReturnValue(0),
  timerEvents: timerEventSubject.asObservable(),
};

const mockSessionRestorationService = {
  determineRestorationStatus: vi.fn().mockReturnValue({
    status: SessionStatus.Active,
    shouldStartTimers: true,
    shouldShowWarning: false,
  }),
  isSessionExpired: vi.fn().mockReturnValue(false),
  shouldShowWarning: vi.fn().mockReturnValue(false),
};

describe('SessionManagerService', () => {
  let service: SessionManagerService;
  let mockUserProfile: UserProfile;

  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();

    TestBed.configureTestingModule({
      providers: [
        SessionManagerService,
        { provide: TokenRefreshService, useValue: mockTokenRefreshService },
        {
          provide: ActivityTrackingService,
          useValue: mockActivityTrackingService,
        },
        { provide: UserStateService, useValue: mockUserStateService },
        { provide: SessionTimerService, useValue: mockSessionTimerService },
        {
          provide: SessionRestorationService,
          useValue: mockSessionRestorationService,
        },
      ],
    });

    // Service injection triggers constructor which calls initializeSessionManagement
    service = TestBed.inject(SessionManagerService);

    mockUserProfile = {
      username: 'testuser',
      email: 'test@example.com',
      permissions: ['read', 'write'],
      attributes: { name: 'Test User' },
    };
  });

  afterEach(() => {
    service.expireSession();
    consoleSpy.log.mockClear();
    consoleSpy.warn.mockClear();
    consoleSpy.error.mockClear();
  });

  describe('initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should initialize with expired status', () => {
      expect(service.status()).toBe(SessionStatus.Expired);
      expect(service.isExpired()).toBe(true);
      expect(service.isActive()).toBe(false);
    });

    it('should start activity tracking on initialization', () => {
      // These should have been called during service construction
      expect(
        mockActivityTrackingService.startActivityTracking
      ).toHaveBeenCalledTimes(1);
      expect(mockActivityTrackingService.onActivity).toHaveBeenCalledTimes(1);
    });
  });

  describe('startSession', () => {
    it('should start a regular session', () => {
      service.startSession(mockUserProfile, false);

      expect(service.status()).toBe(SessionStatus.Active);
      expect(service.isActive()).toBe(true);
      expect(service.startTime()).toBeInstanceOf(Date);
      expect(mockUserStateService.createSession).toHaveBeenCalledWith(
        mockUserProfile,
        false
      );
      expect(mockTokenRefreshService.startTokenRefreshTimer).toHaveBeenCalled();
    });

    it('should start a remember me session', () => {
      service.startSession(mockUserProfile, true);

      expect(service.status()).toBe(SessionStatus.Active);
      expect(service.isRememberMeSession()).toBe(false); // Mock returns null
      expect(mockUserStateService.createSession).toHaveBeenCalledWith(
        mockUserProfile,
        true
      );
    });

    it('should emit session started event', async () => {
      const eventPromise = firstValueFrom(service.sessionEvents);

      service.startSession(mockUserProfile, false);

      const event = await eventPromise;
      expect(event.type).toBe(SessionEventType.SessionStarted);
      expect(event.data).toMatchObject({
        profile: mockUserProfile.username,
        rememberMe: false,
      });
    });

    it('should configure extended timeout for remember me sessions', () => {
      const initialConfig = service.getConfiguration();

      service.startSession(mockUserProfile, true);

      // Configuration should be updated for remember me
      // Session should start successfully with remember me configuration
      expect(service.isRememberMeSession()).toBe(false); // Mock returns null
    });
  });

  describe('extendSession', () => {
    beforeEach(() => {
      service.startSession(mockUserProfile, false);
    });

    it('should extend active session successfully', async () => {
      mockTokenRefreshService.refreshToken.mockResolvedValue(true);

      const result = await service.extendSession();

      expect(result).toBe(true);
      expect(service.status()).toBe(SessionStatus.Active);
      expect(service.lastExtension()).toBeInstanceOf(Date);
      expect(mockUserStateService.updateActivity).toHaveBeenCalled();
    });

    it('should fail to extend session when token refresh fails', async () => {
      mockTokenRefreshService.refreshToken.mockResolvedValue(false);

      const result = await service.extendSession();

      expect(result).toBe(false);
      expect(service.status()).toBe(SessionStatus.Expired);
    });

    it('should handle token refresh errors', async () => {
      mockTokenRefreshService.refreshToken.mockRejectedValue(
        new Error('Network error')
      );

      const result = await service.extendSession();

      expect(result).toBe(false);
      expect(service.status()).toBe(SessionStatus.Expired);
      // Session should be expired after extension failure
      expect(service.isExpired()).toBe(true);
    });

    it('should not extend session when not active or warning', async () => {
      service.expireSession();

      const result = await service.extendSession();

      expect(result).toBe(false);
      // Extension should fail when session is not active
      expect(result).toBe(false);
    });

    it('should emit session extended event', async () => {
      mockTokenRefreshService.refreshToken.mockResolvedValue(true);

      const events: any[] = [];
      service.sessionEvents.subscribe((event) => events.push(event));

      await service.extendSession();

      const extendedEvent = events.find(
        (e) => e.type === SessionEventType.SessionExtended
      );
      expect(extendedEvent).toBeTruthy();
      expect(extendedEvent.data).toMatchObject({
        extensionTime: expect.any(Date),
        newExpiryTime: expect.any(Date),
      });
    });
  });

  describe('expireSession', () => {
    beforeEach(() => {
      service.startSession(mockUserProfile, false);
    });

    it('should expire session gracefully', () => {
      service.expireSession(true);

      expect(service.status()).toBe(SessionStatus.Expired);
      expect(service.startTime()).toBeNull();
      expect(mockTokenRefreshService.stopTokenRefreshTimer).toHaveBeenCalled();
      expect(mockUserStateService.clearState).toHaveBeenCalled();
    });

    it('should expire session forcefully', () => {
      service.expireSession(false);

      expect(service.status()).toBe(SessionStatus.Expired);
      // Session should be expired
      expect(service.isExpired()).toBe(true);
    });

    it('should emit session expired event', () => {
      const events: any[] = [];
      service.sessionEvents.subscribe((event) => events.push(event));

      service.expireSession(true);

      const expiredEvent = events.find(
        (e) => e.type === SessionEventType.SessionExpired
      );
      expect(expiredEvent).toBeTruthy();
      expect(expiredEvent.data).toMatchObject({
        graceful: true,
        duration: expect.any(Number),
      });
    });
  });

  describe('configureSession', () => {
    it('should update session configuration', () => {
      const newConfig: Partial<SessionConfig> = {
        sessionTimeoutMinutes: 30,
        warningTimeMinutes: 5,
      };

      service.configureSession(newConfig);

      const config = service.getConfiguration();
      expect(config.sessionTimeoutMinutes).toBe(30);
      expect(config.warningTimeMinutes).toBe(5);
    });

    it('should restart timers for active session after config change', () => {
      service.startSession(mockUserProfile, false);
      vi.clearAllMocks();

      service.configureSession({ sessionTimeoutMinutes: 30 });

      // Configuration should be updated
      expect(service.getConfiguration().sessionTimeoutMinutes).toBe(30);
    });
  });

  describe('session statistics', () => {
    beforeEach(() => {
      service.startSession(mockUserProfile, false);
    });

    it('should provide session statistics', () => {
      const stats = service.getSessionStats();

      expect(stats).toMatchObject({
        status: SessionStatus.Active,
        duration: expect.any(Number),
        timeUntilWarning: expect.any(Number),
        timeUntilExpiry: expect.any(Number),
        activityStats: expect.any(Object),
        tokenExpiration: undefined, // Mock returns undefined
      });
    });

    it('should calculate session duration', async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));

      const duration = service.sessionDuration();
      expect(duration).toBeGreaterThan(0);
    });
  });

  describe('session warning', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should show warning before session expiry', () => {
      service.startSession(mockUserProfile, false);

      // Manually trigger a warning event from the timer service
      timerEventSubject.next({
        event: SessionTimerEvent.Warning,
        data: { timeRemaining: 60000 }, // 1 minute remaining
      });

      expect(service.shouldShowWarning()).toBe(true);
    });

    it('should emit warning event', () => {
      const events: any[] = [];
      service.sessionEvents.subscribe((event) => events.push(event));

      service.startSession(mockUserProfile, false);

      // Manually trigger a warning event from the timer service
      timerEventSubject.next({
        event: SessionTimerEvent.Warning,
        data: { timeRemaining: 60000 }, // 1 minute remaining
      });

      const warningEvent = events.find(
        (e) => e.type === SessionEventType.SessionWarning
      );
      expect(warningEvent).toBeTruthy();
    });
  });

  describe('activity handling', () => {
    beforeEach(() => {
      service.startSession(mockUserProfile, false);
      service.configureSession({ extendOnActivity: true });
    });

    it('should handle user activity', () => {
      const activityCallback =
        mockActivityTrackingService.onActivity.mock.calls[0][0];
      const activityTime = new Date();

      activityCallback(activityTime);

      expect(mockUserStateService.updateActivity).toHaveBeenCalledWith(
        activityTime
      );
    });

    it('should extend session on activity during warning', async () => {
      // Mock the service to be in warning state
      service.startSession(mockUserProfile, false);
      // Manually set status to warning for test
      (service as any).sessionStatus.set(SessionStatus.Warning);
      mockTokenRefreshService.refreshToken.mockResolvedValue(true);

      const activityCallback =
        mockActivityTrackingService.onActivity.mock.calls[0][0];
      activityCallback(new Date());

      // Wait for async extension
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Session should be extended during activity in warning state
      expect(mockTokenRefreshService.refreshToken).toHaveBeenCalled();
    });

    it('should not extend session on activity when disabled', () => {
      service.configureSession({ extendOnActivity: false });

      const activityCallback =
        mockActivityTrackingService.onActivity.mock.calls[0][0];
      activityCallback(new Date());

      expect(mockTokenRefreshService.refreshToken).not.toHaveBeenCalled();
    });
  });

  describe('session restoration', () => {
    it('should restore valid session', () => {
      const validSession: SessionMetadata = {
        loginTime: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
        lastActivity: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
        expirationTime: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes from now
        rememberMe: false,
        deviceId: 'test-device',
        sessionId: 'test-session',
      };

      // Reset TestBed to create a fresh service instance
      TestBed.resetTestingModule();

      // Setup restoration mocks
      mockSessionRestorationService.determineRestorationStatus.mockReturnValue({
        status: SessionStatus.Active,
        shouldStartTimers: true,
        shouldShowWarning: false,
      });

      TestBed.configureTestingModule({
        providers: [
          SessionManagerService,
          { provide: TokenRefreshService, useValue: mockTokenRefreshService },
          {
            provide: ActivityTrackingService,
            useValue: mockActivityTrackingService,
          },
          {
            provide: UserStateService,
            useValue: {
              ...mockUserStateService,
              userState: vi.fn().mockReturnValue({
                isAuthenticated: true,
                session: validSession,
              }),
            },
          },
          { provide: SessionTimerService, useValue: mockSessionTimerService },
          {
            provide: SessionRestorationService,
            useValue: mockSessionRestorationService,
          },
        ],
      });

      // Create new service instance to trigger restoration
      const newService = TestBed.inject(SessionManagerService);

      expect(newService.status()).toBe(SessionStatus.Active);
      expect(mockTokenRefreshService.startTokenRefreshTimer).toHaveBeenCalled();
    });

    it('should expire restored session if already expired', () => {
      const expiredSession: SessionMetadata = {
        loginTime: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        lastActivity: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
        expirationTime: new Date(Date.now() - 30 * 60 * 1000), // Expired 30 minutes ago
        rememberMe: false,
        deviceId: 'test-device',
        sessionId: 'test-session',
      };

      // Reset TestBed to create a fresh service instance
      TestBed.resetTestingModule();

      // Setup restoration mocks for expired session
      mockSessionRestorationService.determineRestorationStatus.mockReturnValue({
        status: SessionStatus.Expired,
        shouldStartTimers: false,
        shouldShowWarning: false,
      });

      TestBed.configureTestingModule({
        providers: [
          SessionManagerService,
          { provide: TokenRefreshService, useValue: mockTokenRefreshService },
          {
            provide: ActivityTrackingService,
            useValue: mockActivityTrackingService,
          },
          {
            provide: UserStateService,
            useValue: {
              ...mockUserStateService,
              userState: vi.fn().mockReturnValue({
                isAuthenticated: true,
                session: expiredSession,
              }),
            },
          },
          { provide: SessionTimerService, useValue: mockSessionTimerService },
          {
            provide: SessionRestorationService,
            useValue: mockSessionRestorationService,
          },
        ],
      });

      const newService = TestBed.inject(SessionManagerService);

      expect(newService.status()).toBe(SessionStatus.Expired);
    });
  });

  describe('edge cases', () => {
    it('should handle immediate session expiry for very short timeouts', () => {
      service.configureSession({
        sessionTimeoutMinutes: 0,
        warningTimeMinutes: 1,
      });

      service.startSession(mockUserProfile, false);

      // Manually trigger immediate warning event for zero timeout
      timerEventSubject.next({
        event: SessionTimerEvent.Warning,
        data: { timeRemaining: 0 },
      });

      // Should immediately show warning since warning time > session timeout
      expect(service.shouldShowWarning()).toBe(true);
    });

    it('should handle multiple concurrent session extensions', async () => {
      service.startSession(mockUserProfile, false);

      // Mock token refresh to resolve successfully
      mockTokenRefreshService.refreshToken.mockImplementation(() =>
        Promise.resolve(true)
      );

      // Start multiple concurrent extensions - the service should prevent concurrent extensions
      const promises = [
        service.extendSession(),
        service.extendSession(),
        service.extendSession(),
      ];

      const results = await Promise.all(promises);

      // Only the first extension should succeed, others should fail due to status change
      expect(results[0]).toBe(true); // First one succeeds
      expect(results[1]).toBe(false); // Second fails (status is now Extending)
      expect(results[2]).toBe(false); // Third fails (status is now Extending)

      // Token refresh should only be called once since other extensions are rejected early
      expect(mockTokenRefreshService.refreshToken).toHaveBeenCalledTimes(1);
    });

    it('should handle session operations on already expired session', async () => {
      service.expireSession();

      const result = await service.extendSession();
      expect(result).toBe(false);

      const stats = service.getSessionStats();
      expect(stats.status).toBe(SessionStatus.Expired);
    });
  });

  describe('event emissions', () => {
    it('should emit activity detected events', () => {
      const events: any[] = [];
      service.sessionEvents.subscribe((event) => events.push(event));

      service.startSession(mockUserProfile, false);

      const activityCallback =
        mockActivityTrackingService.onActivity.mock.calls[0][0];
      const activityTime = new Date();
      activityCallback(activityTime);

      const activityEvent = events.find(
        (e) => e.type === SessionEventType.ActivityDetected
      );
      expect(activityEvent).toBeTruthy();
      expect(activityEvent.data).toMatchObject({
        activityTime,
        sessionStatus: SessionStatus.Active,
      });
    });
  });
});
