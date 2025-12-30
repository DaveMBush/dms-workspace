import {
  computed,
  DestroyRef,
  inject,
  Injectable,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { fromEvent } from 'rxjs';
import { filter, map } from 'rxjs/operators';

/**
 * Interface for user session metadata
 */

export interface SessionMetadata {
  loginTime: Date;
  lastActivity: Date;
  expirationTime: Date | null;
  rememberMe: boolean;
  deviceId: string;
  sessionId: string;
}

/**
 * Interface for minimal user profile information
 */
// eslint-disable-next-line @smarttools/one-exported-item-per-file -- Required interface for UserStateService
export interface UserProfile {
  username: string;
  email: string;
  permissions: string[];
  attributes: Record<string, unknown>;
}

/**
 * Interface for complete user state
 */
// eslint-disable-next-line @smarttools/one-exported-item-per-file -- Required interface for UserStateService
export interface UserState {
  profile: UserProfile | null;
  session: SessionMetadata | null;
  isAuthenticated: boolean;
  lastSyncTime: Date;
}

/**
 * Service for managing client-side user state and session metadata
 * Provides signal-based reactive state management with cross-tab synchronization
 */
@Injectable({
  providedIn: 'root',
})
// eslint-disable-next-line @smarttools/one-exported-item-per-file -- Main service class with required interfaces
export class UserStateService {
  private destroyRef = inject(DestroyRef);

  // Private signals for state management
  private userProfile = signal<UserProfile | null>(null);
  private sessionMetadata = signal<SessionMetadata | null>(null);
  private lastSyncTime = signal<Date>(new Date());

  // Cross-tab sync state
  private crossTabSyncActive = false;

  // Public readonly signals
  readonly profile = this.userProfile.asReadonly();
  readonly session = this.sessionMetadata.asReadonly();
  readonly syncTime = this.lastSyncTime.asReadonly();

  // Computed signals
  // eslint-disable-next-line @smarttools/no-anonymous-functions -- Computed signal callback
  readonly isAuthenticated = computed(() => this.userProfile() !== null);

  // eslint-disable-next-line @smarttools/no-anonymous-functions -- Computed signal callback
  readonly isSessionActive = computed(() => {
    const session = this.sessionMetadata();
    if (!session?.expirationTime) {
      return session !== null;
    }
    return Date.now() < session.expirationTime.getTime();
  });

  // Storage keys
  private readonly storageKeys = {
    userProfile: 'dms_user_profile',
    sessionMetadata: 'dms_session_metadata',
    deviceId: 'dms_device_id',
    rememberMe: 'dms_remember_me',
  } as const;

  constructor() {
    this.initializeState();
    // Cross-tab sync will be started when a session is created
  }

  /**
   * Get current user state snapshot
   * Note: Use individual signals instead of this method for reactive updates
   */
  getUserState(): UserState {
    return {
      profile: this.userProfile(),
      session: this.sessionMetadata(),
      isAuthenticated: this.isAuthenticated(),
      lastSyncTime: this.lastSyncTime(),
    };
  }

  /**
   * Initialize user state from stored data
   */
  initializeState(): void {
    try {
      // Load user profile
      const storedProfile = sessionStorage.getItem(
        this.storageKeys.userProfile
      );
      if (storedProfile !== null && storedProfile.length > 0) {
        const profile = JSON.parse(storedProfile) as UserProfile;
        this.userProfile.set(profile);
      }

      // Load session metadata
      const storedSession = sessionStorage.getItem(
        this.storageKeys.sessionMetadata
      );
      if (storedSession !== null && storedSession.length > 0) {
        const session = JSON.parse(
          storedSession,
          this.dateReviver.bind(this)
        ) as SessionMetadata;
        this.sessionMetadata.set(session);
      }

      this.lastSyncTime.set(new Date());

      // Set up cross-tab sync if we have an existing session
      if (this.userProfile() !== null && this.sessionMetadata() !== null) {
        this.setupCrossTabSync();
      }

      // User state initialized from storage
    } catch {
      // Failed to initialize user state from storage
      this.clearState();
    }
  }

  /**
   * Set user profile information
   */
  setUserProfile(profile: UserProfile): void {
    this.userProfile.set(profile);
    this.persistUserProfile(profile);
    this.updateSyncTime();
    // User profile updated
  }

  /**
   * Update user profile partially
   */
  updateUserProfile(updates: Partial<UserProfile>): void {
    const currentProfile = this.userProfile();
    if (!currentProfile) {
      // Cannot update profile: no current profile exists
      return;
    }

    const updatedProfile = { ...currentProfile, ...updates };
    this.setUserProfile(updatedProfile);
  }

  /**
   * Set session metadata
   */
  setSessionMetadata(metadata: SessionMetadata): void {
    this.sessionMetadata.set(metadata);
    this.persistSessionMetadata(metadata);
    this.updateSyncTime();
    // Session metadata updated
  }

  /**
   * Update session metadata partially
   */
  updateSessionMetadata(updates: Partial<SessionMetadata>): void {
    const currentSession = this.sessionMetadata();
    if (!currentSession) {
      // Cannot update session: no current session exists
      return;
    }

    const updatedSession = { ...currentSession, ...updates };
    this.setSessionMetadata(updatedSession);
  }

  /**
   * Create a new session
   */
  createSession(profile: UserProfile, rememberMe: boolean = false): void {
    const deviceId = this.getOrCreateDeviceId();
    const sessionId = this.generateSessionId();
    const now = new Date();

    const session: SessionMetadata = {
      loginTime: now,
      lastActivity: now,
      expirationTime: null, // Will be set based on token expiration
      rememberMe,
      deviceId,
      sessionId,
    };

    this.setUserProfile(profile);
    this.setSessionMetadata(session);

    // Store remember me preference
    if (rememberMe) {
      localStorage.setItem(this.storageKeys.rememberMe, 'true');
    } else {
      localStorage.removeItem(this.storageKeys.rememberMe);
    }

    // Set up cross-tab sync when session is created
    if (!this.crossTabSyncActive) {
      this.setupCrossTabSync();
    }

    // New session created - comment placeholder
  }

  /**
   * Update last activity timestamp
   */
  updateActivity(activityTime: Date = new Date()): void {
    const session = this.sessionMetadata();
    if (!session) {
      return;
    }

    this.updateSessionMetadata({ lastActivity: activityTime });
  }

  /**
   * Update session expiration time
   */
  updateExpiration(expirationTime: Date | null): void {
    const session = this.sessionMetadata();
    if (!session) {
      return;
    }

    this.updateSessionMetadata({ expirationTime });
  }

  /**
   * Clear all user state and session data
   */
  clearState(): void {
    this.userProfile.set(null);
    this.sessionMetadata.set(null);
    this.clearPersistedState();
    this.updateSyncTime();
    // User state cleared
  }

  /**
   * Get remember me preference
   */
  getRememberMePreference(): boolean {
    return localStorage.getItem(this.storageKeys.rememberMe) === 'true';
  }

  /**
   * Get device ID for this browser
   */
  getDeviceId(): string | null {
    return localStorage.getItem(this.storageKeys.deviceId);
  }

  /**
   * Get session statistics
   */
  getSessionStats(): {
    duration: number;
    timeSinceActivity: number;
    timeUntilExpiration: number | null;
  } | null {
    const session = this.sessionMetadata();
    if (!session) {
      return null;
    }

    const now = Date.now();
    const duration = now - session.loginTime.getTime();
    const timeSinceActivity = now - session.lastActivity.getTime();
    const timeUntilExpiration = session.expirationTime
      ? session.expirationTime.getTime() - now
      : null;

    return {
      duration,
      timeSinceActivity,
      timeUntilExpiration,
    };
  }

  /**
   * Sync state across browser tabs using storage events
   */
  private setupCrossTabSync(): void {
    if (this.crossTabSyncActive) {
      return;
    }

    const storageEvents = fromEvent<StorageEvent>(window, 'storage');
    const relevantEvents = storageEvents.pipe(
      filter(
        // eslint-disable-next-line @smarttools/no-anonymous-functions -- RxJS filter callback
        (event) =>
          event.key === this.storageKeys.userProfile ||
          event.key === this.storageKeys.sessionMetadata
      ),
      map(function extractEventData(event) {
        return { key: event.key, newValue: event.newValue };
      })
    );

    const context = this;
    relevantEvents
      .pipe(takeUntilDestroyed(context.destroyRef))
      .subscribe(function handleStorageEvent(event) {
        try {
          if (event.key === context.storageKeys.userProfile) {
            const profile =
              event.newValue !== null && event.newValue.length > 0
                ? (JSON.parse(event.newValue) as UserProfile)
                : null;
            context.userProfile.set(profile);
          } else if (event.key === context.storageKeys.sessionMetadata) {
            const session =
              event.newValue !== null && event.newValue.length > 0
                ? (JSON.parse(
                    event.newValue,
                    context.dateReviver.bind(context)
                  ) as SessionMetadata)
                : null;
            context.sessionMetadata.set(session);
          }
          context.updateSyncTime();
          // User state synchronized across tabs
        } catch {
          // Failed to sync user state across tabs
        }
      });

    this.crossTabSyncActive = true;
  }

  /**
   * Persist user profile to storage
   */
  private persistUserProfile(profile: UserProfile): void {
    try {
      sessionStorage.setItem(
        this.storageKeys.userProfile,
        JSON.stringify(profile)
      );
    } catch {
      // Failed to persist user profile
    }
  }

  /**
   * Persist session metadata to storage
   */
  private persistSessionMetadata(metadata: SessionMetadata): void {
    try {
      sessionStorage.setItem(
        this.storageKeys.sessionMetadata,
        JSON.stringify(metadata)
      );
    } catch {
      // Failed to persist session metadata
    }
  }

  /**
   * Clear all persisted state
   */
  private clearPersistedState(): void {
    try {
      sessionStorage.removeItem(this.storageKeys.userProfile);
      sessionStorage.removeItem(this.storageKeys.sessionMetadata);
      // Don't clear remember me preference and device ID - they persist across sessions
    } catch {
      // Failed to clear persisted state
    }
  }

  /**
   * Update sync time signal
   */
  private updateSyncTime(): void {
    this.lastSyncTime.set(new Date());
  }

  /**
   * Get or create a unique device identifier
   */
  private getOrCreateDeviceId(): string {
    let deviceId = localStorage.getItem(this.storageKeys.deviceId);
    if (deviceId === null || deviceId.length === 0) {
      deviceId = this.generateDeviceId();
      localStorage.setItem(this.storageKeys.deviceId, deviceId);
    }
    return deviceId;
  }

  /**
   * Generate a unique device identifier
   */
  private generateDeviceId(): string {
    const timestamp = Date.now().toString(36);
    // eslint-disable-next-line sonarjs/pseudo-random -- Device ID generation is safe for this use case
    const random = Math.random().toString(36).substring(2);
    const navigatorInfo = navigator.userAgent
      .slice(0, 10)
      .replace(/[^a-zA-Z0-9]/g, '');
    return `${timestamp}_${random}_${navigatorInfo}`;
  }

  /**
   * Generate a unique session identifier
   */
  private generateSessionId(): string {
    const timestamp = Date.now().toString(36);
    // eslint-disable-next-line sonarjs/pseudo-random -- Session ID generation is safe for this use case
    const random = Math.random().toString(36).substring(2);
    return `sess_${timestamp}_${random}`;
  }

  /**
   * JSON reviver function to parse Date objects from strings
   */
  private dateReviver(key: string, value: unknown): unknown {
    if (typeof value === 'string') {
      const dateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
      if (dateRegex.test(value)) {
        return new Date(value);
      }
    }
    return value;
  }
}
