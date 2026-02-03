import { inject, Injectable } from '@angular/core';

import { ErrorHandlingOptions } from './error-handling-options.interface';
import { GlobalLoadingService } from './global-loading.service';
import { NotificationService } from './notification.service';

/**
 * Service for consistent error handling throughout the application
 */
@Injectable({
  providedIn: 'root',
})
export class ErrorHandlingService {
  private readonly globalLoading = inject(GlobalLoadingService);
  private readonly notification = inject(NotificationService);

  /**
   * Handle operation error with consistent pattern
   * @param error - Error object from operation
   * @param operationName - Name of the operation that failed
   * @param options - Optional configuration for error handling
   */
  handleOperationError(
    error: unknown,
    operationName: string,
    options: ErrorHandlingOptions = {}
  ): void {
    const { hideLoading = true, persistent = true } = options;

    if (hideLoading) {
      this.globalLoading.hide();
    }

    const errorMessage = this.extractErrorMessage(error);
    const fullMessage = `Failed to ${operationName}: ${errorMessage}`;

    if (persistent) {
      this.notification.showPersistent(fullMessage, 'error');
    } else {
      this.notification.error(fullMessage);
    }
  }

  /**
   * Extract error message from various error formats
   * @param error - Error object from HTTP request or other sources
   * @returns Error message string
   */
  extractErrorMessage(error: unknown): string {
    const DEFAULT_ERROR_MESSAGE = 'Unknown error';

    if (error instanceof Error) {
      return error.message;
    }

    if (error === null || error === undefined || typeof error !== 'object') {
      return DEFAULT_ERROR_MESSAGE;
    }

    const err = error as {
      error?: { message?: string };
      message?: string;
      statusText?: string;
    };

    // Try nested error.message first, then message, then statusText
    const candidates = [err.error?.message, err.message, err.statusText];

    for (const candidate of candidates) {
      if (candidate !== null && candidate !== undefined && candidate !== '') {
        return candidate;
      }
    }

    return DEFAULT_ERROR_MESSAGE;
  }
}
