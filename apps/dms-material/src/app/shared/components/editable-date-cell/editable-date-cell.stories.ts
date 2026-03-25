import type { Meta, StoryObj } from '@storybook/angular';

import { EditableDateCellComponent } from './editable-date-cell.component';

const meta: Meta<EditableDateCellComponent> = {
  component: EditableDateCellComponent,
  title: 'Components/EditableDateCell',
  argTypes: {
    valueChange: { action: 'valueChange' },
  },
};

export default meta;

type Story = StoryObj<EditableDateCellComponent>;

export const Default: Story = {
  args: {
    value: new Date(2025, 0, 15),
    dateFormat: 'MM/dd/yyyy',
    testIdFieldName: '',
    testId: '',
  },
};

export const Empty: Story = {
  args: {
    value: null,
    dateFormat: 'MM/dd/yyyy',
  },
};

export const FutureDate: Story = {
  args: {
    value: new Date(2025, 5, 30),
    dateFormat: 'MM/dd/yyyy',
  },
};
