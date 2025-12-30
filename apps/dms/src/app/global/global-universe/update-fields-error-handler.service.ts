import { Injectable } from '@angular/core';

interface ErrorSummary {
  successful: number;
  failed: number;
}

interface ErrorInfo {
  message: string;
  summary?: ErrorSummary;
}

@Injectable()
export class UpdateFieldsErrorHandler {
  extractErrorInfo(error: unknown): ErrorInfo {
    if (typeof error === 'object' && error !== null) {
      const errorObj = error as Record<string, unknown>;

      const message = this.getErrorMessage(errorObj);
      const summary = this.getErrorSummary(errorObj);

      return { message, summary };
    }

    return { message: 'Failed to update field information. Please try again.' };
  }

  buildErrorDetail(errorInfo: ErrorInfo): string {
    if (errorInfo.summary) {
      return `${errorInfo.message}. ${errorInfo.summary.successful} symbols updated, ${errorInfo.summary.failed} failed.`;
    }
    return errorInfo.message;
  }

  private getErrorMessage(errorObj: Record<string, unknown>): string {
    if (typeof errorObj['error'] === 'object' && errorObj['error'] !== null) {
      const nestedError = errorObj['error'] as Record<string, unknown>;
      if (typeof nestedError['message'] === 'string') {
        return nestedError['message'];
      }
    }

    if (typeof errorObj['message'] === 'string') {
      return errorObj['message'];
    }

    return 'Failed to update field information. Please try again.';
  }

  private getErrorSummary(
    errorObj: Record<string, unknown>
  ): ErrorSummary | undefined {
    if (typeof errorObj['error'] !== 'object' || errorObj['error'] === null) {
      return undefined;
    }

    const nestedError = errorObj['error'] as Record<string, unknown>;
    if (
      typeof nestedError['summary'] !== 'object' ||
      nestedError['summary'] === null
    ) {
      return undefined;
    }

    const summary = nestedError['summary'] as Record<string, unknown>;
    if (
      typeof summary['successful'] === 'number' &&
      typeof summary['failed'] === 'number'
    ) {
      return { successful: summary['successful'], failed: summary['failed'] };
    }

    return undefined;
  }
}
