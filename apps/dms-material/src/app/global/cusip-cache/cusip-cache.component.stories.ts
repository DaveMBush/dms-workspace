import { signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import {
  applicationConfig,
  type Meta,
  type StoryObj,
} from '@storybook/angular';
import { of } from 'rxjs';

import { ConfirmDialogService } from '../../shared/services/confirm-dialog.service';
import { NotificationService } from '../../shared/services/notification.service';
import { CusipCacheComponent } from './cusip-cache.component';
import { CusipCacheAdminService } from './cusip-cache-admin.service';

const mockStats = {
  totalEntries: 1250,
  entriesBySource: { yahoo: 750, manual: 300, import: 200 },
  oldestEntry: '2023-01-15T10:00:00Z',
  newestEntry: '2025-03-20T14:30:00Z',
  recentlyAdded: [
    {
      cusip: '037833100',
      symbol: 'AAPL',
      source: 'yahoo',
      resolvedAt: '2025-03-20T14:30:00Z',
    },
    {
      cusip: '594918104',
      symbol: 'MSFT',
      source: 'yahoo',
      resolvedAt: '2025-03-20T14:25:00Z',
    },
    {
      cusip: '02079K305',
      symbol: 'GOOGL',
      source: 'manual',
      resolvedAt: '2025-03-20T14:20:00Z',
    },
  ],
  timestamp: '2025-03-20T15:00:00Z',
};

const mockAdminService = {
  stats: signal(mockStats),
  searchResults: signal([
    {
      id: '1',
      cusip: '037833100',
      symbol: 'AAPL',
      source: 'yahoo',
      resolvedAt: '2025-03-20T14:30:00Z',
      lastUsedAt: '2025-03-20T15:00:00Z',
      createdAt: '2024-01-10T10:00:00Z',
      updatedAt: '2025-03-20T14:30:00Z',
    },
    {
      id: '2',
      cusip: '594918104',
      symbol: 'MSFT',
      source: 'yahoo',
      resolvedAt: '2025-03-20T14:25:00Z',
      lastUsedAt: '2025-03-20T14:50:00Z',
      createdAt: '2024-02-15T10:00:00Z',
      updatedAt: '2025-03-20T14:25:00Z',
    },
  ]),
  auditEntries: signal({ entries: [], total: 0 }),
  loading: signal(false),
  error: signal<string | null>(null),
  fetchStats: function mockFetchStats(): void {
    /* noop */
  },
  search: function mockSearch(): void {
    /* noop */
  },
  clearSearch: function mockClearSearch(): void {
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

const mockConfirmDialogService = {
  confirm: function mockConfirm() {
    return of(true);
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

const meta: Meta<CusipCacheComponent> = {
  title: 'Pages/CusipCache',
  component: CusipCacheComponent,
  decorators: [
    applicationConfig({
      providers: [
        { provide: CusipCacheAdminService, useValue: mockAdminService },
        { provide: MatDialog, useValue: mockDialog },
        { provide: ConfirmDialogService, useValue: mockConfirmDialogService },
        { provide: NotificationService, useValue: mockNotificationService },
      ],
    }),
  ],
};

export default meta;

type Story = StoryObj<CusipCacheComponent>;

export const LightMode: Story = {
  decorators: [
    function removeDarkTheme(story) {
      const result = story();
      document.body.classList.remove('dark-theme');
      return result;
    },
  ],
};

export const DarkMode: Story = {
  decorators: [
    function applyDarkTheme(story) {
      const result = story();
      document.body.classList.add('dark-theme');
      return result;
    },
  ],
};
