import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Login } from './login';
import { Router } from '@angular/router';
import { AuthService } from '../auth.service';

describe('Login', () => {
  let component: Login;
  let fixture: ComponentFixture<Login>;
  let mockAuthService: { signIn: ReturnType<typeof vi.fn> };
  let mockRouter: { navigate: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    mockAuthService = { signIn: vi.fn() };
    mockRouter = { navigate: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Login);
    component = fixture.componentInstance;
  });

  describe('form rendering', () => {
    it('should render email input', () => {
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      const emailInput = compiled.querySelector(
        'input[formControlName="email"]'
      );
      expect(emailInput).toBeTruthy();
    });

    it('should render password input', () => {
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      const passwordInput = compiled.querySelector(
        'input[formControlName="password"]'
      );
      expect(passwordInput).toBeTruthy();
    });

    it('should render submit button', () => {
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      const submitButton = compiled.querySelector('button[type="submit"]');
      expect(submitButton).toBeTruthy();
    });
  });

  describe('validation', () => {
    it('should show error for invalid email', () => {
      component.loginForm.patchValue({ email: 'invalid' });
      const emailControl = component.loginForm.get('email');
      emailControl?.markAsTouched();
      expect(emailControl?.hasError('email')).toBe(true);
    });

    it('should show error for empty email', () => {
      const emailControl = component.loginForm.get('email');
      emailControl?.markAsTouched();
      expect(emailControl?.hasError('required')).toBe(true);
    });

    it('should show error for short password', () => {
      component.loginForm.patchValue({ password: '123' });
      const passwordControl = component.loginForm.get('password');
      passwordControl?.markAsTouched();
      expect(passwordControl?.hasError('minlength')).toBe(true);
    });
  });

  describe('password visibility', () => {
    it('should toggle password visibility', () => {
      expect(component.hidePassword()).toBe(true);
      component.togglePasswordVisibility();
      expect(component.hidePassword()).toBe(false);
    });
  });

  describe('form submission', () => {
    it('should not submit if form is invalid', async () => {
      await component.onSubmit();
      expect(mockAuthService.signIn).not.toHaveBeenCalled();
    });

    it('should set loading state during submission', async () => {
      mockAuthService.signIn.mockResolvedValue({});
      component.loginForm.patchValue({
        email: 'test@test.com',
        password: 'password123',
      });

      const submitPromise = component.onSubmit();
      expect(component.isLoading()).toBe(true);
      await submitPromise;
    });

    it('should navigate on successful login', async () => {
      mockAuthService.signIn.mockResolvedValue({});
      component.loginForm.patchValue({
        email: 'test@test.com',
        password: 'password123',
      });
      await component.onSubmit();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/']);
    });

    it('should show error on failed login', async () => {
      mockAuthService.signIn.mockRejectedValue(
        new Error('Invalid credentials')
      );
      component.loginForm.patchValue({
        email: 'test@test.com',
        password: 'password123',
      });
      await component.onSubmit();
      expect(component.errorMessage()).toBeTruthy();
    });
  });
});
