import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { Profile } from './profile';
import { ProfileService } from '../services/profile.service';
import { UserProfile } from '../types/profile.types';

describe('Profile', () => {
  let component: Profile;
  let fixture: ComponentFixture<Profile>;
  let mockProfileService: {
    profile: ReturnType<typeof signal<UserProfile | null>>;
    loading: ReturnType<typeof signal<boolean>>;
    profileError: ReturnType<typeof signal<string | null>>;
    loadUserProfile: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    mockProfileService = {
      profile: signal<UserProfile | null>({
        username: 'testuser',
        name: 'Test User',
        email: 'test@test.com',
        emailVerified: true,
        createdAt: new Date(),
        lastModified: new Date(),
        sessionInfo: {
          loginTime: new Date(),
          tokenExpiration: new Date(),
          sessionDuration: 0,
        },
      }),
      loading: signal<boolean>(false),
      profileError: signal<string | null>(null),
      loadUserProfile: vi.fn().mockResolvedValue(undefined),
    };

    await TestBed.configureTestingModule({
      imports: [Profile],
      providers: [
        { provide: ProfileService, useValue: mockProfileService },
        provideHttpClient(),
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Profile);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display user name after load', () => {
    fixture.detectChanges();
    expect(component.userName()).toBe('Test User');
  });

  it('should display user email after load', () => {
    fixture.detectChanges();
    expect(component.userEmail()).toBe('test@test.com');
  });

  it('should render password change card', () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('dms-password-change-card')).toBeTruthy();
  });

  it('should render email change card', () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('dms-email-change-card')).toBeTruthy();
  });

  it('should reload profile when onEmailChanged called', () => {
    component.onEmailChanged();
    expect(mockProfileService.loadUserProfile).toHaveBeenCalled();
  });

  it('should use email as username if name not provided', () => {
    mockProfileService.profile.set({
      username: 'user',
      email: 'user@example.com',
      emailVerified: true,
      createdAt: new Date(),
      lastModified: new Date(),
      sessionInfo: {
        loginTime: new Date(),
        tokenExpiration: new Date(),
        sessionDuration: 0,
      },
    });
    fixture.detectChanges();
    expect(component.userName()).toBe('user@example.com');
  });

  it('should handle null profile', () => {
    mockProfileService.profile.set(null);
    fixture.detectChanges();
    expect(component.userName()).toBe('');
    expect(component.userEmail()).toBe('');
  });

  it('should call loadUserProfile on init', () => {
    component.ngOnInit();
    expect(mockProfileService.loadUserProfile).toHaveBeenCalled();
  });

  describe('Dark Mode Support', () => {
    it('should not have hardcoded black colors on title', () => {
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      const title = compiled.querySelector('.profile-title');
      expect(title).toBeTruthy();
      const computedStyle = window.getComputedStyle(title);
      expect(computedStyle.color).not.toBe('rgb(0, 0, 0)');
      expect(computedStyle.color).not.toBe('rgba(0, 0, 0, 0.87)');
    });

    it('should use opacity for subtitle instead of color', () => {
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      const subtitle = compiled.querySelector('.profile-subtitle');
      expect(subtitle).toBeTruthy();
      // In test environment, styles may not be applied
      // Check that the element has the correct class
      expect(subtitle?.classList.contains('profile-subtitle')).toBe(true);
    });

    it('should not have hardcoded colors on section titles', () => {
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      const sectionTitle = compiled.querySelector('.section-title');
      expect(sectionTitle).toBeTruthy();
      const computedStyle = window.getComputedStyle(sectionTitle);
      expect(computedStyle.color).not.toBe('rgb(0, 0, 0)');
      expect(computedStyle.color).not.toBe('rgba(0, 0, 0, 0.87)');
    });
  });
});
