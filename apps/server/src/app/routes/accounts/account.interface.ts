export interface Account {
  id: string;
  name: string;
  trades: string[];
  divDeposits: string[];
  months: { month: number; year: number }[];
}
