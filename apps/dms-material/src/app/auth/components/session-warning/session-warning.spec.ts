import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick,
} from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';
import { vi } from 'vitest';

import { AuthService } from '../../auth.service';
import { SessionWarning } from './session-warning';

describe('SessionWarning', () => {
  let component: SessionWarning;
  let fixture: ComponentFixture<SessionWarning>;
  let mockDialogRef: {
    close: ReturnType<typeof vi.fn>;
  };
  let mockAuthService: {
    refreshTokens: ReturnType<typeof vi.fn>;
    signOut: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    mockDialogRef = { close: vi.fn() };
    mockAuthService = {
      refreshTokens: vi.fn().mockResolvedValue(undefined),
      signOut: vi.fn().mockResolvedValue(undefined),
    };

    await TestBed.configureTestingModule({
      imports: [SessionWarning],
      providers: [
        {
          provide: MatDialogRef,
          useValue: mockDialogRef,
        },
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SessionWarning);
    component = fixture.componentInstance;
  });

  describe('countdown', () => {
    it('should start with 60 seconds', () => {
      expect(component.secondsRemaining()).toBe(60);
    });

    it('should decrement each second', fakeAsync(() => {
      component.ngOnInit();
      tick(1000);
      expect(component.secondsRemaining()).toBe(59);
      tick(1000);
      expect(component.secondsRemaining()).toBe(58);
      component.ngOnDestroy();
    }));

    it('should calculate progress percentage', () => {
      component.secondsRemaining.set(30);
      expect(component.progressValue()).toBe(50);
    });
  });

  describe('formatTime', () => {
    it('should format 65 seconds as 1:05', () => {
      expect(component.formatTime(65)).toBe('1:05');
    });

    it('should format 5 seconds as 0:05', () => {
      expect(component.formatTime(5)).toBe('0:05');
    });

    it('should format 0 seconds as 0:00', () => {
      expect(component.formatTime(0)).toBe('0:00');
    });

    it('should format 60 seconds as 1:00', () => {
      expect(component.formatTime(60)).toBe('1:00');
    });
  });

  describe('extend session', () => {
    it('should call auth service to refresh', async () => {
      await component.onExtendSession();
      expect(mockAuthService.refreshTokens).toHaveBeenCalled();
    });

    it('should close dialog with extended', async () => {
      await component.onExtendSession();
      expect(mockDialogRef.close).toHaveBeenCalledWith('extended');
    });

    it('should logout on refresh failure', async () => {
      mockAuthService.refreshTokens.mockRejectedValueOnce(
        new Error('Network error')
      );
      await component.onExtendSession();
      expect(mockAuthService.signOut).toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('should call auth service logout', () => {
      component.onLogout();
      expect(mockAuthService.signOut).toHaveBeenCalled();
    });

    it('should close dialog with logout', () => {
      component.onLogout();
      expect(mockDialogRef.close).toHaveBeenCalledWith('logout');
    });
  });

  describe('auto-logout', () => {
    it('should auto-logout when countdown reaches zero', fakeAsync(() => {
      component.secondsRemaining.set(1);
      component.ngOnInit();
      tick(1000);
      expect(mockAuthService.signOut).toHaveBeenCalled();
      component.ngOnDestroy();
    }));
  });

  describe('cleanup', () => {
    it('should stop countdown on destroy', fakeAsync(() => {
      component.ngOnInit();
      tick(1000);
      expect(component.secondsRemaining()).toBe(59);
      component.ngOnDestroy();
      tick(1000);
      expect(component.secondsRemaining()).toBe(59);
    }));
  });
});
