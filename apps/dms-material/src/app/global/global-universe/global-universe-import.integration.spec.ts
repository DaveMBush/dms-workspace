import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { signal } from '@angular/core';
import { provideSmartNgRX } from '@smarttools/smart-signals';
import { of } from 'rxjs';

import { NotificationService } from '../../shared/services/notification.service';
import { UniverseSyncService } from '../../shared/services/universe-sync.service';
import { Universe } from '../../store/universe/universe.interface';
import { GlobalUniverseComponent } from './global-universe.component';
import { UniverseService } from './services/universe.service';

/**
 * TDD RED Phase: These tests define the expected behavior for the
 * "Import Transactions" button integration in the Global/Universe screen.
 * All tests are disabled with describe.skip so CI passes.
 * Story AR.3 will implement the functionality and re-enable these tests.
 */

// Mock SmartNgRX selectors
vi.mock('../../store/universe/selectors/select-universes.function', () => ({
  selectUniverses: vi.fn().mockReturnValue([]),
}));

vi.mock('../../store/accounts/selectors/select-accounts.function', () => ({
  selectAccounts: vi.fn().mockReturnValue([]),
}));

vi.mock('../../store/risk-group/selectors/select-risk-group.function', () => ({
  selectRiskGroup: vi.fn().mockReturnValue([
    { id: 'rg1', name: 'Equities' },
    { id: 'rg2', name: 'Income' },
  ]),
}));

vi.mock('../../store/top/selectors/select-top-entities.function', () => ({
  selectTopEntities: vi.fn().mockReturnValue({ entities: {}, ids: [] }),
}));

vi.mock(
  '../../store/risk-group/selectors/select-risk-group-entities.function',
  () => ({
    selectRiskGroupEntities: vi.fn().mockReturnValue({ entities: {}, ids: [] }),
  })
);

vi.mock(
  '../../store/risk-group/selectors/select-risk-group-entity.function',
  () => ({
    selectRiskGroupEntity: vi.fn().mockReturnValue({ id: '', name: '' }),
  })
);

vi.mock('../../store/screen/selectors/select-screen.function', () => ({
  selectScreen: vi.fn().mockReturnValue([]),
}));

