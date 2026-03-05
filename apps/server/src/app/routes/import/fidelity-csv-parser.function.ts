import { FidelityCsvRow } from './fidelity-csv-row.interface';

/**
 * Canonical field names used internally by the parser.
 */
type FieldName =
  | 'account'
  | 'action'
  | 'amount'
  | 'date'
  | 'description'
  | 'price'
  | 'quantity'
  | 'symbol';

/**
 * Header-to-field mapping for the Fidelity web export format.
 * Headers: Run Date, Account, Action, Symbol, Description, Price ($), Quantity, Amount ($)
 */
const WEB_HEADER_MAP = new Map<string, FieldName>([
  ['Run Date', 'date'],
  ['Account', 'account'],
  ['Action', 'action'],
  ['Symbol', 'symbol'],
  ['Description', 'description'],
  ['Price ($)', 'price'],
  ['Quantity', 'quantity'],
  ['Amount ($)', 'amount'],
]);

/**
 * Header-to-field mapping for the Fidelity Desktop export format.
 * Headers: Date, Description, Symbol, Quantity, Price, Amount, Cash Balance,
 *          Security Description, Commission, Fees, Account
 *
 * Note: Desktop "Description" contains the action (e.g., "DIVIDEND RECEIVED")
 *       and "Security Description" is the human-readable name.
 */
const DESKTOP_HEADER_MAP = new Map<string, FieldName>([
  ['Date', 'date'],
  ['Account', 'account'],
  ['Description', 'action'],
  ['Symbol', 'symbol'],
  ['Security Description', 'description'],
  ['Price', 'price'],
  ['Quantity', 'quantity'],
  ['Amount', 'amount'],
]);

/**
 * Month abbreviation to 2-digit number for desktop date conversion.
 */
const MONTH_NUMBERS = new Map<string, string>([
  ['Jan', '01'],
  ['Feb', '02'],
  ['Mar', '03'],
  ['Apr', '04'],
  ['May', '05'],
  ['Jun', '06'],
  ['Jul', '07'],
  ['Aug', '08'],
  ['Sep', '09'],
  ['Oct', '10'],
  ['Nov', '11'],
  ['Dec', '12'],
]);

/**
 * Maps a canonical field name to its column index in the CSV.
 */
type ColumnIndexMap = Map<FieldName, number>;

/**
 * Result of format detection: the column map and whether it's desktop format.
 */
interface FormatDetectionResult {
  columnMap: ColumnIndexMap;
  isDesktop: boolean;
}

/**
 * Strips dollar signs and commas from a numeric string for parsing.
 */
function cleanNumericValue(value: string): string {
  return value.replace(/[$,]/g, '');
}

/**
 * Parses a numeric field value, throwing if the result is not a valid number.
 * Returns 0 for empty values and "--" placeholders (Fidelity Desktop uses "--" for N/A).
 */
