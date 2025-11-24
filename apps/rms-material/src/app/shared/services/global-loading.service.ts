import { Injectable, signal } from '@angular/core';

/**
 * Global loading service for application-wide loading states
 * Provides centralized loading state management for overlays that should cover the entire screen
 */
@Injectable({
  providedIn: 'root',
})
export class GlobalLoadingService {
  private loadingSignal = signal(false);
  private messageSignal = signal('Loading...');

  /**
   * Current loading state as a readonly signal
   */
  readonly isLoading = this.loadingSignal.asReadonly();

  /**
   * Current loading message as a readonly signal
   */
  readonly message = this.messageSignal.asReadonly();

  /**
   * Show global loading overlay
   * @param message Optional loading message to display
   */
  show(message = 'Loading...'): void {
    this.messageSignal.set(message);
    this.loadingSignal.set(true);
  }

  /**
   * Hide global loading overlay
   */
  hide(): void {
    this.loadingSignal.set(false);
  }

  /**
   * Update loading message without changing loading state
   * @param message New loading message
   */
  updateMessage(message: string): void {
    this.messageSignal.set(message);
  }
}
