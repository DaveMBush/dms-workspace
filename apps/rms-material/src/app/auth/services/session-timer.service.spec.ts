import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import {
  SessionTimerService,
  SessionTimerEvent,
  SessionTimerConfig,
} from './session-timer.service';

describe('SessionTimerService', () => {
  let service: SessionTimerService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [SessionTimerService],
    });

    service = TestBed.inject(SessionTimerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should initialize with inactive timers', () => {
    expect(service.active()).toBe(false);
    expect(service.warningTime()).toBe(0);
    expect(service.expiryTime()).toBe(0);
  });

  describe('startTimers', () => {
    it('should activate timers and set initial values', () => {
      const config: SessionTimerConfig = {
        sessionTimeoutMinutes: 60,
        warningTimeMinutes: 10,
      };

      service.startTimers(config);

      expect(service.active()).toBe(true);
      expect(service.warningTime()).toBeGreaterThan(0);
      expect(service.expiryTime()).toBeGreaterThan(0);
    });

    it('should emit warning event at appropriate time', (done) => {
      const config: SessionTimerConfig = {
        sessionTimeoutMinutes: 1, // 1 minute
        warningTimeMinutes: 0.5, // 30 seconds warning
      };

      service.timerEvents.subscribe((event) => {
        if (event.event === SessionTimerEvent.Warning) {
          expect(event.event).toBe(SessionTimerEvent.Warning);
          done();
        }
      });

      service.startTimers(config);
    }, 35000);

    it('should handle immediate warning for short sessions', async () => {
      const config: SessionTimerConfig = {
        sessionTimeoutMinutes: 0.5, // 30 seconds
        warningTimeMinutes: 1, // 1 minute warning (longer than session)
      };

      const eventPromise = firstValueFrom(service.timerEvents);
      service.startTimers(config);

      const event = await eventPromise;
      expect(event.event).toBe(SessionTimerEvent.Warning);
    });
  });

  describe('stopTimers', () => {
    it('should deactivate timers and reset values', () => {
      const config: SessionTimerConfig = {
        sessionTimeoutMinutes: 60,
        warningTimeMinutes: 10,
      };

      service.startTimers(config);
      service.stopTimers();

      expect(service.active()).toBe(false);
      expect(service.warningTime()).toBe(0);
      expect(service.expiryTime()).toBe(0);
    });
  });

  describe('resetTimers', () => {
    it('should restart timers if they were active', () => {
      const config: SessionTimerConfig = {
        sessionTimeoutMinutes: 60,
        warningTimeMinutes: 10,
      };

      service.startTimers(config);
      const wasActive = service.active();

      service.resetTimers(config);

      expect(wasActive).toBe(true);
      expect(service.active()).toBe(true);
    });

    it('should not start timers if they were not active', () => {
      const config: SessionTimerConfig = {
        sessionTimeoutMinutes: 60,
        warningTimeMinutes: 10,
      };

      service.resetTimers(config);

      expect(service.active()).toBe(false);
    });
  });

  describe('calculateExpiryTime', () => {
    it('should calculate correct expiry time', () => {
      const config: SessionTimerConfig = {
        sessionTimeoutMinutes: 60,
        warningTimeMinutes: 10,
      };

      const sessionStart = new Date();
      const expectedExpiry = new Date(sessionStart.getTime() + 60 * 60 * 1000);

      const calculatedExpiry = service.calculateExpiryTime(
        config,
        sessionStart
      );

      expect(calculatedExpiry.getTime()).toBe(expectedExpiry.getTime());
    });
  });

  describe('updateTimeRemaining', () => {
    it('should update time remaining signals', () => {
      const config: SessionTimerConfig = {
        sessionTimeoutMinutes: 60,
        warningTimeMinutes: 10,
      };

      const sessionStart = new Date();

      service.updateTimeRemaining(config, sessionStart);

      expect(service.warningTime()).toBeGreaterThan(0);
      expect(service.expiryTime()).toBeGreaterThan(0);
    });
  });

  describe('areTimersActive', () => {
    it('should return correct timer state', () => {
      const config: SessionTimerConfig = {
        sessionTimeoutMinutes: 60,
        warningTimeMinutes: 10,
      };

      expect(service.areTimersActive()).toBe(false);

      service.startTimers(config);
      expect(service.areTimersActive()).toBe(true);

      service.stopTimers();
      expect(service.areTimersActive()).toBe(false);
    });
  });
});
