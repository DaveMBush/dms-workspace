import { TestBed } from '@angular/core/testing';
import { MessageService } from 'primeng/api';
import { of, throwError } from 'rxjs';
import { describe, test, expect, beforeEach, vi } from 'vitest';

import { universeEffectsServiceToken } from '../../store/universe/universe-effect-service-token';
import { DeleteUniverseHelper } from './delete-universe.helper';
import type { UniverseDisplayData } from './universe-display-data.interface';

describe('DeleteUniverseHelper', () => {
  let helper: DeleteUniverseHelper;
  let messageService: MessageService;
  let universeEffectsService: any;

  const mockUniverse: UniverseDisplayData = {
    id: 'universe-1',
    symbol: 'AAPL',
    riskGroup: 'Growth',
    distribution: 0.25,
    distributions_per_year: 4,
    last_price: 150.0,
    most_recent_sell_date: null,
    most_recent_sell_price: null,
    ex_date: new Date('2024-03-15'),
    yield_percent: 0.667,
    avg_purchase_yield_percent: 8.33,
    expired: false,
    is_closed_end_fund: false,
    position: 0, // No position = eligible for deletion
  };

  const mockCEFUniverse: UniverseDisplayData = {
    ...mockUniverse,
    id: 'universe-2',
    symbol: 'CEF1',
    is_closed_end_fund: true, // CEF = not eligible for deletion
  };

  const mockUniverseWithPosition: UniverseDisplayData = {
    ...mockUniverse,
    id: 'universe-3',
    symbol: 'MSFT',
    position: 1000, // Has position = not eligible for deletion
  };

  beforeEach(async () => {
    universeEffectsService = {
      delete: vi.fn(),
    };

    const messageServiceSpy = {
      add: vi.fn(),
    };

    await TestBed.configureTestingModule({
      providers: [
        DeleteUniverseHelper,
        { provide: MessageService, useValue: messageServiceSpy },
        {
          provide: universeEffectsServiceToken,
          useValue: universeEffectsService,
        },
      ],
    }).compileComponents();

    helper = TestBed.inject(DeleteUniverseHelper);
    messageService = TestBed.inject(MessageService);
  });

  describe('shouldShowDeleteButton', () => {
    test('should return true for non-CEF universe with zero position', () => {
      const result = helper.shouldShowDeleteButton(mockUniverse);
      expect(result).toBe(true);
    });

    test('should return false for CEF universe', () => {
      const result = helper.shouldShowDeleteButton(mockCEFUniverse);
      expect(result).toBe(false);
    });

    test('should return false for universe with position > 0', () => {
      const result = helper.shouldShowDeleteButton(mockUniverseWithPosition);
      expect(result).toBe(false);
    });

    test('should return false for CEF universe with position > 0', () => {
      const mockCEFWithPosition = {
        ...mockCEFUniverse,
        position: 1000,
      };
      const result = helper.shouldShowDeleteButton(mockCEFWithPosition);
      expect(result).toBe(false);
    });
  });

  describe('confirmDelete', () => {
    test('should set symbolToDelete and show dialog', () => {
      helper.confirmDelete(mockUniverse);

      expect(helper.symbolToDelete()).toEqual(mockUniverse);
      expect(helper.showDeleteDialog()).toBe(true);
    });
  });

  describe('cancelDelete', () => {
    test('should clear symbolToDelete and hide dialog', () => {
      // First set up the dialog
      helper.confirmDelete(mockUniverse);
      expect(helper.symbolToDelete()).toEqual(mockUniverse);
      expect(helper.showDeleteDialog()).toBe(true);

      // Then cancel
      helper.cancelDelete();

      expect(helper.symbolToDelete()).toBeNull();
      expect(helper.showDeleteDialog()).toBe(false);
    });
  });

  describe('deleteUniverse', () => {
    test('should return early if no symbol selected', () => {
      helper.symbolToDelete.set(null);

      helper.deleteUniverse();

      expect(universeEffectsService.delete).not.toHaveBeenCalled();
      // eslint-disable-next-line @typescript-eslint/unbound-method -- Test spy access
      expect(messageService.add).not.toHaveBeenCalled();
    });

    test('should call delete service and show success message on completion', () => {
      helper.symbolToDelete.set(mockUniverse);
      universeEffectsService.delete.mockReturnValue(of(undefined));

      helper.deleteUniverse();

      expect(universeEffectsService.delete).toHaveBeenCalledWith('universe-1');
      // eslint-disable-next-line @typescript-eslint/unbound-method -- Test spy access
      expect(messageService.add).toHaveBeenCalledWith({
        severity: 'success',
        summary: 'Success',
        detail: 'Symbol AAPL deleted successfully',
      });
      expect(helper.showDeleteDialog()).toBe(false);
      expect(helper.symbolToDelete()).toBeNull();
    });

    test('should show error message on API error', () => {
      helper.symbolToDelete.set(mockUniverse);
      helper.showDeleteDialog.set(true); // Ensure dialog is open initially
      const errorMessage = 'Cannot delete symbols with active trades';
      universeEffectsService.delete.mockReturnValue(
        throwError(() => new Error(errorMessage))
      );

      helper.deleteUniverse();

      expect(universeEffectsService.delete).toHaveBeenCalledWith('universe-1');
      // eslint-disable-next-line @typescript-eslint/unbound-method -- Test spy access
      expect(messageService.add).toHaveBeenCalledWith({
        severity: 'error',
        summary: 'Error',
        detail: `Failed to delete symbol AAPL: ${errorMessage}`,
      });
      // Dialog should remain open on error
      expect(helper.showDeleteDialog()).toBe(true);
      expect(helper.symbolToDelete()).toEqual(mockUniverse);
    });

    test('should handle network errors gracefully', () => {
      helper.symbolToDelete.set(mockUniverse);
      universeEffectsService.delete.mockReturnValue(
        throwError(() => new Error('Network error'))
      );

      helper.deleteUniverse();

      // eslint-disable-next-line @typescript-eslint/unbound-method -- Test spy access
      expect(messageService.add).toHaveBeenCalledWith({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to delete symbol AAPL: Network error',
      });
    });

    test('should handle unknown error types', () => {
      helper.symbolToDelete.set(mockUniverse);
      universeEffectsService.delete.mockReturnValue(
        throwError(() => 'String error')
      );

      helper.deleteUniverse();

      // eslint-disable-next-line @typescript-eslint/unbound-method -- Test spy access
      expect(messageService.add).toHaveBeenCalledWith({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to delete symbol AAPL: Unknown error',
      });
    });
  });
});