function parseNumericField(value: string, fieldName: string): number {
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed === '--') {
    return 0;
  }
  const cleaned = cleanNumericValue(trimmed);
  if (cleaned.length === 0) {
    return 0;
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
 * Converts a desktop-format date (e.g., "Dec-31-2025") to MM/DD/YYYY.
 * Returns the original string if it doesn't match the desktop pattern.
 */
function convertDesktopDate(dateStr: string): string {
  const match = /^(\w{3})-(\d{1,2})-(\d{4})$/.exec(dateStr.trim());
  if (!match) {
    return dateStr;
  }
  const monthNum = MONTH_NUMBERS.get(match[1]);
  if (monthNum === undefined) {
    return dateStr;
  }
  return `${monthNum}/${match[2].padStart(2, '0')}/${match[3]}`;
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
 * Auto-detects between web and desktop export formats.
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
  const { columnMap, isDesktop } = detectFormat(headerFields);

  if (lines.length === 1) {
    return [];
  }

  return lines.slice(1).map(function mapLine(line, index) {
    return parseRow(line, index + 2, columnMap, isDesktop);
  });
}

/**
 * Detects the CSV format (web vs desktop) and builds a column index map.
 * Tries web format first; falls back to desktop format.
 * Throws if neither format's required headers are present.
 */
function detectFormat(headers: string[]): FormatDetectionResult {
  const headerIndex = new Map<string, number>();
  for (let i = 0; i < headers.length; i++) {
    headerIndex.set(headers[i], i);
  }

  // Try web format first (has "Run Date" as distinguishing header)
  const webResult = tryBuildColumnMap(headerIndex, WEB_HEADER_MAP);
  if (webResult) {
    return { columnMap: webResult, isDesktop: false };
  }

  // Try desktop format (has "Date" + "Security Description" as distinguishing headers)
  const desktopResult = tryBuildColumnMap(headerIndex, DESKTOP_HEADER_MAP);
  if (desktopResult) {
    return { columnMap: desktopResult, isDesktop: true };
  }

  // Neither format matched — report what's missing from both
  const webMissing = getMissingHeaders(headerIndex, WEB_HEADER_MAP);
  const desktopMissing = getMissingHeaders(headerIndex, DESKTOP_HEADER_MAP);
  throw new Error(
    `Invalid CSV header: does not match web format (missing: ${webMissing.join(
      ', '
    )}) ` + `or desktop format (missing: ${desktopMissing.join(', ')})`
  );
}

/**
 * Attempts to build a column map from a header-to-field mapping.
 * Returns null if any required header is missing.
 */
function tryBuildColumnMap(
  headerIndex: Map<string, number>,
  headerMap: Map<string, FieldName>
): ColumnIndexMap | null {
  const columnMap: ColumnIndexMap = new Map();
  for (const [headerName, fieldName] of headerMap) {
    const idx = headerIndex.get(headerName);
    if (idx === undefined) {
      return null;
    }
    columnMap.set(fieldName, idx);
  }
  return columnMap;
}

/**
 * Returns the list of header names from a mapping that are not present in the CSV.
 */
function getMissingHeaders(
  headerIndex: Map<string, number>,
  headerMap: Map<string, FieldName>
): string[] {
  const missing: string[] = [];
  for (const headerName of headerMap.keys()) {
    if (!headerIndex.has(headerName)) {
      missing.push(headerName);
    }
  }
  return missing;
}

/**
 * Looks up a field value by canonical field name from the column index map.
 */
function getField(
  fields: string[],
  columnMap: ColumnIndexMap,
  field: FieldName
): string {
  const idx = columnMap.get(field)!;
  return fields[idx];
}

/**
 * Parses a single CSV data row into a FidelityCsvRow.
 */
function parseRow(
  line: string,
  lineNumber: number,
  columnMap: ColumnIndexMap,
  isDesktop: boolean
): FidelityCsvRow {
  const fields = splitCsvLine(line);
  const minColumns = Math.max(...columnMap.values()) + 1;

  if (fields.length < minColumns) {
    throw new Error(
      `Row ${lineNumber}: expected at least ${minColumns} columns but got ${fields.length}`
    );
  }

  const rawDate = getField(fields, columnMap, 'date').trim();

  return {
    date: isDesktop ? convertDesktopDate(rawDate) : rawDate,
    account: getField(fields, columnMap, 'account').trim(),
    action: getField(fields, columnMap, 'action').trim(),
    symbol: getField(fields, columnMap, 'symbol').trim(),
    description: getField(fields, columnMap, 'description').trim(),
    quantity: parseNumericField(
      getField(fields, columnMap, 'quantity'),
      `quantity at row ${lineNumber}`
    ),
    price: parseNumericField(
      getField(fields, columnMap, 'price'),
      `price at row ${lineNumber}`
    ),
    totalAmount: parseNumericField(
      getField(fields, columnMap, 'amount'),
      `total amount at row ${lineNumber}`
    ),
  };
}
