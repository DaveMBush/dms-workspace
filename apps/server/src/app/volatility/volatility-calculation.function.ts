import { VolatilityCategory } from './volatility-category.type';

const FLAT_CV_THRESHOLD = 0.02; // 2% coefficient of variation = effectively flat
const HALF_WINDOW_THRESHOLD = 0.15; // 15% edge-to-midpoint move required for reversal patterns
const RETURN_TO_START_THRESHOLD = 0.1; // 10% tolerance for finishing near the starting level
const DIRECTIONAL_STEP_THRESHOLD = 0.75; // most steps in each half should move in the same direction
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

function buildHalfWindows(amounts: number[]): {
  firstHalf: number[];
  secondHalf: number[];
} {
  const midpoint = Math.floor(amounts.length / 2);
  return {
    firstHalf: amounts.slice(0, midpoint),
    secondHalf: amounts.slice(midpoint),
  };
}

function calculateRelativeDifference(left: number, right: number): number {
  return (
    Math.abs(left - right) /
    Math.max(Math.abs(left), Math.abs(right), Number.EPSILON)
  );
}

function calculateEdgeMean(amounts: number[]): number {
  return calculateMean([amounts[0], amounts[amounts.length - 1]]);
}

function calculateMiddleMean(amounts: number[]): number {
  const middleStart = Math.max(0, Math.floor(amounts.length / 2) - 1);
  return calculateMean(amounts.slice(middleStart, middleStart + 2));
}

function calculateDirectionalStepRatio(
  values: number[],
  direction: 'down' | 'up'
): number {
  let matchingSteps = 0;
  for (let index = 1; index < values.length; index++) {
    if (direction === 'up' && values[index] >= values[index - 1]) {
      matchingSteps += 1;
    }
    if (direction === 'down' && values[index] <= values[index - 1]) {
      matchingSteps += 1;
    }
  }
  return matchingSteps / (values.length - 1);
}

function returnsNearStartingLevel(amounts: number[]): boolean {
  return (
    calculateRelativeDifference(amounts[0], amounts[amounts.length - 1]) <=
    RETURN_TO_START_THRESHOLD
  );
}

function hasDirectionalHalfWindows(
  amounts: number[],
  firstDirection: 'down' | 'up',
  secondDirection: 'down' | 'up'
): boolean {
  const { firstHalf, secondHalf } = buildHalfWindows(amounts);
  return (
    calculateDirectionalStepRatio(firstHalf, firstDirection) >=
      DIRECTIONAL_STEP_THRESHOLD &&
    calculateDirectionalStepRatio(secondHalf, secondDirection) >=
      DIRECTIONAL_STEP_THRESHOLD
  );
}

function isUpThenDown(amounts: number[], mean: number): boolean {
  const edgeMean = calculateEdgeMean(amounts);
  const middleMean = calculateMiddleMean(amounts);
  return (
    middleMean > edgeMean &&
    (middleMean - edgeMean) / mean >= HALF_WINDOW_THRESHOLD &&
    returnsNearStartingLevel(amounts) &&
    hasDirectionalHalfWindows(amounts, 'up', 'down')
  );
}

function isDownThenUp(amounts: number[], mean: number): boolean {
  const edgeMean = calculateEdgeMean(amounts);
  const middleMean = calculateMiddleMean(amounts);
  return (
    edgeMean > middleMean &&
    (edgeMean - middleMean) / mean >= HALF_WINDOW_THRESHOLD &&
    returnsNearStartingLevel(amounts) &&
    hasDirectionalHalfWindows(amounts, 'down', 'up')
  );
}

export function calculateVolatility(amounts: number[]): VolatilityCategory {
  if (amounts.length < MIN_DATA_POINTS) {
    return 'insufficient-history';
  }
  const mean = calculateMean(amounts);
  if (mean === 0) {
    return 'insufficient-history';
  }
  const stdDev = calculateStdDev(amounts, mean);
  const cv = stdDev / mean;
  if (cv < FLAT_CV_THRESHOLD) {
    return 'flat';
  }
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
  if (isUpThenDown(amounts, mean)) {
    return 'up-then-down';
  }
  if (isDownThenUp(amounts, mean)) {
    return 'down-then-up';
  }
  return 'volatile';
}
