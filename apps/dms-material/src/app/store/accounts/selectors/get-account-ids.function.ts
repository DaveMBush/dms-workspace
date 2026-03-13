import { selectAccounts } from './select-accounts.function';

export function getAccountIds(): string[] {
  const accounts = selectAccounts();
  const ids: string[] = [];
  for (let i = 0; i < accounts.length; i++) {
    ids.push(accounts[i].id);
  }
  return ids;
}
