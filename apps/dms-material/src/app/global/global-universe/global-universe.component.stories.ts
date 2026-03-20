import { signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import {
  applicationConfig,
  type Meta,
  type StoryObj,
} from '@storybook/angular';
import { of } from 'rxjs';

import { ErrorHandlingService } from '../../shared/services/error-handling.service';
import { GlobalLoadingService } from '../../shared/services/global-loading.service';
import { NotificationService } from '../../shared/services/notification.service';
import { SortFilterStateService } from '../../shared/services/sort-filter-state.service';
import { UniverseSyncService } from '../../shared/services/universe-sync.service';
import { UpdateUniverseFieldsService } from '../../shared/services/update-universe-fields.service';
import { ScreenerService } from '../global-screener/services/screener.service';
import { GlobalUniverseComponent } from './global-universe.component';
import { UniverseService } from './services/universe.service';
import { UniverseValidationService } from './services/universe-validation.service';

const mockUniverseService = {
  universes: signal([
    {
      id: '1',
      symbol: 'AAPL',
      name: 'Apple Inc.',
      distribution: 0.96,
      distributions_per_year: 4,
      last_price: 178.5,
      most_recent_sell_date: null,
      most_recent_sell_price: null,
      ex_date: '2025-05-10',
      risk_group_id: 'rg1',
      expired: false,
      is_closed_end_fund: false,
      position: 100,
      avg_purchase_yield_percent: 0.54,
    },
    {
      id: '2',
      symbol: 'MSFT',
      name: 'Microsoft Corp.',
      distribution: 3.0,
      distributions_per_year: 4,
      last_price: 420.0,
      most_recent_sell_date: '2024-12-15',
      most_recent_sell_price: 395.0,
      ex_date: '2025-05-15',
      risk_group_id: 'rg1',
      expired: false,
      is_closed_end_fund: false,
      position: 50,
      avg_purchase_yield_percent: 0.71,
    },
    {
      id: '3',
      symbol: 'JNJ',
      name: 'Johnson & Johnson',
      distribution: 1.24,
      distributions_per_year: 4,
      last_price: 155.0,
      most_recent_sell_date: null,
      most_recent_sell_price: null,
      ex_date: '2025-05-22',
      risk_group_id: 'rg2',
      expired: false,
      is_closed_end_fund: false,
      position: 75,
      avg_purchase_yield_percent: 3.2,
    },
  ]),
};

const mockScreenerService = {
  screens: signal([]),
  error: signal<string | null>(null),
  refresh: function mockRefresh() {
    return of(null);
  },
};

const mockUniverseSyncService = {
  isSyncing: signal(false),
  syncFromScreener: function mockSync() {
    return of({ added: 0, removed: 0, unchanged: 0 });
  },
};

const mockUpdateFieldsService = {
  isUpdating: signal(false),
  updateFields: function mockUpdate() {
    return of({ updated: 0 });
  },
};

const mockValidationService = {
  validateFieldValue: function mockValidate(): boolean {
    return true;
  },
};

const mockGlobalLoadingService = {
  isLoading: signal(false),
  message: signal('Loading...'),
  show: function mockShow(): void {
    /* noop */
  },
  hide: function mockHide(): void {
    /* noop */
  },
  updateMessage: function mockUpdateMessage(): void {
    /* noop */
  },
};

const mockNotificationService = {
  success: function mockSuccess(): void {
    /* noop */
  },
  error: function mockError(): void {
    /* noop */
  },
  info: function mockInfo(): void {
    /* noop */
  },
  warn: function mockWarn(): void {
    /* noop */
  },
  show: function mockShow(): void {
    /* noop */
  },
};

const mockDialog = {
  open: function mockOpen() {
    return {
      afterClosed: function afterClosed() {
        return of(null);
      },
    };
  },
} as unknown as MatDialog;

const mockErrorHandlingService = {
  handleOperationError: function mockHandleError(): void {
    /* noop */
  },
};

const mockSortFilterStateService = {
  saveSortState: function mockSaveSortState(): void {
    /* noop */
  },
  loadSortState: function mockLoadSortState(): null {
    return null;
  },
  clearSortState: function mockClearSortState(): void {
    /* noop */
  },
  saveFilterState: function mockSaveFilterState(): void {
    /* noop */
  },
  loadFilterState: function mockLoadFilterState(): null {
    return null;
  },
  clearFilterState: function mockClearFilterState(): void {
    /* noop */
  },
  clearAllState: function mockClearAllState(): void {
    /* noop */
  },
};

const meta: Meta<GlobalUniverseComponent> = {
  title: 'Pages/GlobalUniverse',
  component: GlobalUniverseComponent,
  decorators: [
    applicationConfig({
      providers: [
        { provide: UniverseService, useValue: mockUniverseService },
        { provide: ScreenerService, useValue: mockScreenerService },
        { provide: UniverseSyncService, useValue: mockUniverseSyncService },
        {
          provide: UpdateUniverseFieldsService,
          useValue: mockUpdateFieldsService,
        },
        { provide: UniverseValidationService, useValue: mockValidationService },
        { provide: GlobalLoadingService, useValue: mockGlobalLoadingService },
        { provide: NotificationService, useValue: mockNotificationService },
        { provide: MatDialog, useValue: mockDialog },
        { provide: ErrorHandlingService, useValue: mockErrorHandlingService },
        {
          provide: SortFilterStateService,
          useValue: mockSortFilterStateService,
        },
      ],
    }),
  ],
};

export default meta;

type Story = StoryObj<GlobalUniverseComponent>;

export const LightMode: Story = {};

export const DarkMode: Story = {
  decorators: [
    function applyDarkTheme(story) {
      const result = story();
      document.body.classList.add('dark-theme');
      return result;
    },
  ],
};
