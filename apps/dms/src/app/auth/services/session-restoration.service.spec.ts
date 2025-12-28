import { TestBed } from '@angular/core/testing';

import { SessionStatus, SessionConfig } from './session-manager.service';
import { SessionRestorationService } from './session-restoration.service';
import { SessionMetadata } from './user-state.service';

describe('SessionRestorationService', () => {
  let service: SessionRestorationService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [SessionRestorationService],
    });

    service = TestBed.inject(SessionRestorationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('determineRestorationStatus', () => {
    const config: SessionConfig = {
      sessionTimeoutMinutes: 60, // 1 hour
      warningTimeMinutes: 10, // 10 minutes warning
      extendOnActivity: true,
      rememberMeEnabled: true,
    };

    it('should return expired status for expired sessions by expiration time', () => {
      const expiredSession: SessionMetadata = {
        loginTime: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        lastActivity: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
        expirationTime: new Date(Date.now() - 5 * 60 * 1000), // Expired 5 minutes ago
        rememberMe: false,
        deviceId: 'test-device',
        sessionId: 'test-session',
      };

      const result = service.determineRestorationStatus(expiredSession, config);

      expect(result.status).toBe(SessionStatus.Expired);
      expect(result.shouldStartTimers).toBe(false);
      expect(result.shouldShowWarning).toBe(false);
    });

    it('should return expired status for sessions past timeout duration', () => {
      const expiredSession: SessionMetadata = {
        loginTime: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago (past 1 hour timeout)
        lastActivity: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
        expirationTime: null,
        rememberMe: false,
        deviceId: 'test-device',
        sessionId: 'test-session',
      };

      const result = service.determineRestorationStatus(expiredSession, config);

      expect(result.status).toBe(SessionStatus.Expired);
      expect(result.shouldStartTimers).toBe(false);
      expect(result.shouldShowWarning).toBe(false);
    });

    it('should return warning status for sessions in warning period', () => {
      const warningSession: SessionMetadata = {
        loginTime: new Date(Date.now() - 55 * 60 * 1000), // 55 minutes ago (in warning period)
        lastActivity: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
        expirationTime: new Date(Date.now() + 5 * 60 * 1000), // Expires in 5 minutes
        rememberMe: false,
        deviceId: 'test-device',
        sessionId: 'test-session',
      };

      const result = service.determineRestorationStatus(warningSession, config);

      expect(result.status).toBe(SessionStatus.Warning);
      expect(result.shouldStartTimers).toBe(false);
      expect(result.shouldShowWarning).toBe(true);
    });

    it('should return active status for fresh sessions', () => {
      const activeSession: SessionMetadata = {
        loginTime: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
        lastActivity: new Date(Date.now() - 2 * 60 * 1000), // 2 minutes ago
        expirationTime: new Date(Date.now() + 30 * 60 * 1000), // Expires in 30 minutes
        rememberMe: false,
        deviceId: 'test-device',
        sessionId: 'test-session',
      };

      const result = service.determineRestorationStatus(activeSession, config);

      expect(result.status).toBe(SessionStatus.Active);
      expect(result.shouldStartTimers).toBe(true);
      expect(result.shouldShowWarning).toBe(false);
    });
  });

  describe('isSessionExpired', () => {
    const config: SessionConfig = {
      sessionTimeoutMinutes: 60,
      warningTimeMinutes: 10,
      extendOnActivity: true,
      rememberMeEnabled: true,
    };

    it('should return true for sessions with past expiration time', () => {
      const expiredSession: SessionMetadata = {
        loginTime: new Date(Date.now() - 30 * 60 * 1000),
        lastActivity: new Date(Date.now() - 10 * 60 * 1000),
        expirationTime: new Date(Date.now() - 5 * 60 * 1000), // Expired 5 minutes ago
        rememberMe: false,
        deviceId: 'test-device',
        sessionId: 'test-session',
      };

      expect(service.isSessionExpired(expiredSession, config)).toBe(true);
    });

    it('should return true for sessions past timeout duration', () => {
      const expiredSession: SessionMetadata = {
        loginTime: new Date(Date.now() - 90 * 60 * 1000), // 90 minutes ago
        lastActivity: new Date(Date.now() - 30 * 60 * 1000),
        expirationTime: null,
        rememberMe: false,
        deviceId: 'test-device',
        sessionId: 'test-session',
      };

      expect(service.isSessionExpired(expiredSession, config)).toBe(true);
    });

    it('should return false for active sessions', () => {
      const activeSession: SessionMetadata = {
        loginTime: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
        lastActivity: new Date(Date.now() - 5 * 60 * 1000),
        expirationTime: new Date(Date.now() + 30 * 60 * 1000), // Expires in 30 minutes
        rememberMe: false,
        deviceId: 'test-device',
        sessionId: 'test-session',
      };

      expect(service.isSessionExpired(activeSession, config)).toBe(false);
    });
  });

  describe('shouldShowWarning', () => {
    const config: SessionConfig = {
      sessionTimeoutMinutes: 60,
      warningTimeMinutes: 10,
      extendOnActivity: true,
      rememberMeEnabled: true,
    };

    it('should return false for expired sessions', () => {
      const expiredSession: SessionMetadata = {
        loginTime: new Date(Date.now() - 90 * 60 * 1000), // 90 minutes ago
        lastActivity: new Date(Date.now() - 30 * 60 * 1000),
        expirationTime: null,
        rememberMe: false,
        deviceId: 'test-device',
        sessionId: 'test-session',
      };

      expect(service.shouldShowWarning(expiredSession, config)).toBe(false);
    });

    it('should return true for sessions in warning period', () => {
      const warningSession: SessionMetadata = {
        loginTime: new Date(Date.now() - 55 * 60 * 1000), // 55 minutes ago
        lastActivity: new Date(Date.now() - 5 * 60 * 1000),
        expirationTime: new Date(Date.now() + 5 * 60 * 1000), // Expires in 5 minutes
        rememberMe: false,
        deviceId: 'test-device',
        sessionId: 'test-session',
      };

      expect(service.shouldShowWarning(warningSession, config)).toBe(true);
    });

    it('should return false for active sessions not in warning period', () => {
      const activeSession: SessionMetadata = {
        loginTime: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
        lastActivity: new Date(Date.now() - 5 * 60 * 1000),
        expirationTime: new Date(Date.now() + 30 * 60 * 1000), // Expires in 30 minutes
        rememberMe: false,
        deviceId: 'test-device',
        sessionId: 'test-session',
      };

      expect(service.shouldShowWarning(activeSession, config)).toBe(false);
    });
  });
});
