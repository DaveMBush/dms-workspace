import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NotificationService } from './notification.service';

describe('NotificationService', () => {
  let service: NotificationService;
  let mockSnackBar: { open: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockSnackBar = { open: vi.fn() };
    TestBed.configureTestingModule({
      providers: [{ provide: MatSnackBar, useValue: mockSnackBar }],
    });
    service = TestBed.inject(NotificationService);
  });

  it('should call snackBar.open with success class', () => {
    service.success('Test message');
    expect(mockSnackBar.open).toHaveBeenCalledWith(
      'Test message',
      'Close',
      expect.objectContaining({
        panelClass: ['snackbar-success', 'notification-success'],
      })
    );
  });

  it('should call snackBar.open with error class', () => {
    service.error('Error message');
    expect(mockSnackBar.open).toHaveBeenCalledWith(
      'Error message',
      'Close',
      expect.objectContaining({
        panelClass: ['snackbar-error', 'notification-error'],
      })
    );
  });

  it('should show persistent notification with duration 0', () => {
    service.showPersistent('Persistent', 'info');
    expect(mockSnackBar.open).toHaveBeenCalledWith(
      'Persistent',
      'Dismiss',
      expect.objectContaining({ duration: 0 })
    );
  });

  it('should call snackBar.open with info class', () => {
    service.info('Info message');
    expect(mockSnackBar.open).toHaveBeenCalledWith(
      'Info message',
      'Close',
      expect.objectContaining({
        panelClass: ['snackbar-info', 'notification-info'],
      })
    );
  });

  it('should call snackBar.open with warn class', () => {
    service.warn('Warning message');
    expect(mockSnackBar.open).toHaveBeenCalledWith(
      'Warning message',
      'Close',
      expect.objectContaining({
        panelClass: ['snackbar-warn', 'notification-warn'],
      })
    );
  });

  it('should use default info severity when no severity specified', () => {
    service.show('Generic message');
    expect(mockSnackBar.open).toHaveBeenCalledWith(
      'Generic message',
      'Close',
      expect.objectContaining({
        panelClass: ['snackbar-info', 'notification-info'],
      })
    );
  });

  it('should configure horizontal position to end', () => {
    service.info('Test');
    expect(mockSnackBar.open).toHaveBeenCalledWith(
      'Test',
      'Close',
      expect.objectContaining({ horizontalPosition: 'end' })
    );
  });

  it('should configure vertical position to top', () => {
    service.info('Test');
    expect(mockSnackBar.open).toHaveBeenCalledWith(
      'Test',
      'Close',
      expect.objectContaining({ verticalPosition: 'top' })
    );
  });

  it('should set default duration to 3000ms', () => {
    service.success('Test');
    expect(mockSnackBar.open).toHaveBeenCalledWith(
      'Test',
      'Close',
      expect.objectContaining({ duration: 3000 })
    );
  });
});
