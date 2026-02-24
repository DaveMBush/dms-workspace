import { FidelityCsvRow } from './fidelity-csv-row.interface';

const EXPECTED_HEADERS = [
  'Date',
  'Action',
  'Symbol',
  'Description',
  'Quantity',
  'Price',
  'Total Amount',
  'Account',
];

/**
 * Strips dollar signs and commas from a numeric string for parsing.
 */
function cleanNumericValue(value: string): string {
  return value.replace(/[$,]/g, '');
}

/**
 * Parses a numeric field value, throwing if the result is not a valid number.
 */
function parseNumericField(value: string, fieldName: string): number {
  const cleaned = cleanNumericValue(value.trim());
  const num = Number(cleaned);
  if (isNaN(num)) {
    throw new Error(
      `Invalid ${fieldName}: expected a number but got "${value.trim()}"`
    );
  }
  return num;
}

/**
 * Splits a CSV line respecting quoted fields (handles commas inside quotes).
 */
function splitCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      fields.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  fields.push(current);

  return fields;
}

/**
 * Parses a Fidelity CSV transaction export string into structured rows.
 *
 * @param csv - Raw CSV content from Fidelity export
 * @returns Array of parsed CSV rows
 * @throws Error if CSV format is invalid
 */
export function parseFidelityCsv(csv: string): FidelityCsvRow[] {
  const trimmed = csv.trim();
  if (trimmed.length === 0) {
    return [];
  }

  const lines = trimmed.split(/\r?\n/).filter(function filterEmpty(line) {
    return line.trim().length > 0;
  });
  if (lines.length === 0) {
    return [];
  }

  const headerFields = splitCsvLine(lines[0]).map(function trimHeader(h) {
    return h.trim();
  });
  validateHeaders(headerFields);

  if (lines.length === 1) {
    return [];
  }

  return lines.slice(1).map(function mapLine(line, index) {
    return parseRow(line, index + 2);
  });
}

/**
 * Validates CSV header row matches expected Fidelity format.
 */
function validateHeaders(headers: string[]): void {
  if (headers.length !== EXPECTED_HEADERS.length) {
    throw new Error(
      `Invalid CSV header: expected ${EXPECTED_HEADERS.length} columns but got ${headers.length}`
    );
  }

  for (let i = 0; i < EXPECTED_HEADERS.length; i++) {
    if (headers[i] !== EXPECTED_HEADERS[i]) {
      throw new Error(
        `Invalid CSV header: expected "${EXPECTED_HEADERS[i]}" at column ${
          i + 1
        } but got "${headers[i]}"`
      );
    }
  }
}

/**
 * Parses a single CSV data row into a FidelityCsvRow.
 */
function parseRow(line: string, lineNumber: number): FidelityCsvRow {
  const fields = splitCsvLine(line);

  if (fields.length !== EXPECTED_HEADERS.length) {
    throw new Error(
      `Row ${lineNumber}: expected ${EXPECTED_HEADERS.length} columns but got ${fields.length}`
    );
  }

  return {
    date: fields[0].trim(),
    action: fields[1].trim(),
    symbol: fields[2].trim(),
    description: fields[3].trim(),
    quantity: parseNumericField(fields[4], `quantity at row ${lineNumber}`),
    price: parseNumericField(fields[5], `price at row ${lineNumber}`),
    totalAmount: parseNumericField(
      fields[6],
      `total amount at row ${lineNumber}`
    ),
    account: fields[7].trim(),
  };
}
