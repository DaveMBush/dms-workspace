/**
 * Safely retrieves a value from localStorage with type safety
 */
export function getLocalStorageItem<T>(key: string, defaultValue: T): T {
  try {
    const saved = localStorage.getItem(key);
    if (saved === null) {
      return defaultValue;
    }
    const parsed = JSON.parse(saved) as T;
    return parsed;
  } catch {
    // Silently fail if localStorage is not available
    return defaultValue;
  }
}
