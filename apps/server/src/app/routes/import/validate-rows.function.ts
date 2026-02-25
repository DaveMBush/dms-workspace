import { FidelityCsvRow } from './fidelity-csv-row.interface';
import { validateRow } from './validate-row.function';
import { ValidationError } from './validation-error.interface';

interface ValidateRowsResult {
  validRows: FidelityCsvRow[];
  errors: ValidationError[];
}

/**
 * Validates multiple transaction rows.
 * Separates valid rows from rows with errors.
 */
export function validateRows(rows: FidelityCsvRow[]): ValidateRowsResult {
  const validRows: FidelityCsvRow[] = [];
  const allErrors: ValidationError[] = [];

  for (let i = 0; i < rows.length; i++) {
    const rowErrors = validateRow(rows[i], i + 1);
    if (rowErrors.length === 0) {
      validRows.push(rows[i]);
    } else {
      allErrors.push(...rowErrors);
    }
  }

  return { validRows, errors: allErrors };
}
