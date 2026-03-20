import type { Meta, StoryObj } from '@storybook/angular';

import { SplitterComponent } from './splitter.component';

const meta: Meta<SplitterComponent> = {
  title: 'Shared/SplitterComponent',
  component: SplitterComponent,
};

export default meta;
type Story = StoryObj<SplitterComponent>;

export const Default: Story = {
  args: {
    stateKey: 'demo-splitter',
    initialLeftWidth: 20,
  },
};

export const WideLeft: Story = {
  args: {
    stateKey: 'demo-splitter-wide',
    initialLeftWidth: 50,
  },
};

export const NarrowLeft: Story = {
  args: {
    stateKey: 'demo-splitter-narrow',
    initialLeftWidth: 10,
  },
};
