export interface SymbolFilterManager {
  onSymbolFilterChange(value: string): void;
  cleanup(): void;
}
