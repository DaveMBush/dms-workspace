import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { ProfileService } from '../../services/profile.service';
import { UserProfile } from '../../types/profile.types';
import { SessionInfoCard } from './session-info-card';

describe('SessionInfoCard', () => {
  let component: SessionInfoCard;
  let fixture: ComponentFixture<SessionInfoCard>;
  let mockProfileService: {
    profile: ReturnType<typeof signal<UserProfile | null>>;
    loading: ReturnType<typeof signal<boolean>>;
    profileError: ReturnType<typeof signal<string | null>>;
  };

  const mockProfile: UserProfile = {
    username: 'testuser',
    email: 'test@example.com',
    emailVerified: true,
    name: 'Test User',
    createdAt: new Date('2024-01-01'),
    lastModified: new Date('2024-01-15'),
    sessionInfo: {
      loginTime: new Date('2024-01-20T10:00:00'),
      tokenExpiration: new Date('2024-01-20T12:00:00'),
      sessionDuration: 7200000,
    },
  };

  beforeEach(async () => {
    mockProfileService = {
      profile: signal<UserProfile | null>(mockProfile),
      loading: signal(false),
      profileError: signal<string | null>(null),
    };

    await TestBed.configureTestingModule({
      imports: [SessionInfoCard, NoopAnimationsModule],
      providers: [{ provide: ProfileService, useValue: mockProfileService }],
    }).compileComponents();

    fixture = TestBed.createComponent(SessionInfoCard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display login time', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Jan 20, 2024');
  });

  it('should display session duration formatted', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('2h 0m');
  });

  it('should display token expiration', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Jan 20, 2024');
  });

  it('should display active session status', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Active');
  });

  it('should format session duration correctly for hours and minutes', () => {
    fixture.detectChanges();
    expect(component.sessionDuration()).toBe('2h 0m');
  });

  it('should format session duration with minutes', () => {
    mockProfileService.profile.set({
      ...mockProfile,
      sessionInfo: {
        ...mockProfile.sessionInfo,
        sessionDuration: 4500000,
      },
    });
    fixture.detectChanges();
    expect(component.sessionDuration()).toBe('1h 15m');
  });

  it('should format session duration less than an hour', () => {
    mockProfileService.profile.set({
      ...mockProfile,
      sessionInfo: {
        ...mockProfile.sessionInfo,
        sessionDuration: 1800000,
      },
    });
    fixture.detectChanges();
    expect(component.sessionDuration()).toBe('0h 30m');
  });

  it('should compute hasProfile correctly when profile exists', () => {
    expect(component.hasProfile()).toBe(true);
  });

  it('should compute hasProfile correctly when profile is null', () => {
    mockProfileService.profile.set(null);
    fixture.detectChanges();
    expect(component.hasProfile()).toBe(false);
  });

  it('should compute loginTime from profile', () => {
    expect(component.loginTime()).toEqual(mockProfile.sessionInfo.loginTime);
  });

  it('should compute tokenExpiration from profile', () => {
    expect(component.tokenExpiration()).toEqual(
      mockProfile.sessionInfo.tokenExpiration
    );
  });

  it('should show active status icon', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const statusIcon = compiled.querySelector('mat-icon.status-active');
    expect(statusIcon).toBeTruthy();
  });
});
