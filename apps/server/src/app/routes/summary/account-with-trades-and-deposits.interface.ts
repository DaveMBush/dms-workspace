export interface AccountWithTradesAndDeposits {
  divDeposits: Array<{
    universeId: string | null;
    amount: number;
  }>;
  trades: Array<{
    sell: number;
    buy: number;
    quantity: number;
  }>;
}
