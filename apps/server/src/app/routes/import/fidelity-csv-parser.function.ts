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
  const trimmed = value.trim();
  const cleaned = cleanNumericValue(trimmed);
  if (cleaned.length === 0) {
    throw new Error(
      `Invalid ${fieldName}: expected a number but got empty value`
    );
  }
  const num = Number(cleaned);
  if (Number.isNaN(num)) {
    throw new Error(
      `Invalid ${fieldName}: expected a number but got "${trimmed}"`
    );
  }
  return num;
}

/**
 * Parses a quoted CSV field starting after the opening quote.
 * Returns the field value and the position after the closing quote and delimiter.
 */
function parseQuotedField(
  line: string,
  start: number
): { value: string; nextPos: number } {
  let value = '';
  let skipNext = false;
  for (let i = start; i < line.length; i++) {
    if (skipNext) {
      skipNext = false;
      continue;
    }
    if (line[i] === '"' && line[i + 1] === '"') {
      value += '"';
      skipNext = true;
      continue;
    }
    if (line[i] === '"') {
      return { value, nextPos: i + 2 };
    }
    value += line[i];
  }
  return { value, nextPos: line.length + 1 };
}

/**
 * Parses an unquoted CSV field starting at the given position.
 * Returns the field value and the position after the delimiter.
 */
function parseUnquotedField(
  line: string,
  start: number
): { value: string; nextPos: number } {
  const commaIdx = line.indexOf(',', start);
  if (commaIdx === -1) {
    return { value: line.slice(start), nextPos: line.length + 1 };
  }
  return { value: line.slice(start, commaIdx), nextPos: commaIdx + 1 };
}

/**
 * Splits a CSV line respecting quoted fields (handles commas and escaped quotes).
 */
function splitCsvLine(line: string): string[] {
  const fields: string[] = [];
  let pos = 0;
  while (pos <= line.length) {
    if (line[pos] === '"') {
      const result = parseQuotedField(line, pos + 1);
      fields.push(result.value);
      pos = result.nextPos;
    } else {
      const result = parseUnquotedField(line, pos);
      fields.push(result.value);
      pos = result.nextPos;
    }
  }
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
