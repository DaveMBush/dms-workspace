import type { Meta, StoryObj } from '@storybook/angular';

import { EditableCellComponent } from './editable-cell.component';

const meta: Meta<EditableCellComponent> = {
  title: 'Shared/EditableCellComponent',
  component: EditableCellComponent,
};

export default meta;
type Story = StoryObj<EditableCellComponent>;

export const Default: Story = {
  args: {
    value: 42.5,
    format: 'number',
    step: 1,
    decimalFormat: '1.2-2',
  },
};

export const CurrencyFormat: Story = {
  args: {
    value: 1250.75,
    format: 'currency',
    step: 0.01,
    decimalFormat: '1.2-2',
  },
};

export const DecimalFormat: Story = {
  args: {
    value: 3.14159,
    format: 'decimal',
    step: 0.001,
    decimalFormat: '1.4-4',
  },
};

export const WithMinMax: Story = {
  args: {
    value: 50,
    min: 0,
    max: 100,
    step: 5,
    format: 'number',
  },
};

export const ZeroValue: Story = {
  args: {
    value: 0,
    format: 'number',
  },
};
