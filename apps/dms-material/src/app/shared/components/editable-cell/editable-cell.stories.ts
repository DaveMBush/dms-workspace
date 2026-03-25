import type { Meta, StoryObj } from '@storybook/angular';

import { EditableCellComponent } from './editable-cell.component';

const meta: Meta<EditableCellComponent> = {
  component: EditableCellComponent,
  title: 'Components/EditableCell',
  argTypes: {
    valueChange: { action: 'valueChange' },
    format: {
      control: 'select',
      options: ['number', 'decimal', 'currency'],
    },
  },
};

export default meta;

type Story = StoryObj<EditableCellComponent>;

export const Default: Story = {
  args: {
    value: 42,
    format: 'number',
    step: 1,
    decimalFormat: '1.2-2',
    testIdFieldName: '',
    testId: '',
  },
};

export const Currency: Story = {
  args: {
    value: 1234.56,
    format: 'currency',
    decimalFormat: '1.2-2',
  },
};

export const Decimal: Story = {
  args: {
    value: 9.875,
    format: 'decimal',
    decimalFormat: '1.3-3',
  },
};

export const WithMinMax: Story = {
  args: {
    value: 50,
    format: 'number',
    min: 0,
    max: 100,
    step: 5,
  },
};
