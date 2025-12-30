import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';

import { ProfileService } from '../../services/profile.service';
import { UserProfile } from '../../types/profile.types';
import { ProfileInfoCard } from './profile-info-card';

describe('ProfileInfoCard', () => {
  let component: ProfileInfoCard;
  let fixture: ComponentFixture<ProfileInfoCard>;
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
      loginTime: new Date(),
      tokenExpiration: new Date(),
      sessionDuration: 0,
    },
  };

  beforeEach(async () => {
    mockProfileService = {
      profile: signal<UserProfile | null>(mockProfile),
      loading: signal(false),
      profileError: signal<string | null>(null),
    };

    await TestBed.configureTestingModule({
      imports: [ProfileInfoCard],
      providers: [{ provide: ProfileService, useValue: mockProfileService }],
    }).compileComponents();

    fixture = TestBed.createComponent(ProfileInfoCard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display username', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('testuser');
  });

  it('should display email', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('test@example.com');
  });

  it('should show verified icon when email is verified', () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const verifiedIcon = compiled.querySelector('mat-icon.verified');
    expect(verifiedIcon).toBeTruthy();
  });

  it('should show unverified icon when email is not verified', () => {
    mockProfileService.profile.set({
      ...mockProfile,
      emailVerified: false,
    });
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const unverifiedIcon = compiled.querySelector('mat-icon.unverified');
    expect(unverifiedIcon).toBeTruthy();
  });

  it('should display account created date', () => {
    fixture.detectChanges();
    expect(component.accountCreated()).toEqual(mockProfile.createdAt);
  });

  it('should display last modified date', () => {
    fixture.detectChanges();
    expect(component.lastModified()).toEqual(mockProfile.lastModified);
  });

  it('should show loading spinner when loading', () => {
    mockProfileService.loading.set(true);
    mockProfileService.profile.set(null);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const spinner = compiled.querySelector('mat-spinner');
    expect(spinner).toBeTruthy();
  });

  it('should show error message when error occurs', () => {
    mockProfileService.profileError.set('Failed to load profile');
    mockProfileService.profile.set(null);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Failed to load profile');
  });

  it('should compute hasProfile correctly when profile exists', () => {
    expect(component.hasProfile()).toBe(true);
  });

  it('should compute hasProfile correctly when profile is null', () => {
    mockProfileService.profile.set(null);
    fixture.detectChanges();
    expect(component.hasProfile()).toBe(false);
  });

  it('should compute isLoading from service', () => {
    mockProfileService.loading.set(true);
    fixture.detectChanges();
    expect(component.isLoading()).toBe(true);
  });

  it('should compute hasError from service', () => {
    mockProfileService.profileError.set('Error');
    fixture.detectChanges();
    expect(component.hasError()).toBe(true);
  });

  it('should compute errorMessage from service', () => {
    mockProfileService.profileError.set('Error message');
    fixture.detectChanges();
    expect(component.errorMessage()).toBe('Error message');
  });
});
