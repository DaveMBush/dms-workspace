import type { Meta, StoryObj } from '@storybook/angular';

import { SymbolAutocompleteComponent } from './symbol-autocomplete.component';
import { SymbolOption } from './symbol-option.interface';

const mockSymbols: SymbolOption[] = [
  { id: '1', symbol: 'AAPL', name: 'Apple Inc.' },
  { id: '2', symbol: 'AMZN', name: 'Amazon.com Inc.' },
  { id: '3', symbol: 'GOOG', name: 'Alphabet Inc.' },
  { id: '4', symbol: 'MSFT', name: 'Microsoft Corp.' },
  { id: '5', symbol: 'NVDA', name: 'NVIDIA Corp.' },
  { id: '6', symbol: 'TSLA', name: 'Tesla Inc.' },
];

function symbolMatches(lower: string, s: SymbolOption): boolean {
  return s.symbol.toLowerCase().includes(lower) || s.name.toLowerCase().includes(lower);
}

async function mockSearchFn(query: string): Promise<SymbolOption[]> {
  const lower = query.toLowerCase();
  return mockSymbols.filter(symbolMatches.bind(null, lower));
}

const meta: Meta<SymbolAutocompleteComponent> = {
  component: SymbolAutocompleteComponent,
  title: 'Components/SymbolAutocomplete',
  argTypes: {
    symbolSelected: { action: 'symbolSelected' },
    symbolBlurred: { action: 'symbolBlurred' },
    searchFn: { table: { disable: true } },
  },
};

export default meta;

type Story = StoryObj<SymbolAutocompleteComponent>;

export const Default: Story = {
  args: {
    searchFn: mockSearchFn,
    label: 'Symbol',
    placeholder: 'Search for a symbol...',
    minLength: 2,
    forceSelection: true,
  },
};

export const CustomLabel: Story = {
  args: {
    searchFn: mockSearchFn,
    label: 'Select Ticker',
    placeholder: 'Type 2+ characters...',
    minLength: 2,
    forceSelection: false,
  },
};
