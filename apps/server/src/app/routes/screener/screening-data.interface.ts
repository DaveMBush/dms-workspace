export interface ScreeningData {
  CategoryId: number;
  Ticker: string;
  AvgDailyVolume: number;
  CurrentDistribution: number;
  DistributionFrequency: 'Monthly' | 'Quarterly';
  InceptionDate: string;
  Price: number;
  Strategy: string;
}
