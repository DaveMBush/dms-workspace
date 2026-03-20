import type { Meta, StoryObj } from '@storybook/angular';

import { SymbolAutocompleteComponent } from './symbol-autocomplete.component';
import type { SymbolOption } from './symbol-option.interface';

const mockSearchFn = async function mockSearch(
  query: string
): Promise<SymbolOption[]> {
  const allOptions: SymbolOption[] = [
    { symbol: 'AAPL', name: 'Apple Inc.' },
    { symbol: 'MSFT', name: 'Microsoft Corporation' },
    { symbol: 'GOOGL', name: 'Alphabet Inc.' },
    { symbol: 'AMZN', name: 'Amazon.com Inc.' },
    { symbol: 'TSLA', name: 'Tesla Inc.' },
  ];
  const results = await Promise.resolve(
    allOptions.filter(function filterByQuery(opt) {
      return (
        opt.symbol.toLowerCase().includes(query.toLowerCase()) ||
        opt.name.toLowerCase().includes(query.toLowerCase())
      );
    })
  );
  return results;
};

const meta: Meta<SymbolAutocompleteComponent> = {
  title: 'Shared/SymbolAutocompleteComponent',
  component: SymbolAutocompleteComponent,
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
