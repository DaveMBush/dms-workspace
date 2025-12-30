import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProfileActionsService } from '../../services/profile-actions.service';
import { AccountActionsCard } from './account-actions-card';

describe('AccountActionsCard', () => {
  let component: AccountActionsCard;
  let fixture: ComponentFixture<AccountActionsCard>;
  let mockProfileActionsService: {
    confirmSignOut: ReturnType<typeof vi.fn>;
    confirmSignOutAllDevices: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    mockProfileActionsService = {
      confirmSignOut: vi.fn(),
      confirmSignOutAllDevices: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [AccountActionsCard],
      providers: [
        {
          provide: ProfileActionsService,
          useValue: mockProfileActionsService,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AccountActionsCard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display sign out button', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const signOutButton = compiled.querySelector(
      'button[aria-label="Sign Out"]'
    );
    expect(signOutButton).toBeTruthy();
  });

  it('should display sign out all devices button', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const signOutAllButton = compiled.querySelector(
      'button[aria-label="Sign Out All Devices"]'
    );
    expect(signOutAllButton).toBeTruthy();
  });

  it('should call confirmSignOut when sign out button is clicked', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const signOutButton = compiled.querySelector(
      'button[aria-label="Sign Out"]'
    )!;
    signOutButton.click();
    expect(mockProfileActionsService.confirmSignOut).toHaveBeenCalledTimes(1);
  });

  it('should call confirmSignOutAllDevices when sign out all devices button is clicked', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const signOutAllButton = compiled.querySelector(
      'button[aria-label="Sign Out All Devices"]'
    )!;
    signOutAllButton.click();
    expect(
      mockProfileActionsService.confirmSignOutAllDevices
    ).toHaveBeenCalledTimes(1);
  });

  it('should call onLogout method when sign out button is clicked', () => {
    const spy = vi.spyOn(component, 'onLogout');
    const compiled = fixture.nativeElement as HTMLElement;
    const signOutButton = compiled.querySelector(
      'button[aria-label="Sign Out"]'
    )!;
    signOutButton.click();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('should call onLogoutAllDevices method when sign out all devices button is clicked', () => {
    const spy = vi.spyOn(component, 'onLogoutAllDevices');
    const compiled = fixture.nativeElement as HTMLElement;
    const signOutAllButton = compiled.querySelector(
      'button[aria-label="Sign Out All Devices"]'
    )!;
    signOutAllButton.click();
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
