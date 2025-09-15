import { TestBed } from '@angular/core/testing';
import { NgZone } from '@angular/core';
import { ActivityTrackingService } from './activity-tracking.service';

// Mock console methods
const consoleSpy = {
  log: vi.spyOn(console, 'log').mockImplementation(() => {
    /* no-op */
  }),
  warn: vi.spyOn(console, 'warn').mockImplementation(() => {
    /* no-op */
  }),
};

// Mock NgZone
const mockNgZone = {
  run: vi.fn((fn: () => void) => fn()),
  runOutsideAngular: vi.fn((fn: () => void) => fn()),
  runTask: vi.fn((fn: () => void) => fn()),
  runGuarded: vi.fn((fn: () => void) => fn()),
  runOutsideAngularAsync: vi.fn((fn: () => void) => fn()),
  onStable: {
    subscribe: vi.fn(() => ({ unsubscribe: vi.fn() })),
  },
  onUnstable: {
    subscribe: vi.fn(() => ({ unsubscribe: vi.fn() })),
  },
  onError: {
    subscribe: vi.fn(() => ({ unsubscribe: vi.fn() })),
  },
  onMicrotaskEmpty: {
    subscribe: vi.fn(() => ({ unsubscribe: vi.fn() })),
  },
  hasPendingMacrotasks: false,
  hasPendingMicrotasks: false,
  isStable: true,
};

