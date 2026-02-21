/**
 * Classifies a capital gain/loss amount as 'gain', 'loss', or 'neutral'.
 * Returns classification type for visual display.
 *
 * Pure function - no side effects.
 */
export function classifyCapitalGain(
  capitalGain: number
): 'gain' | 'loss' | 'neutral' {
  if (capitalGain > 0) {
    return 'gain';
  }
  if (capitalGain < 0) {
    return 'loss';
  }
  return 'neutral';
}
