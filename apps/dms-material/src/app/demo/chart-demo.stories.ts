import type { Meta, StoryObj } from '@storybook/angular';

import { ChartDemoComponent } from './chart-demo';

const meta: Meta<ChartDemoComponent> = {
  title: 'Pages/ChartDemo',
  component: ChartDemoComponent,
};

export default meta;

type Story = StoryObj<ChartDemoComponent>;

export const LightMode: Story = {};

export const DarkMode: Story = {
  decorators: [
    function applyDarkTheme(story) {
      const result = story();
      document.body.classList.add('dark-theme');
      return result;
    },
  ],
};
