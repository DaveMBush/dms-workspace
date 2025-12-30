/* eslint-disable @smarttools/one-exported-item-per-file -- Related chart utility functions */

interface ChartColorConfig {
  equities: string;
  income: string;
  taxFree: string;
  equitiesHover: string;
  incomeHover: string;
  taxFreeHover: string;
  base: string;
  capitalGains: string;
  dividends: string;
  baseAlpha: string;
  capitalGainsAlpha: string;
  dividendsAlpha: string;
}

const CHART_COLORS: ChartColorConfig = {
  equities: '#42A5F5',
  income: '#66BB6A',
  taxFree: '#FFA726',
  equitiesHover: '#64B5F6',
  incomeHover: '#81C784',
  taxFreeHover: '#FFB74D',
  base: '#42A5F5',
  capitalGains: '#66BB6A',
  dividends: '#FFA726',
  baseAlpha: 'rgba(66,165,245,0.2)',
  capitalGainsAlpha: 'rgba(102,187,106,0.2)',
  dividendsAlpha: 'rgba(255,167,38,0.2)',
};

export function createCompositionChartData(
  equities: number,
  income: number,
  taxFree: number
): {
  labels: string[];
  datasets: Array<{
    data: number[];
    backgroundColor: string[];
    hoverBackgroundColor: string[];
  }>;
} {
  const total = equities + income + taxFree;
  const newEquities = (100 * equities) / total;
  const newIncome = (100 * income) / total;
  const newTaxFree = (100 * taxFree) / total;

  return {
    labels: ['Equities', 'Income', 'Tax Free'],
    datasets: [
      {
        data: [newEquities, newIncome, newTaxFree],
        backgroundColor: [
          CHART_COLORS.equities,
          CHART_COLORS.income,
          CHART_COLORS.taxFree,
        ],
        hoverBackgroundColor: [
          CHART_COLORS.equitiesHover,
          CHART_COLORS.incomeHover,
          CHART_COLORS.taxFreeHover,
        ],
      },
    ],
  };
}

export function createEmptyCompositionData(): {
  labels: string[];
  datasets: Array<{
    data: number[];
    backgroundColor: string[];
    hoverBackgroundColor: string[];
  }>;
} {
  return {
    labels: ['Equities', 'Income', 'Tax Free'],
    datasets: [
      {
        data: [0, 0, 0],
        backgroundColor: [
          CHART_COLORS.equities,
          CHART_COLORS.income,
          CHART_COLORS.taxFree,
        ],
        hoverBackgroundColor: [
          CHART_COLORS.equitiesHover,
          CHART_COLORS.incomeHover,
          CHART_COLORS.taxFreeHover,
        ],
      },
    ],
  };
}

export function createCompositionOptions(): object {
  return {
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: '#6B7280',
          font: { size: 14 },
        },
      },
    },
    animation: {
      duration: 0,
    },
  };
}

interface GraphData {
  month: string;
  deposits: number;
  capitalGains: number;
  dividends: number;
}

function createDataset(
  label: string,
  data: number[],
  borderColor: string,
  backgroundColor: string
): {
  label: string;
  data: number[];
  borderColor: string;
  backgroundColor: string;
  fill: boolean;
  tension: number;
} {
  return {
    label,
    data,
    borderColor,
    backgroundColor,
    fill: false,
    tension: 0.1,
  };
}

function extractChartDataArrays(graphData: GraphData[]): {
  labels: string[];
  baseData: number[];
  capitalGainsData: number[];
  dividendsData: number[];
} {
  const labels = graphData.map(function labelMap(gr) {
    return gr.month;
  });
  const baseData = graphData.map(function baseDataMap(gr) {
    return gr.deposits;
  });
  const capitalGainsData = graphData.map(function capGainsMap(gr) {
    return gr.deposits + gr.capitalGains;
  });
  const dividendsData = graphData.map(function dividendsMap(gr) {
    return gr.deposits + gr.capitalGains + gr.dividends;
  });

  return { labels, baseData, capitalGainsData, dividendsData };
}

export function createLineChartData(graphData: GraphData[]): {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    borderColor: string;
    backgroundColor: string;
    fill: boolean;
    tension?: number;
  }>;
} {
  if (graphData.length === 0) {
    return createEmptyLineChartData();
  }

  const { labels, baseData, capitalGainsData, dividendsData } =
    extractChartDataArrays(graphData);

  return {
    labels,
    datasets: [
      createDataset(
        'Base',
        baseData,
        CHART_COLORS.base,
        CHART_COLORS.baseAlpha
      ),
      createDataset(
        'Capital Gains',
        capitalGainsData,
        CHART_COLORS.capitalGains,
        CHART_COLORS.capitalGainsAlpha
      ),
      createDataset(
        'Dividends',
        dividendsData,
        CHART_COLORS.dividends,
        CHART_COLORS.dividendsAlpha
      ),
    ],
  };
}

export function createEmptyLineChartData(): {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    borderColor: string;
    backgroundColor: string;
    fill: boolean;
    tension?: number;
  }>;
} {
  return {
    labels: [],
    datasets: [
      {
        label: 'Base',
        data: [],
        borderColor: CHART_COLORS.base,
        backgroundColor: CHART_COLORS.baseAlpha,
        fill: false,
        tension: 0.1,
      },
      {
        label: 'Capital Gains',
        data: [],
        borderColor: CHART_COLORS.capitalGains,
        backgroundColor: CHART_COLORS.capitalGainsAlpha,
        fill: false,
        tension: 0.1,
      },
      {
        label: 'Dividends',
        data: [],
        borderColor: CHART_COLORS.dividends,
        backgroundColor: CHART_COLORS.dividendsAlpha,
        fill: false,
        tension: 0.1,
      },
    ],
  };
}

export function createLineChartOptions(): object {
  return {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: '#6B7280',
          font: { size: 14 },
        },
      },
    },
    scales: {
      x: {
        title: { display: true, text: 'Month' },
        ticks: { color: '#6B7280' },
      },
      y: {
        title: { display: true, text: 'Amount ($)' },
        ticks: { color: '#6B7280' },
        min: 40000,
      },
    },
    animation: {
      duration: 0,
    },
  };
}
