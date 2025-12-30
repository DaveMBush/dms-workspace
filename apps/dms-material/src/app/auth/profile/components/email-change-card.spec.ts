import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EmailChangeCard } from './email-change-card';
import { ProfileService } from '../../services/profile.service';
import { NotificationService } from '../../../shared/services/notification.service';

describe('EmailChangeCard', () => {
  let component: EmailChangeCard;
  let fixture: ComponentFixture<EmailChangeCard>;
  let mockProfileService: { updateEmail: ReturnType<typeof vi.fn> };
  let mockNotification: {
    success: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    mockProfileService = { updateEmail: vi.fn() };
    mockNotification = { success: vi.fn(), error: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [EmailChangeCard],
      providers: [
        { provide: ProfileService, useValue: mockProfileService },
        {
          provide: NotificationService,
          useValue: mockNotification,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(EmailChangeCard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should validate email required', () => {
    const newEmail = component.emailForm.get('newEmail');
    newEmail?.markAsTouched();
    expect(newEmail?.hasError('required')).toBe(true);
  });

  it('should validate email format', () => {
    component.emailForm.patchValue({ newEmail: 'invalid' });
    const newEmail = component.emailForm.get('newEmail');
    newEmail?.markAsTouched();
    expect(newEmail?.hasError('email')).toBe(true);
  });

  it('should accept valid email', () => {
    component.emailForm.patchValue({
      newEmail: 'valid@example.com',
    });
    const newEmail = component.emailForm.get('newEmail');
    expect(newEmail?.valid).toBe(true);
  });

  it('should call profile service on valid submit', async () => {
    mockProfileService.updateEmail.mockResolvedValue(undefined);
    component.emailForm.patchValue({
      newEmail: 'new@example.com',
    });
    await component.onSubmit();
    expect(mockProfileService.updateEmail).toHaveBeenCalledWith(
      'new@example.com'
    );
  });

  it('should emit emailChanged on successful submission', async () => {
    const emailChangedSpy = vi.fn();
    component.emailChanged.subscribe(emailChangedSpy);
    mockProfileService.updateEmail.mockResolvedValue(undefined);
    component.emailForm.patchValue({
      newEmail: 'new@example.com',
    });
    await component.onSubmit();
    expect(emailChangedSpy).toHaveBeenCalledWith('new@example.com');
  });

  it('should show success message on successful email change', async () => {
    mockProfileService.updateEmail.mockResolvedValue(undefined);
    component.emailForm.patchValue({
      newEmail: 'new@example.com',
    });
    await component.onSubmit();
    expect(mockNotification.success).toHaveBeenCalledWith(
      'Email changed successfully'
    );
  });

  it('should reset form after successful submission', async () => {
    mockProfileService.updateEmail.mockResolvedValue(undefined);
    component.emailForm.patchValue({
      newEmail: 'new@example.com',
    });
    await component.onSubmit();
    expect(component.emailForm.value).toEqual({
      newEmail: null,
    });
  });

  it('should show error message on failed email change', async () => {
    mockProfileService.updateEmail.mockRejectedValue(
      new Error('Email already in use')
    );
    component.emailForm.patchValue({
      newEmail: 'existing@example.com',
    });
    await component.onSubmit();
    expect(mockNotification.error).toHaveBeenCalledWith(
      'Failed to change email'
    );
  });

  it('should set loading state during submission', async () => {
    let resolvePromise: (value: unknown) => void;
    const promise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    mockProfileService.updateEmail.mockReturnValue(promise);

    component.emailForm.patchValue({
      newEmail: 'new@example.com',
    });

    const submitPromise = component.onSubmit();
    expect(component.isLoading()).toBe(true);

    resolvePromise!(undefined);
    await submitPromise;
    expect(component.isLoading()).toBe(false);
  });

  it('should not submit if form is invalid', async () => {
    component.emailForm.patchValue({ newEmail: '' });
    await component.onSubmit();
    expect(mockProfileService.updateEmail).not.toHaveBeenCalled();
  });

  it('should display current email from input', () => {
    fixture.componentRef.setInput('currentEmail', 'current@test.com');
    fixture.detectChanges();
    expect(component.currentEmail()).toBe('current@test.com');
  });
});
