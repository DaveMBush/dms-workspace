import { ValidationError } from './validation-error.interface';

/**
 * Groups validation errors by row number.
 */
export function aggregateErrors(
  errors: ValidationError[]
): Record<number, ValidationError[]> {
  const result: Record<number, ValidationError[]> = {};
  for (const error of errors) {
    if (result[error.row] === undefined) {
      result[error.row] = [];
    }
    result[error.row].push(error);
  }
  return result;
}
