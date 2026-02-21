import { describe, expect, it } from 'vitest';

import { classifyCapitalGain } from './classify-capital-gain.function';

// TDD RED Phase - Story AP.3
// Tests are disabled (.skip) because classifyCapitalGain is a stub (Story AP.4 will implement)
// After AP.3 merge: remove .skip when implementing in Story AP.4

describe.skip('classifyCapitalGain', () => {
  describe('positive capital gains', () => {
    it('should return "gain" for a standard profit', () => {
      // Arrange: (180 - 150) * 100 = 3000
      const capitalGain = 3000;

      // Act
      const result = classifyCapitalGain(capitalGain);

      // Assert
      expect(result).toBe('gain');
    });

    it('should return "gain" for a very large profit', () => {
      // Arrange: (1500000 - 1000000) * 10
      const capitalGain = 5000000;

      // Act
      const result = classifyCapitalGain(capitalGain);

      // Assert
      expect(result).toBe('gain');
    });

    it('should return "gain" for a fractional profit', () => {
      // Arrange: fractional amount, still positive
      const capitalGain = 0.01;

      // Act
      const result = classifyCapitalGain(capitalGain);

      // Assert
      expect(result).toBe('gain');
    });
  });

  describe('negative capital gains (losses)', () => {
    it('should return "loss" for a standard loss', () => {
      // Arrange: (150 - 180) * 100 = -3000
      const capitalGain = -3000;

      // Act
      const result = classifyCapitalGain(capitalGain);

      // Assert
      expect(result).toBe('loss');
    });

    it('should return "loss" for a very large loss', () => {
      // Arrange: large loss amount
      const capitalGain = -5000000;

      // Act
      const result = classifyCapitalGain(capitalGain);

      // Assert
      expect(result).toBe('loss');
    });

    it('should return "loss" for a fractional loss', () => {
      // Arrange: small negative amount
      const capitalGain = -0.01;

      // Act
      const result = classifyCapitalGain(capitalGain);

      // Assert
      expect(result).toBe('loss');
    });
  });

  describe('zero capital gains (neutral/breakeven)', () => {
    it('should return "neutral" for a breakeven trade', () => {
      // Arrange: (150 - 150) * 100 = 0
      const capitalGain = 0;

      // Act
      const result = classifyCapitalGain(capitalGain);

      // Assert
      expect(result).toBe('neutral');
    });

    it('should return "neutral" for exact zero', () => {
      // Arrange
      const capitalGain = 0.0;

      // Act
      const result = classifyCapitalGain(capitalGain);

      // Assert
      expect(result).toBe('neutral');
    });
  });
});
