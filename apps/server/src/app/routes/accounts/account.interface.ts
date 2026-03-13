export interface Account {
  id: string;
  name: string;
  openTrades: string[];
  soldTrades: string[];
  divDeposits: {
    startIndex: number;
    indexes: string[];
    length: number;
  };
  months: { month: number; year: number }[];
}
