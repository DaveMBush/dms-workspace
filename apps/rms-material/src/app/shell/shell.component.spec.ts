import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Router } from '@angular/router';
import { of } from 'rxjs';

import { AuthService } from '../auth/auth.service';
import { ConfirmDialogService } from '../shared/services/confirm-dialog.service';
import { ShellComponent } from './shell.component';

describe('ShellComponent', () => {
  let component: ShellComponent;
  let fixture: ComponentFixture<ShellComponent>;
  let mockConfirmDialog: {
    confirm: ReturnType<typeof vi.fn>;
  };
  let mockAuthService: { signOut: ReturnType<typeof vi.fn> };
  let mockRouter: { navigate: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    mockConfirmDialog = {
      confirm: vi.fn().mockReturnValue(of(true)),
    };
    mockAuthService = { signOut: vi.fn() };
    mockRouter = { navigate: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [ShellComponent, NoopAnimationsModule],
      providers: [
        {
          provide: ConfirmDialogService,
          useValue: mockConfirmDialog,
        },
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ShellComponent);
    component = fixture.componentInstance;
  });

  it('should render toolbar', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('mat-toolbar')).toBeTruthy();
  });

  it('should render theme toggle button', () => {
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('[aria-label="Toggle theme"]')
    ).toBeTruthy();
  });

  it('should render user menu button', () => {
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('[aria-label="User menu"]')
    ).toBeTruthy();
  });

  it('should render splitter with two panels', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('rms-splitter')).toBeTruthy();
  });

  describe('onLogout', () => {
    it('should show confirmation dialog', () => {
      component.onLogout();
      expect(mockConfirmDialog.confirm).toHaveBeenCalled();
    });

    it('should logout and navigate on confirm', async () => {
      component.onLogout();
      await vi.waitFor(() => {
        expect(mockAuthService.signOut).toHaveBeenCalled();
        expect(mockRouter.navigate).toHaveBeenCalledWith(['/auth/login']);
      });
    });
  });
});
