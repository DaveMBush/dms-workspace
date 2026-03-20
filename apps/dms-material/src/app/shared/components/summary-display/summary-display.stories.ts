import type { Meta, StoryObj } from '@storybook/angular';
import type { ChartData } from 'chart.js';

import { SummaryDisplayComponent } from './summary-display';

const samplePieData: ChartData = {
  labels: ['Equities', 'Bonds', 'Cash', 'Real Estate'],
  datasets: [
    {
      data: [45, 25, 15, 15],
      backgroundColor: ['#4CAF50', '#2196F3', '#FFC107', '#FF5722'],
    },
  ],
};

const sampleBarData: ChartData = {
  labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
  datasets: [
    {
      label: 'Returns',
      data: [2.5, -1.2, 3.8, 1.5, -0.5, 4.2],
      backgroundColor: '#4CAF50',
    },
  ],
};

const meta: Meta<SummaryDisplayComponent> = {
  title: 'Shared/SummaryDisplayComponent',
  component: SummaryDisplayComponent,
};

export default meta;
type Story = StoryObj<SummaryDisplayComponent>;

export const PieChart: Story = {
  args: {
    chartType$: 'pie',
    data$: samplePieData,
    title$: 'Portfolio Allocation',
    height$: '300px',
    showLegend$: true,
    legendPosition$: 'bottom',
  },
};

export const BarChart: Story = {
  args: {
    chartType$: 'bar',
    data$: sampleBarData,
    title$: 'Monthly Returns',
    height$: '300px',
    showLegend$: true,
    legendPosition$: 'bottom',
  },
};

export const NoLegend: Story = {
  args: {
    chartType$: 'pie',
    data$: samplePieData,
    title$: 'Compact Chart',
    height$: '200px',
    showLegend$: false,
  },
};

export const EmptyData: Story = {
  args: {
    chartType$: 'pie',
    data$: { labels: [], datasets: [{ data: [] }] },
    title$: 'No Data Available',
    height$: '300px',
  },
};
