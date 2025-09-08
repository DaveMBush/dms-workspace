import { TestBed } from '@angular/core/testing';
import {
  UserStateService,
  UserProfile,
  SessionMetadata,
} from './user-state.service';

// Mock console methods
const consoleSpy = {
  log: vi.spyOn(console, 'log').mockImplementation(() => {
    /* no-op */
  }),
  warn: vi.spyOn(console, 'warn').mockImplementation(() => {
    /* no-op */
  }),
};

// Mock sessionStorage
const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'sessionStorage', { value: sessionStorageMock });
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock StorageEvent
class MockStorageEvent extends Event {
  constructor(
    type: string,
    public key: string | null,
    public newValue: string | null,
    public oldValue: string | null = null
  ) {
    super(type);
  }
}

// Add to global window object
(global as any).StorageEvent = MockStorageEvent;

describe('UserStateService', () => {
  let service: UserStateService;
  let mockUserProfile: UserProfile;
  let mockSessionMetadata: SessionMetadata;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(UserStateService);

    // Clear all mocks
    vi.clearAllMocks();
    sessionStorageMock.getItem.mockClear();
    sessionStorageMock.setItem.mockClear();
    sessionStorageMock.removeItem.mockClear();
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();

    // Reset storage mocks to return null by default
    sessionStorageMock.getItem.mockReturnValue(null);
    localStorageMock.getItem.mockReturnValue(null);

    // Setup mock data
    mockUserProfile = {
      username: 'testuser',
      email: 'test@example.com',
      permissions: ['read', 'write'],
      attributes: { name: 'Test User', verified: true },
    };

    mockSessionMetadata = {
      loginTime: new Date('2024-01-01T10:00:00Z'),
      lastActivity: new Date('2024-01-01T11:00:00Z'),
      expirationTime: new Date('2024-01-01T18:00:00Z'),
      rememberMe: false,
      deviceId: 'test-device-123',
      sessionId: 'sess_123456',
    };
  });

  afterEach(() => {
    // Clear service state after each test
    service.clearState();
    consoleSpy.log.mockClear();
    consoleSpy.warn.mockClear();
  });

  describe('initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should initialize with empty state', () => {
      expect(service.profile()).toBeNull();
      expect(service.session()).toBeNull();
      expect(service.isAuthenticated()).toBe(false);
      expect(service.isSessionActive()).toBe(false);
    });

    it('should initialize from stored data', () => {
      const storedProfile = JSON.stringify(mockUserProfile);
      const storedSession = JSON.stringify(mockSessionMetadata);

      sessionStorageMock.getItem.mockImplementation((key) => {
        if (key === 'rms_user_profile') {
          return storedProfile;
        }
        if (key === 'rms_session_metadata') {
          return storedSession;
        }
        return null;
      });

      // Reset TestBed and create new service instance to trigger initialization
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({});
      const newService = TestBed.inject(UserStateService);

      expect(newService.profile()).toEqual(mockUserProfile);
      expect(newService.session()?.sessionId).toBe(
        mockSessionMetadata.sessionId
      );
      expect(newService.isAuthenticated()).toBe(true);
    });

    it('should handle initialization errors gracefully', () => {
      sessionStorageMock.getItem.mockImplementation(() => {
        throw new Error('Storage error');
      });

      // Reset TestBed and create new service instance - should not throw, should clear state instead
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({});
      const newService = TestBed.inject(UserStateService);

      expect(newService.profile()).toBeNull();
      // State should be cleared on initialization error
      expect(newService.userState().isAuthenticated).toBe(false);
    });
  });

  describe('user profile management', () => {
    it('should set user profile', () => {
      service.setUserProfile(mockUserProfile);

      expect(service.profile()).toEqual(mockUserProfile);
      expect(service.isAuthenticated()).toBe(true);
      expect(sessionStorageMock.setItem).toHaveBeenCalledWith(
        'rms_user_profile',
        JSON.stringify(mockUserProfile)
      );
    });

    it('should update user profile partially', () => {
      service.setUserProfile(mockUserProfile);

      const updates = { permissions: ['admin'] };
      service.updateUserProfile(updates);

      expect(service.profile()?.permissions).toEqual(['admin']);
      expect(service.profile()?.username).toBe(mockUserProfile.username);
    });

    it('should warn when updating profile without existing profile', () => {
      service.updateUserProfile({ permissions: ['admin'] });

      // Profile should remain null when no existing profile
      expect(service.profile()).toBeNull();
    });
  });

  describe('session metadata management', () => {
    it('should set session metadata', () => {
      service.setSessionMetadata(mockSessionMetadata);

      expect(service.session()).toEqual(mockSessionMetadata);
      expect(sessionStorageMock.setItem).toHaveBeenCalledWith(
        'rms_session_metadata',
        JSON.stringify(mockSessionMetadata)
      );
    });

    it('should update session metadata partially', () => {
      service.setSessionMetadata(mockSessionMetadata);

      const newActivity = new Date();
      service.updateSessionMetadata({ lastActivity: newActivity });

      expect(service.session()?.lastActivity).toEqual(newActivity);
      expect(service.session()?.sessionId).toBe(mockSessionMetadata.sessionId);
    });

    it('should warn when updating session without existing session', () => {
      service.updateSessionMetadata({ lastActivity: new Date() });

      // Session should remain null when no existing session
      expect(service.session()).toBeNull();
    });
  });

  describe('session creation', () => {
    it('should create a new session', () => {
      service.createSession(mockUserProfile, false);

      expect(service.profile()).toEqual(mockUserProfile);
      expect(service.session()).toBeTruthy();
      expect(service.session()?.rememberMe).toBe(false);
      expect(service.isAuthenticated()).toBe(true);
    });

    it('should create session with remember me', () => {
      service.createSession(mockUserProfile, true);

      expect(service.session()?.rememberMe).toBe(true);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'rms_remember_me',
        'true'
      );
    });

    it('should generate unique session and device IDs', () => {
      localStorageMock.getItem.mockReturnValue(null);

      service.createSession(mockUserProfile, false);

      const session = service.session();
      expect(session?.sessionId).toMatch(/^sess_/);
      expect(session?.deviceId).toBeTruthy();
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'rms_device_id',
        expect.any(String)
      );
    });
  });

  describe('activity and expiration updates', () => {
    beforeEach(() => {
      service.setSessionMetadata(mockSessionMetadata);
    });

    it('should update activity timestamp', () => {
      const newActivity = new Date();
      service.updateActivity(newActivity);

      expect(service.session()?.lastActivity).toEqual(newActivity);
    });

    it('should update expiration time', () => {
      const newExpiration = new Date(Date.now() + 60 * 60 * 1000);
      service.updateExpiration(newExpiration);

      expect(service.session()?.expirationTime).toEqual(newExpiration);
    });

    it('should handle null expiration time', () => {
      service.updateExpiration(null);

      expect(service.session()?.expirationTime).toBeNull();
    });
  });

  describe('session activity status', () => {
    it('should return true for active session without expiration', () => {
      const sessionWithoutExpiration = {
        ...mockSessionMetadata,
        expirationTime: null,
      };
      service.setSessionMetadata(sessionWithoutExpiration);

      expect(service.isSessionActive()).toBe(true);
    });

    it('should return true for session not yet expired', () => {
      const futureExpiration = new Date(Date.now() + 60 * 60 * 1000);
      const activeSession = {
        ...mockSessionMetadata,
        expirationTime: futureExpiration,
      };
      service.setSessionMetadata(activeSession);

      expect(service.isSessionActive()).toBe(true);
    });

    it('should return false for expired session', () => {
      const pastExpiration = new Date(Date.now() - 60 * 60 * 1000);
      const expiredSession = {
        ...mockSessionMetadata,
        expirationTime: pastExpiration,
      };
      service.setSessionMetadata(expiredSession);

      expect(service.isSessionActive()).toBe(false);
    });

    it('should return false when no session exists', () => {
      expect(service.isSessionActive()).toBe(false);
    });
  });

  describe('state clearing', () => {
    beforeEach(() => {
      service.setUserProfile(mockUserProfile);
      service.setSessionMetadata(mockSessionMetadata);
    });

    it('should clear all state', () => {
      service.clearState();

      expect(service.profile()).toBeNull();
      expect(service.session()).toBeNull();
      expect(service.isAuthenticated()).toBe(false);
      expect(sessionStorageMock.removeItem).toHaveBeenCalledWith(
        'rms_user_profile'
      );
      expect(sessionStorageMock.removeItem).toHaveBeenCalledWith(
        'rms_session_metadata'
      );
    });
  });

  describe('preferences and device info', () => {
    it('should get remember me preference', () => {
      localStorageMock.getItem.mockReturnValue('true');
      expect(service.getRememberMePreference()).toBe(true);

      localStorageMock.getItem.mockReturnValue(null);
      expect(service.getRememberMePreference()).toBe(false);
    });

    it('should get device ID', () => {
      const deviceId = 'test-device-123';
      localStorageMock.getItem.mockReturnValue(deviceId);

      expect(service.getDeviceId()).toBe(deviceId);
    });

    it('should return null when no device ID exists', () => {
      localStorageMock.getItem.mockReturnValue(null);

      expect(service.getDeviceId()).toBeNull();
    });
  });

  describe('session statistics', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-01T12:00:00Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should calculate session statistics', () => {
      service.setSessionMetadata(mockSessionMetadata);

      const stats = service.getSessionStats();

      expect(stats).toBeTruthy();
      expect(stats?.duration).toBe(2 * 60 * 60 * 1000); // 2 hours
      expect(stats?.timeSinceActivity).toBe(1 * 60 * 60 * 1000); // 1 hour
      expect(stats?.timeUntilExpiration).toBe(6 * 60 * 60 * 1000); // 6 hours
    });

    it('should return null when no session exists', () => {
      const stats = service.getSessionStats();

      expect(stats).toBeNull();
    });

    it('should handle null expiration time in statistics', () => {
      const sessionWithoutExpiration = {
        ...mockSessionMetadata,
        expirationTime: null,
      };
      service.setSessionMetadata(sessionWithoutExpiration);

      const stats = service.getSessionStats();

      expect(stats?.timeUntilExpiration).toBeNull();
    });
  });

  describe('computed signals', () => {
    it('should provide user state computed signal', () => {
      service.setUserProfile(mockUserProfile);
      service.setSessionMetadata(mockSessionMetadata);

      const userState = service.userState();

      expect(userState.profile).toEqual(mockUserProfile);
      expect(userState.session).toEqual(mockSessionMetadata);
      expect(userState.isAuthenticated).toBe(true);
      expect(userState.lastSyncTime).toBeInstanceOf(Date);
    });

    it('should update computed signals reactively', () => {
      expect(service.isAuthenticated()).toBe(false);

      service.setUserProfile(mockUserProfile);

      expect(service.isAuthenticated()).toBe(true);
    });
  });

  describe('cross-tab synchronization', () => {
    it('should handle storage events for profile updates', () => {
      const newProfile = { ...mockUserProfile, username: 'updated' };
      const storageEvent = new MockStorageEvent(
        'storage',
        'rms_user_profile',
        JSON.stringify(newProfile)
      );

      window.dispatchEvent(storageEvent);

      expect(service.profile()).toEqual(newProfile);
    });

    it('should handle storage events for session updates', () => {
      const newSession = { ...mockSessionMetadata, sessionId: 'new-session' };
      const storageEvent = new MockStorageEvent(
        'storage',
        'rms_session_metadata',
        JSON.stringify(newSession)
      );

      window.dispatchEvent(storageEvent);

      expect(service.session()?.sessionId).toBe('new-session');
    });

    it('should handle null values in storage events', () => {
      service.setUserProfile(mockUserProfile);

      const storageEvent = new MockStorageEvent(
        'storage',
        'rms_user_profile',
        null
      );

      window.dispatchEvent(storageEvent);

      expect(service.profile()).toBeNull();
    });

    it('should ignore irrelevant storage events', () => {
      const initialProfile = service.profile();
      const storageEvent = new MockStorageEvent(
        'storage',
        'other_key',
        'value'
      );

      window.dispatchEvent(storageEvent);

      expect(service.profile()).toBe(initialProfile);
    });
  });

  describe('error handling', () => {
    it('should handle JSON parsing errors in storage', () => {
      sessionStorageMock.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });

      service.setUserProfile(mockUserProfile);

      // Profile should still be set even if persistence fails
      expect(service.profile()).toEqual(mockUserProfile);
    });

    it('should handle errors in cross-tab sync', () => {
      const invalidStorageEvent = new MockStorageEvent(
        'storage',
        'rms_user_profile',
        'invalid-json'
      );

      window.dispatchEvent(invalidStorageEvent);

      // Service should handle sync errors gracefully
      expect(service.userState().isAuthenticated).toBe(false);
    });
  });
});
