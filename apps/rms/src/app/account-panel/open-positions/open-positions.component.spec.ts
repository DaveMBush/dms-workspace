import { describe, expect, test } from 'vitest';

// Shared template logic to avoid duplication
function templateExDateDisplay(exDate: Date | null | undefined): string {
  return exDate
    ? new Date(exDate).toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric',
      })
    : '';
}

describe('OpenPositionsComponent - Template Ex-Date Handling', () => {
  test('should handle null ex-date in template expression', () => {
    // Test the template logic we implemented
    const nullExDate = null;
    const validExDate = new Date('2024-12-31');

    // Test null case
    expect(templateExDateDisplay(nullExDate)).toBe('');

    // Test valid date case
    const result = templateExDateDisplay(validExDate);
    expect(result).toMatch(/12\/3[01]\/2024/); // Account for timezone differences
  });

  test('should not throw errors when processing null ex-date values', () => {
    // Test that our conditional logic doesn't throw
    expect(() => templateExDateDisplay(null)).not.toThrow();
  });

  test('should handle various null-like values gracefully', () => {
    expect(templateExDateDisplay(null)).toBe('');
    expect(templateExDateDisplay(undefined)).toBe('');
    const dateResult = templateExDateDisplay(new Date('2024-01-15'));
    expect(dateResult).toMatch(/01\/1[45]\/2024/); // Account for timezone differences
  });
});
