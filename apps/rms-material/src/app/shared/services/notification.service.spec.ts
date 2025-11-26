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
      expect.objectContaining({ panelClass: ['snackbar-success'] })
    );
  });

  it('should call snackBar.open with error class', () => {
    service.error('Error message');
    expect(mockSnackBar.open).toHaveBeenCalledWith(
      'Error message',
      'Close',
      expect.objectContaining({ panelClass: ['snackbar-error'] })
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
});
