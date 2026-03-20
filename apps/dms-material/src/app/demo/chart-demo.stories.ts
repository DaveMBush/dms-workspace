import type { Meta, StoryObj } from '@storybook/angular';

import { ChartDemoComponent } from './chart-demo';

const meta: Meta<ChartDemoComponent> = {
  title: 'Pages/ChartDemo',
  component: ChartDemoComponent,
};

export default meta;

type Story = StoryObj<ChartDemoComponent>;

export const LightMode: Story = {
  decorators: [
    function removeDarkTheme(story) {
      const result = story();
      document.body.classList.remove('dark-theme');
      return result;
    },
  ],
};

export const DarkMode: Story = {
  decorators: [
    function applyDarkTheme(story) {
      const result = story();
      document.body.classList.add('dark-theme');
      return result;
    },
  ],
};
