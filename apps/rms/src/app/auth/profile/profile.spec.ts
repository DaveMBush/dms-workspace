import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { vi } from 'vitest';
import { signal } from '@angular/core';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Profile } from './profile';
import { ProfileService } from '../services/profile.service';
import { ProfileActionsService } from '../services/profile-actions.service';

describe('Profile', () => {
  let component: Profile;
  let fixture: ComponentFixture<Profile>;
  let profileService: ProfileService;

  beforeEach(async () => {
    const profileServiceMock = {
      loadUserProfile: vi.fn().mockResolvedValue(undefined),
      profile: signal(null),
      loading: signal(false),
      profileError: signal(null),
    };

    const profileActionsServiceMock = {
      changePassword: vi.fn().mockResolvedValue(true),
      updateEmail: vi.fn().mockResolvedValue(true),
      verifyEmailChange: vi.fn().mockResolvedValue(true),
      confirmSignOut: vi.fn(),
      confirmSignOutAllDevices: vi.fn(),
    };

    const confirmationServiceMock = {
      confirm: vi.fn(),
    };

    const messageServiceMock = {
      add: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [Profile, NoopAnimationsModule],
      providers: [
        { provide: ProfileService, useValue: profileServiceMock },
        { provide: ProfileActionsService, useValue: profileActionsServiceMock },
        { provide: ConfirmationService, useValue: confirmationServiceMock },
        { provide: MessageService, useValue: messageServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Profile);
    component = fixture.componentInstance;
    profileService = TestBed.inject(ProfileService);

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load user profile on init', () => {
    component.ngOnInit();
    // eslint-disable-next-line @typescript-eslint/unbound-method -- Testing service method call
    expect(profileService.loadUserProfile).toHaveBeenCalled();
  });
});
