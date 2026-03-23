const positionFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatPosition(value: number): string {
  return positionFormatter.format(value);
}
