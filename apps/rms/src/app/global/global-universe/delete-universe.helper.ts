import { inject, Injectable, signal } from '@angular/core';
import { MessageService } from 'primeng/api';

import { universeEffectsServiceToken } from '../../store/universe/universe-effect-service-token';
import type { UniverseDisplayData } from './universe-display-data.interface';

@Injectable()
export class DeleteUniverseHelper {
  private readonly universeEffectsService = inject(universeEffectsServiceToken);
  private readonly messageService = inject(MessageService);

  readonly showDeleteDialog = signal<boolean>(false);
  readonly symbolToDelete = signal<UniverseDisplayData | null>(null);

  /**
   * Determines if the delete button should be shown for a universe row
   * @param row Universe row to check
   * @returns true if delete button should be shown
   */
  shouldShowDeleteButton(row: UniverseDisplayData): boolean {
    return !row.is_closed_end_fund && row.position === 0;
  }

  /**
   * Shows the delete confirmation dialog for the specified universe row
   * @param row Universe row to delete
   */
  confirmDelete(row: UniverseDisplayData): void {
    this.symbolToDelete.set(row);
    this.showDeleteDialog.set(true);
  }

  /**
   * Cancels the delete operation and closes the dialog
   */
  cancelDelete(): void {
    this.showDeleteDialog.set(false);
    this.symbolToDelete.set(null);
  }

  /**
   * Deletes the selected universe entry
   */
  deleteUniverse(): void {
    const symbol = this.symbolToDelete();
    if (!symbol) {
      return;
    }

    const messageService = this.messageService;
    const showDeleteDialog = this.showDeleteDialog;
    const symbolToDelete = this.symbolToDelete;

    this.universeEffectsService.delete(symbol.id).subscribe({
      next: function deleteUniverseNext() {
        // Success case - close dialog and show success message
        messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: `Symbol ${symbol.symbol} deleted successfully`,
        });
        showDeleteDialog.set(false);
        symbolToDelete.set(null);
      },
      error: function deleteUniverseError(error: unknown) {
        // Error case - keep dialog open and show error message
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: `Failed to delete symbol ${symbol.symbol}: ${errorMessage}`,
        });
        // Don't close the dialog on error - let user retry or cancel
      },
    });
  }
}