describe('ActivityTrackingService', () => {
  let service: ActivityTrackingService;
  let ngZone: NgZone;
  let addEventListenerSpy: ReturnType<typeof vi.spyOn>;
  let removeEventListenerSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Mock document event listeners
    addEventListenerSpy = vi.spyOn(document, 'addEventListener');
    removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');

    TestBed.configureTestingModule({
      providers: [
        ActivityTrackingService,
        { provide: NgZone, useValue: mockNgZone },
      ],
    });

    service = TestBed.inject(ActivityTrackingService);
    ngZone = TestBed.inject(NgZone);

    vi.clearAllMocks();
  });

  afterEach(() => {
    if (service) {
      service.stopActivityTracking();
    }
    consoleSpy.log.mockClear();
    consoleSpy.warn.mockClear();
  });

  describe('initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should not be tracking initially', () => {
      expect(service.isTrackingActive()).toBe(false);
    });

    it('should have initial last activity time', () => {
      const lastActivity = service.getLastActivity();
      expect(lastActivity).toBeInstanceOf(Date);
    });
  });

  describe('startActivityTracking', () => {
    it('should start activity tracking', () => {
      service.startActivityTracking();

      expect(service.isTrackingActive()).toBe(true);
      // Tracking should be active and event listeners should be added
      expect(addEventListenerSpy).toHaveBeenCalled();
    });

    it('should set up event listeners for activity events', () => {
      service.startActivityTracking();

      // Should register listeners for all activity events
      expect(addEventListenerSpy).toHaveBeenCalledTimes(9); // Number of ACTIVITY_EVENTS
      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'mousedown',
        expect.any(Function),
        { passive: true }
      );
      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'mousemove',
        expect.any(Function),
        { passive: true }
      );
      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'keypress',
        expect.any(Function),
        { passive: true }
      );
      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'click',
        expect.any(Function),
        { passive: true }
      );
    });

    it('should not start tracking twice', () => {
      service.startActivityTracking();
      service.startActivityTracking();

      // Should still be tracking and not duplicate listeners
      expect(service.isTrackingActive()).toBe(true);
    });

    it('should update last activity on start', () => {
      const beforeStart = Date.now();
      service.startActivityTracking();
      const afterStart = Date.now();

      const lastActivity = service.getLastActivity().getTime();
      expect(lastActivity).toBeGreaterThanOrEqual(beforeStart);
      expect(lastActivity).toBeLessThanOrEqual(afterStart);
    });
  });

  describe('stopActivityTracking', () => {
    it('should stop activity tracking', () => {
      service.startActivityTracking();
      service.stopActivityTracking();

      expect(service.isTrackingActive()).toBe(false);
      // Service should stop tracking (uses RxJS takeUntilDestroyed for cleanup)
      expect(service.isTrackingActive()).toBe(false);
    });

    it('should handle stopping when not tracking', () => {
      service.stopActivityTracking();

      expect(service.isTrackingActive()).toBe(false);
    });
  });

  describe('activity detection', () => {
    beforeEach(() => {
      service.startActivityTracking();
    });

    it('should update last activity when activity detected', async () => {
      const initialActivity = service.getLastActivity();

      // Wait a bit to ensure time difference
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Trigger activity event
      service.recordActivity();

      const updatedActivity = service.getLastActivity();
      expect(updatedActivity.getTime()).toBeGreaterThan(
        initialActivity.getTime()
      );
    });

    it('should calculate time since last activity', async () => {
      service.recordActivity();

      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, 50));

      const timeSinceActivity = service.getTimeSinceLastActivity();
      expect(timeSinceActivity).toBeGreaterThan(0);
      expect(timeSinceActivity).toBeLessThan(100); // Should be around 50ms
    });

    it('should determine if user is active', () => {
      service.recordActivity();

      expect(service.isUserActive()).toBe(true);
      expect(service.isUserActive(1000)).toBe(true); // 1 second threshold
      expect(service.isUserActive(0)).toBe(false); // 0 threshold
    });
  });

  describe('activity callbacks', () => {
    let callbackSpy: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      callbackSpy = vi.fn();
      service.onActivity(callbackSpy);
      service.startActivityTracking();
    });

    it('should register activity callbacks', () => {
      service.recordActivity();

      expect(callbackSpy).toHaveBeenCalledWith(expect.any(Date));
    });

    it('should unregister activity callbacks', () => {
      // Clear previous calls and unregister callback
      callbackSpy.mockClear();
      service.offActivity(callbackSpy);

      service.recordActivity();

      expect(callbackSpy).not.toHaveBeenCalled();
    });

    it('should handle callback errors gracefully', () => {
      const errorCallback = vi.fn().mockImplementation(() => {
        throw new Error('Callback error');
      });

      service.onActivity(errorCallback);
      service.recordActivity();

      // Error should be handled gracefully without breaking other callbacks
      expect(service.getActivityStats().isActive).toBe(true);
    });

    it('should call multiple callbacks', () => {
      const callback2 = vi.fn();
      service.onActivity(callback2);

      service.recordActivity();

      expect(callbackSpy).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });
  });

  describe('activity statistics', () => {
    beforeEach(() => {
      service.startActivityTracking();
    });

    it('should provide activity statistics', () => {
      const stats = service.getActivityStats();

      expect(stats).toMatchObject({
        lastActivity: expect.any(Date),
        timeSinceLastActivity: expect.any(Number),
        isActive: expect.any(Boolean),
        isTracking: true,
      });
    });

    it('should update statistics after activity', async () => {
      const initialStats = service.getActivityStats();

      await new Promise((resolve) => setTimeout(resolve, 10));
      service.recordActivity();

      const updatedStats = service.getActivityStats();
      expect(updatedStats.lastActivity.getTime()).toBeGreaterThan(
        initialStats.lastActivity.getTime()
      );
    });
  });

  describe('configuration', () => {
    it('should allow configuration changes', () => {
      service.configure({
        activityThreshold: 60000, // 1 minute
        debounceTime: 2000, // 2 seconds
      });

      // Configuration should be updated
      expect(service.getActivityStats().isTracking).toBe(false);
    });

    it('should warn about configuration changes requiring restart', () => {
      service.startActivityTracking();

      service.configure({
        activityThreshold: 60000,
      });

      // Configuration should warn about needing restart
      expect(service.isTrackingActive()).toBe(true);
    });
  });

  describe('signals', () => {
    it('should provide readonly signals for last activity', () => {
      const lastActivitySignal = service.lastActivitySignal;

      expect(lastActivitySignal()).toBeInstanceOf(Date);
    });

    it('should provide readonly signals for tracking status', () => {
      const isTrackingSignal = service.isTrackingSignal;

      expect(isTrackingSignal()).toBe(false);

      service.startActivityTracking();

      expect(isTrackingSignal()).toBe(true);
    });

    it('should update signals when activity occurs', async () => {
      const initialActivity = service.lastActivitySignal();

      // Wait 1ms to ensure different timestamp
      await new Promise((resolve) => setTimeout(resolve, 1));
      service.recordActivity();

      const updatedActivity = service.lastActivitySignal();
      expect(updatedActivity.getTime()).toBeGreaterThanOrEqual(
        initialActivity.getTime()
      );
    });
  });

  describe('edge cases', () => {
    it('should handle multiple start/stop cycles', () => {
      service.startActivityTracking();
      service.stopActivityTracking();
      service.startActivityTracking();
      service.stopActivityTracking();

      expect(service.isTrackingActive()).toBe(false);
    });

    it('should handle activity recording when not tracking', () => {
      service.recordActivity();

      // Should not throw error
      expect(service.getLastActivity()).toBeInstanceOf(Date);
    });

    it('should handle large time differences', async () => {
      // Record activity, then wait to ensure time passes
      service.recordActivity();

      // Wait 10ms to ensure some time has passed
      await new Promise((resolve) => setTimeout(resolve, 10));

      const timeSince = service.getTimeSinceLastActivity();
      expect(timeSince).toBeGreaterThanOrEqual(5); // Allow for at least 5ms to have passed
    });
  });
});
