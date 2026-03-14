export interface Account {
  id: string;
  name: string;
  openTrades: {
    startIndex: number;
    indexes: string[];
    length: number;
  };
  soldTrades: string[];
  divDeposits: {
    startIndex: number;
    indexes: string[];
    length: number;
  };
  months: { month: number; year: number }[];
}
