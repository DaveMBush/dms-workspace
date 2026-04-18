import {
  type Meta,
  type StoryObj,
} from '@storybook/angular';

import { BaseTableComponent } from './base-table.component';
import { ColumnDef } from './column-def.interface';

interface SampleRow {
  id: string;
  name: string;
  ticker: string;
  value: number;
}

interface UniverseRow {
  id: string;
  ticker: string;
  name: string;
  price: number;
  marketCap: number;
  sector: string;
  peRatio: number;
}

const sampleColumns: ColumnDef[] = [
  { field: 'name', header: 'Name', sortable: true, type: 'text' },
  { field: 'ticker', header: 'Ticker', sortable: true, type: 'text' },
  { field: 'value', header: 'Value', sortable: true, type: 'currency' },
];

const sampleData: SampleRow[] = [
  { id: '1', name: 'Apple Inc.', ticker: 'AAPL', value: 189.3 },
  { id: '2', name: 'Alphabet Inc.', ticker: 'GOOG', value: 140.52 },
  { id: '3', name: 'Microsoft Corp.', ticker: 'MSFT', value: 415.22 },
  { id: '4', name: 'Amazon.com Inc.', ticker: 'AMZN', value: 179.78 },
  { id: '5', name: 'NVIDIA Corp.', ticker: 'NVDA', value: 880.0 },
  { id: '6', name: 'Meta Platforms Inc.', ticker: 'META', value: 505.75 },
  { id: '7', name: 'Tesla Inc.', ticker: 'TSLA', value: 248.42 },
  { id: '8', name: 'Berkshire Hathaway', ticker: 'BRK.B', value: 412.18 },
];

const universeColumns: ColumnDef[] = [
  { field: 'ticker', header: 'Ticker', sortable: true, type: 'text' },
  { field: 'name', header: 'Name', sortable: true, type: 'text' },
  { field: 'price', header: 'Price', sortable: true, type: 'currency' },
  { field: 'marketCap', header: 'Market Cap', sortable: true, type: 'number' },
  { field: 'sector', header: 'Sector', sortable: false, type: 'text' },
  { field: 'peRatio', header: 'P/E Ratio', sortable: true, type: 'number' },
];

const universeData: UniverseRow[] = [
  {
    id: '1',
    ticker: 'AAPL',
    name: 'Apple Inc.',
    price: 189.3,
    marketCap: 2_940_000_000_000,
    sector: 'Technology',
    peRatio: 31.2,
  },
  {
    id: '2',
    ticker: 'MSFT',
    name: 'Microsoft Corp.',
    price: 415.22,
    marketCap: 3_090_000_000_000,
    sector: 'Technology',
    peRatio: 36.8,
  },
  {
    id: '3',
    ticker: 'GOOGL',
    name: 'Alphabet Inc.',
    price: 140.52,
    marketCap: 1_760_000_000_000,
    sector: 'Communication Services',
    peRatio: 25.4,
  },
  {
    id: '4',
    ticker: 'AMZN',
    name: 'Amazon.com Inc.',
    price: 179.78,
    marketCap: 1_870_000_000_000,
    sector: 'Consumer Discretionary',
    peRatio: 60.1,
  },
  {
    id: '5',
    ticker: 'NVDA',
    name: 'NVIDIA Corp.',
    price: 880.0,
    marketCap: 2_170_000_000_000,
    sector: 'Technology',
    peRatio: 72.5,
  },
  {
    id: '6',
    ticker: 'JPM',
    name: 'JPMorgan Chase',
    price: 198.45,
    marketCap: 572_000_000_000,
    sector: 'Financials',
    peRatio: 11.8,
  },
  {
    id: '7',
    ticker: 'JNJ',
    name: 'Johnson & Johnson',
    price: 156.32,
    marketCap: 376_000_000_000,
    sector: 'Healthcare',
    peRatio: 22.1,
  },
  {
    id: '8',
    ticker: 'XOM',
    name: 'Exxon Mobil Corp.',
    price: 104.67,
    marketCap: 441_000_000_000,
    sector: 'Energy',
    peRatio: 13.4,
  },
  {
    id: '9',
    ticker: 'PG',
    name: 'Procter & Gamble',
    price: 162.89,
    marketCap: 383_000_000_000,
    sector: 'Consumer Staples',
    peRatio: 26.7,
  },
  {
    id: '10',
    ticker: 'V',
    name: 'Visa Inc.',
    price: 281.34,
    marketCap: 577_000_000_000,
    sector: 'Financials',
    peRatio: 31.9,
  },
];

const TABLE_TEMPLATE = `
  <div style="height: 500px; width: 100%; display: block;">
    <dms-base-table
      [data]="data"
      [columns]="columns"
      [tableLabel]="tableLabel"
      [rowHeight]="rowHeight"
      [loading]="loading"
      [selectable]="selectable"
      [multiSelect]="multiSelect"
      [sortColumns]="sortColumns"
      (sortChange)="sortChange($event)"
      (rowClick)="rowClick($event)"
      (selectionChange)="selectionChange($event)"
      (renderedRangeChange)="renderedRangeChange($event)"
    ></dms-base-table>
  </div>
`;

const meta: Meta<BaseTableComponent<SampleRow>> = {
  component: BaseTableComponent,
  title: 'Shared/BaseTable',
  render: function renderBaseTable(args) { return {
    props: args,
    template: TABLE_TEMPLATE,
  }; },
  argTypes: {
    sortChange: { action: 'sortChange' },
    rowClick: { action: 'rowClick' },
    selectionChange: { action: 'selectionChange' },
    renderedRangeChange: { action: 'renderedRangeChange' },
  },
};

export default meta;

type Story = StoryObj<BaseTableComponent<SampleRow>>;
type UniverseStory = StoryObj<BaseTableComponent<UniverseRow>>;

export const Default: Story = {
  args: {
    data: sampleData,
    columns: sampleColumns,
    tableLabel: 'Sample positions table',
    rowHeight: 52,
    loading: false,
    selectable: true,
    multiSelect: false,
    sortColumns: [{ column: 'name', direction: 'asc' }],
  },
};

export const EmptyState: Story = {
  args: {
    data: [],
    columns: sampleColumns,
    tableLabel: 'Empty table',
    loading: false,
    selectable: false,
  },
};

export const UniverseTableVariation: UniverseStory = {
  args: {
    data: universeData,
    columns: universeColumns,
    tableLabel: 'Universe screener table',
    rowHeight: 52,
    loading: false,
    selectable: true,
    multiSelect: true,
    sortColumns: [{ column: 'ticker', direction: 'asc' }],
  },
};
