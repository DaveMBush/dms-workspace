import type { Meta, StoryObj } from '@storybook/angular';

import { DashboardComponent } from './dashboard.component';

const meta: Meta<DashboardComponent> = {
  component: DashboardComponent,
  title: 'Components/Dashboard',
};

export default meta;

type Story = StoryObj<DashboardComponent>;

export const Default: Story = {};
