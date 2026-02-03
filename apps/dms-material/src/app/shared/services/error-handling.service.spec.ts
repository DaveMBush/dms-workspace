import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { ErrorHandlingService } from './error-handling.service';
import { GlobalLoadingService } from './global-loading.service';
import { NotificationService } from './notification.service';

describe('ErrorHandlingService', () => {
  let service: ErrorHandlingService;
  let globalLoading: GlobalLoadingService;
  let notification: NotificationService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ErrorHandlingService,
        {
          provide: GlobalLoadingService,
          useValue: {
            hide: vi.fn(),
            show: vi.fn(),
          },
        },
        {
          provide: NotificationService,
          useValue: {
            showPersistent: vi.fn(),
            error: vi.fn(),
            success: vi.fn(),
          },
        },
      ],
    });

    service = TestBed.inject(ErrorHandlingService);
    globalLoading = TestBed.inject(GlobalLoadingService);
    notification = TestBed.inject(NotificationService);
  });

  describe('extractErrorMessage', () => {
    it('should extract message from Error instance', () => {
      const error = new Error('Something went wrong');
      expect(service.extractErrorMessage(error)).toBe('Something went wrong');
    });

    it('should extract message from error.error.message', () => {
      const error = { error: { message: 'Nested error message' } };
      expect(service.extractErrorMessage(error)).toBe('Nested error message');
    });

    it('should extract message from error.message', () => {
      const error = { message: 'Direct error message' };
      expect(service.extractErrorMessage(error)).toBe('Direct error message');
    });

    it('should extract message from error.statusText', () => {
      const error = { statusText: 'Internal Server Error' };
      expect(service.extractErrorMessage(error)).toBe('Internal Server Error');
    });

    it('should prioritize error.error.message over error.message', () => {
      const error = {
        error: { message: 'Nested message' },
        message: 'Direct message',
      };
      expect(service.extractErrorMessage(error)).toBe('Nested message');
    });

    it('should prioritize error.message over error.statusText', () => {
      const error = {
        message: 'Direct message',
        statusText: 'Status text',
      };
      expect(service.extractErrorMessage(error)).toBe('Direct message');
    });

    it('should return default message for null', () => {
      expect(service.extractErrorMessage(null)).toBe('Unknown error');
    });

    it('should return default message for undefined', () => {
      expect(service.extractErrorMessage(undefined)).toBe('Unknown error');
    });

    it('should return default message for primitive types', () => {
      expect(service.extractErrorMessage('string error')).toBe('Unknown error');
      expect(service.extractErrorMessage(123)).toBe('Unknown error');
      expect(service.extractErrorMessage(true)).toBe('Unknown error');
    });

    it('should return default message for empty object', () => {
      expect(service.extractErrorMessage({})).toBe('Unknown error');
    });

    it('should return default message when all candidates are empty strings', () => {
      const error = {
        error: { message: '' },
        message: '',
        statusText: '',
      };
      expect(service.extractErrorMessage(error)).toBe('Unknown error');
    });

    it('should return default message when all candidates are null', () => {
      const error = {
        error: { message: null },
        message: null,
        statusText: null,
      };
      expect(service.extractErrorMessage(error)).toBe('Unknown error');
    });
  });

  describe('handleOperationError', () => {
    it('should hide loading by default', () => {
      service.handleOperationError(new Error('Test error'), 'test operation');
      expect(globalLoading.hide).toHaveBeenCalledOnce();
    });

    it('should show persistent notification by default', () => {
      const error = new Error('Test error');
      service.handleOperationError(error, 'test operation');

      expect(notification.showPersistent).toHaveBeenCalledWith(
        'Failed to test operation: Test error',
        'error'
      );
    });

    it('should not hide loading when hideLoading is false', () => {
      service.handleOperationError(new Error('Test error'), 'test operation', {
        hideLoading: false,
      });
      expect(globalLoading.hide).not.toHaveBeenCalled();
    });

    it('should show non-persistent notification when persistent is false', () => {
      const error = new Error('Test error');
      service.handleOperationError(error, 'test operation', {
        persistent: false,
      });

      expect(notification.error).toHaveBeenCalledWith(
        'Failed to test operation: Test error'
      );
      expect(notification.showPersistent).not.toHaveBeenCalled();
    });

    it('should format operation name correctly', () => {
      service.handleOperationError(
        new Error('Connection timeout'),
        'sync universe'
      );

      expect(notification.showPersistent).toHaveBeenCalledWith(
        'Failed to sync universe: Connection timeout',
        'error'
      );
    });

    it('should extract error message from complex error objects', () => {
      const error = {
        error: { message: 'Database connection failed' },
      };
      service.handleOperationError(error, 'update fields');

      expect(notification.showPersistent).toHaveBeenCalledWith(
        'Failed to update fields: Database connection failed',
        'error'
      );
    });

    it('should handle both options together', () => {
      service.handleOperationError(new Error('Test error'), 'test operation', {
        hideLoading: false,
        persistent: false,
      });

      expect(globalLoading.hide).not.toHaveBeenCalled();
      expect(notification.error).toHaveBeenCalled();
      expect(notification.showPersistent).not.toHaveBeenCalled();
    });
  });
});
