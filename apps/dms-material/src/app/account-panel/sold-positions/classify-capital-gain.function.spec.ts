import { describe, expect, it } from 'vitest';

import { classifyCapitalGain } from './classify-capital-gain.function';

describe('classifyCapitalGain', () => {
  describe('positive capital gains', () => {
    it.each([
      [3000, 'standard profit'],
      [5000000, 'very large profit'],
      [0.01, 'fractional profit'],
    ])('should return "gain" for a %s (%i)', (capitalGain) => {
      // Act
      const result = classifyCapitalGain(capitalGain);

      // Assert
      expect(result).toBe('gain');
    });
  });

  describe('negative capital gains (losses)', () => {
    it.each([
      [-3000, 'standard loss'],
      [-5000000, 'very large loss'],
      [-0.01, 'fractional loss'],
    ])('should return "loss" for a %s (%i)', (capitalGain) => {
      // Act
      const result = classifyCapitalGain(capitalGain);

      // Assert
      expect(result).toBe('loss');
    });
  });

  describe('zero capital gains (neutral/breakeven)', () => {
    it('should return "neutral" for a breakeven trade', () => {
      // Arrange: literal zero
      const capitalGain = 0;

      // Act
      const result = classifyCapitalGain(capitalGain);

      // Assert
      expect(result).toBe('neutral');
    });

    it('should return "neutral" for computed zero (floating-point cancellation)', () => {
      // Arrange: (150 - 150) * 100, verifies computed 0 is treated as neutral
      const buyPrice = 150;
      const sellPrice = 150;
      const capitalGain = (sellPrice - buyPrice) * 100;

      // Act
      const result = classifyCapitalGain(capitalGain);

      // Assert
      expect(result).toBe('neutral');
    });
  });
});
