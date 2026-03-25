import type { Meta, StoryObj } from '@storybook/angular';

import { SplitterComponent } from './splitter.component';

const meta: Meta<SplitterComponent> = {
  component: SplitterComponent,
  title: 'Components/Splitter',
  argTypes: {
    widthChange: { action: 'widthChange' },
  },
  decorators: [
    (storyFn) => {
      const story = storyFn();
      return {
        ...story,
        template: `<div style="width:600px; height:300px; border:1px solid #ccc;">
          <dms-splitter [stateKey]="stateKey" [initialLeftWidth]="initialLeftWidth">
          </dms-splitter>
        </div>`,
        props: story.props,
      };
    },
  ],
};

export default meta;

type Story = StoryObj<SplitterComponent>;

export const Default: Story = {
  args: {
    stateKey: 'storybook-splitter',
    initialLeftWidth: 30,
  },
};

export const EvenSplit: Story = {
  args: {
    stateKey: 'storybook-splitter-even',
    initialLeftWidth: 50,
  },
};

export const NarrowLeft: Story = {
  args: {
    stateKey: 'storybook-splitter-narrow',
    initialLeftWidth: 20,
  },
};
