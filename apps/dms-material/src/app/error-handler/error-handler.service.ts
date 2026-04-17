import { inject, Injectable } from '@angular/core';
import { SmartErrorHandler } from '@smarttools/smart-signals';

import { NotificationService } from '../shared/services/notification.service';

@Injectable()
export class ErrorHandlerService implements SmartErrorHandler {
  private notification = inject(NotificationService);

  handleError(message: string, error: unknown): void {
    console.error(message, error);
    this.notification.error(message);
  }
}
