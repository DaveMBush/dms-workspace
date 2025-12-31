import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PasswordChangeCard } from './password-change-card';
import { ProfileService } from '../../services/profile.service';
import { NotificationService } from '../../../shared/services/notification.service';

describe('PasswordChangeCard', () => {
  let component: PasswordChangeCard;
  let fixture: ComponentFixture<PasswordChangeCard>;
  let mockProfileService: {
    changeUserPassword: ReturnType<typeof vi.fn>;
  };
  let mockNotification: {
    success: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    mockProfileService = { changeUserPassword: vi.fn() };
    mockNotification = { success: vi.fn(), error: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [PasswordChangeCard],
      providers: [
        { provide: ProfileService, useValue: mockProfileService },
        {
          provide: NotificationService,
          useValue: mockNotification,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PasswordChangeCard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should validate current password required', () => {
    const currentPassword = component.passwordForm.get('currentPassword');
    currentPassword?.markAsTouched();
    expect(currentPassword?.hasError('required')).toBe(true);
  });

  it('should validate new password min length', () => {
    component.passwordForm.patchValue({ newPassword: '123' });
    const newPassword = component.passwordForm.get('newPassword');
    newPassword?.markAsTouched();
    expect(newPassword?.hasError('minlength')).toBe(true);
  });

  it('should show error when passwords do not match', async () => {
    component.passwordForm.patchValue({
      currentPassword: 'current',
      newPassword: 'newpassword123',
      confirmPassword: 'different123',
    });
    await component.onSubmit();
    expect(mockNotification.error).toHaveBeenCalledWith(
      'New passwords do not match'
    );
  });

  it('should call profile service on valid submit', async () => {
    mockProfileService.changeUserPassword.mockResolvedValue(undefined);
    component.passwordForm.patchValue({
      currentPassword: 'current',
      newPassword: 'newpassword123',
      confirmPassword: 'newpassword123',
    });
    await component.onSubmit();
    expect(mockProfileService.changeUserPassword).toHaveBeenCalledWith(
      'current',
      'newpassword123'
    );
  });

  it('should show success message on successful password change', async () => {
    mockProfileService.changeUserPassword.mockResolvedValue(undefined);
    component.passwordForm.patchValue({
      currentPassword: 'current',
      newPassword: 'newpassword123',
      confirmPassword: 'newpassword123',
    });
    await component.onSubmit();
    expect(mockNotification.success).toHaveBeenCalledWith(
      'Password changed successfully'
    );
  });

  it('should reset form after successful submission', async () => {
    mockProfileService.changeUserPassword.mockResolvedValue(undefined);
    component.passwordForm.patchValue({
      currentPassword: 'current',
      newPassword: 'newpassword123',
      confirmPassword: 'newpassword123',
    });
    await component.onSubmit();
    expect(component.passwordForm.value).toEqual({
      currentPassword: null,
      newPassword: null,
      confirmPassword: null,
    });
  });

  it('should show error message on failed password change', async () => {
    mockProfileService.changeUserPassword.mockRejectedValue(
      new Error('Wrong password')
    );
    component.passwordForm.patchValue({
      currentPassword: 'wrong',
      newPassword: 'newpassword123',
      confirmPassword: 'newpassword123',
    });
    await component.onSubmit();
    expect(mockNotification.error).toHaveBeenCalledWith(
      'Failed to change password'
    );
  });

  it('should set loading state during submission', async () => {
    let resolvePromise: (value: unknown) => void;
    const promise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    mockProfileService.changeUserPassword.mockReturnValue(promise);

    component.passwordForm.patchValue({
      currentPassword: 'current',
      newPassword: 'newpassword123',
      confirmPassword: 'newpassword123',
    });

    const submitPromise = component.onSubmit();
    expect(component.isLoading()).toBe(true);

    resolvePromise(undefined);
    await submitPromise;
    expect(component.isLoading()).toBe(false);
  });

  it('should not submit if form is invalid', async () => {
    component.passwordForm.patchValue({
      currentPassword: '',
      newPassword: '123',
      confirmPassword: '123',
    });
    await component.onSubmit();
    expect(mockProfileService.changeUserPassword).not.toHaveBeenCalled();
  });

  it('should toggle password visibility', () => {
    expect(component.hideCurrentPassword()).toBe(true);
    component.hideCurrentPassword.set(false);
    expect(component.hideCurrentPassword()).toBe(false);
  });
});
