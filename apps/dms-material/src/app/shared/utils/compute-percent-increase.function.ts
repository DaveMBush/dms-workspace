export function computePercentIncrease(
  basis: number,
  gains: number,
  divs: number
): number {
  if (basis === 0) {
    return 0;
  }
  return (12 * (gains + divs)) / basis;
}
