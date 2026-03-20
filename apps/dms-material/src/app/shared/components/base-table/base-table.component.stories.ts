import type { Meta, StoryObj } from '@storybook/angular';

import { BaseTableComponent } from './base-table.component';
import type { ColumnDef } from './column-def.interface';

interface SampleRow {
  id: string;
  symbol: string;
  name: string;
  price: number;
  change: number;
}

const sampleColumns: ColumnDef[] = [
  { field: 'symbol', header: 'Symbol', width: '100px', sortable: true },
  { field: 'name', header: 'Name', width: '200px', sortable: true },
  {
    field: 'price',
    header: 'Price',
    width: '120px',
    sortable: true,
    type: 'currency',
  },
  {
    field: 'change',
    header: 'Change %',
    width: '120px',
    sortable: true,
    type: 'number',
  },
];

const sampleData: SampleRow[] = [
  { id: '1', symbol: 'AAPL', name: 'Apple Inc.', price: 185.5, change: 1.23 },
  {
    id: '2',
    symbol: 'MSFT',
    name: 'Microsoft Corp.',
    price: 420.75,
    change: -0.45,
  },
  {
    id: '3',
    symbol: 'GOOGL',
    name: 'Alphabet Inc.',
    price: 175.2,
    change: 2.1,
  },
  {
    id: '4',
    symbol: 'AMZN',
    name: 'Amazon.com Inc.',
    price: 198.3,
    change: 0.87,
  },
  { id: '5', symbol: 'TSLA', name: 'Tesla Inc.', price: 245.6, change: -1.56 },
];

const meta: Meta<BaseTableComponent<SampleRow>> = {
  title: 'Shared/BaseTableComponent',
  component: BaseTableComponent,
};

export default meta;
type Story = StoryObj<BaseTableComponent<SampleRow>>;

export const Default: Story = {
  args: {
    data: sampleData,
    columns: sampleColumns,
    tableLabel: 'Stock Holdings',
    rowHeight: 48,
    bufferSize: 10,
    selectable: false,
    loading: false,
  },
};

export const WithSelection: Story = {
  args: {
    data: sampleData,
    columns: sampleColumns,
    tableLabel: 'Selectable Table',
    selectable: true,
    multiSelect: true,
    loading: false,
  },
};

export const Loading: Story = {
  args: {
    data: [],
    columns: sampleColumns,
    tableLabel: 'Loading Table',
    loading: true,
  },
};

export const EmptyState: Story = {
  args: {
    data: [],
    columns: sampleColumns,
    tableLabel: 'Empty Table',
    loading: false,
  },
};