describe.skip('GlobalUniverseComponent - Import Integration', () => {
  let component: GlobalUniverseComponent;
  let fixture: ComponentFixture<GlobalUniverseComponent>;
  let mockDialog: { open: ReturnType<typeof vi.fn> };
  let mockSyncService: {
    syncFromScreener: ReturnType<typeof vi.fn>;
    isSyncing: ReturnType<typeof vi.fn>;
  };
  let mockNotification: {
    success: ReturnType<typeof vi.fn>;
    warn: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
    info: ReturnType<typeof vi.fn>;
    showPersistent: ReturnType<typeof vi.fn>;
  };
  let mockUniverseService: {
    universes: ReturnType<typeof signal<Universe[]>>;
  };

  beforeEach(async () => {
    const mockDialogRef = {
      afterClosed: vi.fn().mockReturnValue(of({ success: true, imported: 5 })),
      close: vi.fn(),
    };

    mockDialog = {
      open: vi.fn().mockReturnValue(mockDialogRef),
    };
    mockSyncService = {
      syncFromScreener: vi
        .fn()
        .mockReturnValue(of({ inserted: 0, updated: 0, markedExpired: 0 })),
      isSyncing: vi.fn().mockReturnValue(false),
    };
    mockNotification = {
      success: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
      showPersistent: vi.fn(),
    };
    mockUniverseService = {
      universes: signal<Universe[]>([]),
    };

    await TestBed.configureTestingModule({
      imports: [GlobalUniverseComponent],
      providers: [
        provideSmartNgRX(),
        { provide: MatDialog, useValue: mockDialog },
        { provide: UniverseSyncService, useValue: mockSyncService },
        { provide: NotificationService, useValue: mockNotification },
        { provide: UniverseService, useValue: mockUniverseService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(GlobalUniverseComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('Import Transactions button', () => {
    it('should have an "Import Transactions" button in the toolbar', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const importButton = compiled.querySelector(
        '[data-testid="import-transactions-button"]'
      );
      expect(importButton).toBeTruthy();
    });

    it('should display import icon on the button', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const importButton = compiled.querySelector(
        '[data-testid="import-transactions-button"]'
      )!;
      const icon = importButton.querySelector('mat-icon')!;
      expect(icon.textContent.trim()).toBe('upload_file');
    });

    it('should have tooltip text "Import Fidelity CSV"', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const importButton = compiled.querySelector(
        '[data-testid="import-transactions-button"]'
      )!;
      expect(importButton.getAttribute('aria-label')).toBe(
        'Import Fidelity CSV'
      );
    });
  });

  describe('button opens dialog', () => {
    it('should open ImportDialogComponent when import button is clicked', () => {
      // AR.3 GREEN phase: Replace with:
      //   import { ImportDialogComponent } from '../import-dialog/import-dialog.component';
      // and remove this placeholder class.
      class ImportDialogComponent {
        placeholder = true;
      }

      const compiled = fixture.nativeElement as HTMLElement;
      const importButton = compiled.querySelector(
        '[data-testid="import-transactions-button"]'
      )!;
      importButton.click();
      fixture.detectChanges();

      expect(mockDialog.open).toHaveBeenCalledWith(
        ImportDialogComponent,
        expect.objectContaining({
          width: expect.any(String),
          disableClose: false,
        })
      );
    });

    it('should pass dialog configuration with appropriate width', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const importButton = compiled.querySelector(
        '[data-testid="import-transactions-button"]'
      )!;
      importButton.click();
      fixture.detectChanges();

      expect(mockDialog.open).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          width: expect.stringContaining('px'),
        })
      );
    });
  });

  describe('dialog receives context data', () => {
    it('should pass current account filter to dialog data', () => {
      // Set an account filter
      component.selectedAccountId$.set('account-456');

      const compiled = fixture.nativeElement as HTMLElement;
      const importButton = compiled.querySelector(
        '[data-testid="import-transactions-button"]'
      )!;
      importButton.click();
      fixture.detectChanges();

      expect(mockDialog.open).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          data: expect.objectContaining({
            accountFilter: 'account-456',
          }),
        })
      );
    });

    it('should pass "all" as account filter when no specific account selected', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const importButton = compiled.querySelector(
        '[data-testid="import-transactions-button"]'
      )!;
      importButton.click();
      fixture.detectChanges();

      expect(mockDialog.open).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          data: expect.objectContaining({
            accountFilter: 'all',
          }),
        })
      );
    });
  });

  describe('data refresh after successful import', () => {
    it('should show success notification after dialog closes with success', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const importButton = compiled.querySelector(
        '[data-testid="import-transactions-button"]'
      )!;
      importButton.click();
      fixture.detectChanges();

      // Dialog was opened and afterClosed returns success
      // The component should trigger a data refresh
      expect(mockNotification.success).toHaveBeenCalledWith(
        expect.stringMatching(/import|transaction/i)
      );
    });

    it('should not refresh when dialog is cancelled (no result)', () => {
      // Reset mock to return undefined (dialog cancelled)
      const cancelDialogRef = {
        afterClosed: vi.fn().mockReturnValue(of(undefined)),
        close: vi.fn(),
      };
      mockDialog.open.mockReturnValue(
        cancelDialogRef as unknown as MatDialogRef<unknown>
      );

      const compiled = fixture.nativeElement as HTMLElement;
      const importButton = compiled.querySelector(
        '[data-testid="import-transactions-button"]'
      )!;
      importButton.click();
      fixture.detectChanges();

      // Should not show success notification when cancelled
      expect(mockNotification.success).not.toHaveBeenCalled();
    });

    it('should show success notification with imported count after successful import', () => {
      const successDialogRef = {
        afterClosed: vi
          .fn()
          .mockReturnValue(of({ success: true, imported: 12 })),
        close: vi.fn(),
      };
      mockDialog.open.mockReturnValue(
        successDialogRef as unknown as MatDialogRef<unknown>
      );

      const compiled = fixture.nativeElement as HTMLElement;
      const importButton = compiled.querySelector(
        '[data-testid="import-transactions-button"]'
      )!;
      importButton.click();
      fixture.detectChanges();

      expect(mockNotification.success).toHaveBeenCalledWith(
        expect.stringContaining('12')
      );
    });
  });
});
