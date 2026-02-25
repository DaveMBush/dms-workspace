/** Earliest acceptable transaction date */
const MIN_YEAR = 1950;

interface DateValidationFailure {
  valid: false;
  error: string;
}

interface DateValidationSuccess {
  valid: true;
}

type DateValidationResult = DateValidationFailure | DateValidationSuccess;

/**
 * Parses a MM/DD/YYYY date string and returns the parsed components,
 * or a failure result if the format is invalid.
 */
function parseDateComponents(
  dateStr: string
): DateValidationFailure | { month: number; day: number; year: number } {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(dateStr);
  if (match === null) {
    return {
      valid: false,
      error: `Invalid date format: "${dateStr}" (expected MM/DD/YYYY)`,
    };
  }

  const month = parseInt(match[1], 10);
  const day = parseInt(match[2], 10);
  const year = parseInt(match[3], 10);

  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return {
      valid: false,
      error: `Invalid date: "${dateStr}" has an out-of-range month or day`,
    };
  }

  return { month, day, year };
}

interface DateComponents {
  month: number;
  day: number;
  year: number;
}

/**
 * Validates that a Date object represents a real calendar date
 * and falls within acceptable range.
 */
function validateDateRange(
  date: Date,
  components: DateComponents,
  dateStr: string
): DateValidationResult {
  if (
    date.getFullYear() !== components.year ||
    date.getMonth() !== components.month - 1 ||
    date.getDate() !== components.day
  ) {
    return {
      valid: false,
      error: `Invalid date: "${dateStr}" is not a real calendar date`,
    };
  }

  if (date > new Date()) {
    return {
      valid: false,
      error: `Date cannot be in the future: "${dateStr}"`,
    };
  }

  if (components.year < MIN_YEAR) {
    return {
      valid: false,
      error: `Date is too old: "${dateStr}" (must be after ${MIN_YEAR})`,
    };
  }

  return { valid: true };
}

/**
 * Validates a date string in MM/DD/YYYY format.
 * Rejects future dates and dates older than 1950.
 */
export function validateDate(dateStr: string): DateValidationResult {
  if (dateStr.trim().length === 0) {
    return { valid: false, error: 'Date is required' };
  }

  const parsed = parseDateComponents(dateStr);
  if ('valid' in parsed) {
    return parsed;
  }

  const date = new Date(parsed.year, parsed.month - 1, parsed.day);

  return validateDateRange(date, parsed, dateStr);
}
