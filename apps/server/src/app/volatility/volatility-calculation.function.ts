import { VolatilityCategory } from './volatility-category.type';

const STEADY_CV_THRESHOLD = 0.1; // 10% coefficient of variation
const TREND_SLOPE_THRESHOLD = 0.001; // minimum normalized slope to classify as trending
const MIN_DATA_POINTS = 12;

function calculateMean(values: number[]): number {
  return (
    values.reduce(function sum(acc, v) {
      return acc + v;
    }, 0) / values.length
  );
}

function calculateStdDev(values: number[], mean: number): number {
  const variance =
    values.reduce(function sumSqDiff(acc, v) {
      return acc + Math.pow(v - mean, 2);
    }, 0) / values.length;
  return Math.sqrt(variance);
}

function calculateLinearRegressionSlope(values: number[]): number {
  const n = values.length;
  const xMean = (n - 1) / 2;
  const yMean = calculateMean(values);
  let numerator = 0;
  let denominator = 0;
  values.forEach(function accumulateSlope(y, x) {
    numerator += (x - xMean) * (y - yMean);
    denominator += Math.pow(x - xMean, 2);
  });
  return numerator / denominator;
}

export function calculateVolatility(amounts: number[]): VolatilityCategory {
  if (amounts.length < MIN_DATA_POINTS) {
    return null;
  }
  const mean = calculateMean(amounts);
  if (mean === 0) {
    return null;
  }
  const stdDev = calculateStdDev(amounts, mean);
  const cv = stdDev / mean;
  if (cv < STEADY_CV_THRESHOLD) {
    return 'steady';
  }
  const slope = calculateLinearRegressionSlope(amounts);
  const normalizedSlope = slope / mean;
  if (normalizedSlope > TREND_SLOPE_THRESHOLD) {
    return 'increasing';
  }
  if (normalizedSlope < -TREND_SLOPE_THRESHOLD) {
    return 'decreasing';
  }
  return 'volatile';
}
