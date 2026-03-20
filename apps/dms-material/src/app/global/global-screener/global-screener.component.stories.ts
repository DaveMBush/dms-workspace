import { signal } from '@angular/core';
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
import { Screen } from '../../store/screen/screen.interface';
import { GlobalScreenerComponent } from './global-screener.component';
import { ScreenerService } from './services/screener.service';

const mockScreens: Screen[] = [
  {
    id: '1',
    symbol: 'AAPL',
    risk_group: 'Equities',
    has_volitility: true,
    objectives_understood: true,
    graph_higher_before_2008: false,
  },
  {
    id: '2',
    symbol: 'MSFT',
    risk_group: 'Equities',
    has_volitility: true,
    objectives_understood: true,
    graph_higher_before_2008: true,
  },
  {
    id: '3',
    symbol: 'JNJ',
    risk_group: 'Income',
    has_volitility: false,
    objectives_understood: true,
    graph_higher_before_2008: true,
  },
  {
    id: '4',
    symbol: 'VZ',
    risk_group: 'Income',
    has_volitility: false,
    objectives_understood: false,
    graph_higher_before_2008: false,
  },
  {
    id: '5',
    symbol: 'MUB',
    risk_group: 'Tax Free Income',
    has_volitility: false,
    objectives_understood: true,
    graph_higher_before_2008: false,
  },
];

const mockScreenerService = {
  screens: signal(mockScreens),
  error: signal<string | null>(null),
  refresh: function mockRefresh() {
    return of(null);
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

const meta: Meta<GlobalScreenerComponent> = {
  title: 'Pages/GlobalScreener',
  component: GlobalScreenerComponent,
  decorators: [
    applicationConfig({
      providers: [
        { provide: ScreenerService, useValue: mockScreenerService },
        { provide: GlobalLoadingService, useValue: mockGlobalLoadingService },
        { provide: NotificationService, useValue: mockNotificationService },
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

type Story = StoryObj<GlobalScreenerComponent>;

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
