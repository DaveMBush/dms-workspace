import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { signal, NO_ERRORS_SCHEMA } from '@angular/core';
import { of } from 'rxjs';

import { AuthService } from '../auth/auth.service';
import { ConfirmDialogService } from '../shared/services/confirm-dialog.service';
import { ThemeService } from '../shared/services/theme.service';
import { ShellComponent } from './shell.component';

describe('ShellComponent', () => {
  let component: ShellComponent;
  let fixture: ComponentFixture<ShellComponent>;
  let router: Router;
  let mockConfirmDialog: {
    confirm: ReturnType<typeof vi.fn>;
  };
  let mockAuthService: { signOut: ReturnType<typeof vi.fn> };
  let mockThemeService: {
    isDarkMode$: ReturnType<typeof signal<boolean>>;
    toggleTheme: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    mockConfirmDialog = {
      confirm: vi.fn().mockReturnValue(of(true)),
    };
    mockAuthService = {
      signOut: vi.fn().mockReturnValue(Promise.resolve()),
    };
    mockThemeService = {
      isDarkMode$: signal(false),
      toggleTheme: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [ShellComponent],
      providers: [
        {
          provide: ConfirmDialogService,
          useValue: mockConfirmDialog,
        },
        { provide: AuthService, useValue: mockAuthService },
        { provide: ThemeService, useValue: mockThemeService },
        provideRouter([]),
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(ShellComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
  });

  it.each([
    ['toolbar', 'mat-toolbar'],
    ['theme toggle button', '[aria-label="Toggle theme"]'],
    ['user menu button', '[aria-label="User menu"]'],
    ['splitter with two panels', 'dms-splitter'],
  ])('should render %s', (label, selector) => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector(selector)).toBeTruthy();
  });

  describe('onLogout', () => {
    it('should show confirmation dialog', () => {
      component.onLogout();
      expect(mockConfirmDialog.confirm).toHaveBeenCalled();
    });

    it('should logout and navigate on confirm', async () => {
      const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
      component.onLogout();
      await vi.waitFor(() => {
        expect(mockAuthService.signOut).toHaveBeenCalled();
        expect(navigateSpy).toHaveBeenCalledWith(['/auth/login']);
      });
    });
  });
});
