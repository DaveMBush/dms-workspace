export interface Account {
  id: string;
  name: string;
  trades: string[];
  divDeposits: {
    startIndex: number;
    indexes: string[];
    length: number;
  };
  months: { month: number; year: number }[];
}
