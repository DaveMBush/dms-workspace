export interface Account {
  id: string;
  name: string;
  openTrades: {
    startIndex: number;
    indexes: string[];
    length: number;
  };
  soldTrades: {
    startIndex: number;
    indexes: string[];
    length: number;
  };
  divDeposits: {
    startIndex: number;
    indexes: string[];
    length: number;
  };
  months: { month: number; year: number }[];
}
