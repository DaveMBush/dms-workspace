import type { Meta, StoryObj } from '@storybook/angular';

import { DashboardComponent } from './dashboard.component';

const meta: Meta<DashboardComponent> = {
  title: 'Pages/Dashboard',
  component: DashboardComponent,
};

export default meta;

type Story = StoryObj<DashboardComponent>;

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
