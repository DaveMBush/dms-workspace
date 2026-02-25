interface DuplicateCheckRow {
  date: string;
  action: string;
  symbol: string;
  quantity: number;
  price: number;
  account: string;
}

interface DuplicateFileResult {
  row: number;
  message: string;
}

/**
 * Generates a unique key for a transaction row to detect duplicates.
 */
function transactionKey(row: DuplicateCheckRow): string {
  return `${row.date}|${row.action}|${row.symbol}|${row.quantity}|${row.price}|${row.account}`;
}

/**
 * Detects duplicate rows within the same file.
 * Returns an array of duplicate entries (the second and subsequent occurrences).
 */
export function detectDuplicatesInFile(
  rows: DuplicateCheckRow[]
): DuplicateFileResult[] {
  const seen = new Map<string, number>();
  const duplicates: DuplicateFileResult[] = [];

  for (let i = 0; i < rows.length; i++) {
    const key = transactionKey(rows[i]);
    const firstIndex = seen.get(key);
    if (firstIndex !== undefined) {
      duplicates.push({
        row: i + 1,
        message: `Duplicate of row ${
          firstIndex + 1
        }: same date, action, symbol, quantity, price, and account`,
      });
    } else {
      seen.set(key, i);
    }
  }

  return duplicates;
}
