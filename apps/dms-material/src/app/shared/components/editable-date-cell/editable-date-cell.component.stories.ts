import { provideNativeDateAdapter } from '@angular/material/core';
import {
  applicationConfig,
  type Meta,
  type StoryObj,
} from '@storybook/angular';

import { EditableDateCellComponent } from './editable-date-cell.component';

const meta: Meta<EditableDateCellComponent> = {
  title: 'Shared/EditableDateCellComponent',
  component: EditableDateCellComponent,
  decorators: [
    applicationConfig({
      providers: [provideNativeDateAdapter()],
    }),
  ],
};

export default meta;
type Story = StoryObj<EditableDateCellComponent>;

export const Default: Story = {
  args: {
    value: new Date('2026-01-15'),
  },
};

export const EmptyValue: Story = {
  args: {
    value: null,
  },
};
