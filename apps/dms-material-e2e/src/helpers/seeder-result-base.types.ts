export interface SeederResultBase {
  cleanup(): Promise<void>;
  symbols: string[];
}
