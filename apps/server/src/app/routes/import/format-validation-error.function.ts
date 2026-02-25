import { ValidationError } from './validation-error.interface';

/**
 * Creates a structured validation error object with row number, field, and message.
 */
export function formatValidationError(
  row: number,
  field: string,
  message: string
): ValidationError {
  return { row, field, message };
}
