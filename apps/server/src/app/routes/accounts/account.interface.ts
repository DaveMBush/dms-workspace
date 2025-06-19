export interface Account {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  version: number;
  trades: string[]
  statuses: string[];
}
