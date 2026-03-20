import { provideHttpClient } from '@angular/common/http';
import { signal } from '@angular/core';
import {
  applicationConfig,
  type Meta,
  type StoryObj,
} from '@storybook/angular';

import { GlobalSummaryComponent } from './global-summary';
import { GraphPoint } from './services/graph-point.interface';
import { MonthOption } from './services/month-option.interface';
import { Summary } from './services/summary.interface';
import { SummaryService } from './services/summary.service';

const mockSummaryData: Summary = {
  deposits: 500000,
  dividends: 12500,
  capitalGains: 35000,
  equities: 300000,
  income: 150000,
  tax_free_income: 50000,
};

const mockGraphData: GraphPoint[] = [
  { month: 'Jan', deposits: 480000, dividends: 1800, capitalGains: 2500 },
  { month: 'Feb', deposits: 485000, dividends: 2000, capitalGains: 3000 },
  { month: 'Mar', deposits: 490000, dividends: 2200, capitalGains: 4500 },
  { month: 'Apr', deposits: 492000, dividends: 1900, capitalGains: 5000 },
  { month: 'May', deposits: 495000, dividends: 2100, capitalGains: 6000 },
  { month: 'Jun', deposits: 500000, dividends: 2500, capitalGains: 7000 },
];

const mockMonths: MonthOption[] = [
  { label: 'March 2025', value: '2025-03' },
  { label: 'February 2025', value: '2025-02' },
  { label: 'January 2025', value: '2025-01' },
];

const mockSummaryService = {
  summary: signal(mockSummaryData),
  graph: signal(mockGraphData),
  months: signal(mockMonths),
  accountMonths: signal<MonthOption[]>([]),
  years: signal([2023, 2024, 2025]),
  loading: signal(false),
  error: signal<string | null>(null),
  fetchSummary: function mockFetchSummary(): void {
    /* noop */
  },
  fetchGraph: function mockFetchGraph(): void {
    /* noop */
  },
  fetchMonths: function mockFetchMonths(): void {
    /* noop */
  },
  fetchYears: function mockFetchYears(): void {
    /* noop */
  },
  invalidateMonthsCache: function mockInvalidateMonthsCache(): void {
    /* noop */
  },
  invalidateYearsCache: function mockInvalidateYearsCache(): void {
    /* noop */
  },
};

const meta: Meta<GlobalSummaryComponent> = {
  title: 'Pages/GlobalSummary',
  component: GlobalSummaryComponent,
  decorators: [
    applicationConfig({
      providers: [
        provideHttpClient(),
        { provide: SummaryService, useValue: mockSummaryService },
      ],
    }),
  ],
};

export default meta;

type Story = StoryObj<GlobalSummaryComponent>;

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
