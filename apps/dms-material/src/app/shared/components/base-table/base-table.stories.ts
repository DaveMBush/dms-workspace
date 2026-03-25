import type { Meta, StoryObj } from '@storybook/angular';

import { BaseTableComponent } from './base-table.component';
import { ColumnDef } from './column-def.interface';

interface SampleRow {
  id: string;
  name: string;
  ticker: string;
  value: number;
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
];

const meta: Meta<BaseTableComponent<SampleRow>> = {
  component: BaseTableComponent,
  title: 'Components/BaseTable',
  argTypes: {
    sortChange: { action: 'sortChange' },
    rowClick: { action: 'rowClick' },
    selectionChange: { action: 'selectionChange' },
    renderedRangeChange: { action: 'renderedRangeChange' },
  },
};

export default meta;

type Story = StoryObj<BaseTableComponent<SampleRow>>;

export const Default: Story = {
  args: {
    data: sampleData,
    columns: sampleColumns,
    tableLabel: 'Sample positions table',
    rowHeight: 52,
    loading: false,
    selectable: false,
    multiSelect: false,
  },
};

export const Empty: Story = {
  args: {
    data: [],
    columns: sampleColumns,
    tableLabel: 'Empty table',
    loading: false,
    selectable: false,
  },
};

export const Loading: Story = {
  args: {
    data: [],
    columns: sampleColumns,
    tableLabel: 'Loading table',
    loading: true,
    selectable: false,
  },
};

export const Selectable: Story = {
  args: {
    data: sampleData,
    columns: sampleColumns,
    tableLabel: 'Selectable positions table',
    loading: false,
    selectable: true,
    multiSelect: true,
  },
};
