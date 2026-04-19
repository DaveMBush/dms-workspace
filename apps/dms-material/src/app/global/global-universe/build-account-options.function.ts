import { Account } from '../../store/accounts/account.interface';

export function buildAccountOptions(
  accounts: Account[]
): { label: string; value: string }[] {
  const options = [{ label: 'All Accounts', value: 'all' }];
  for (let i = 0; i < accounts.length; i++) {
    options.push({ label: accounts[i].name, value: accounts[i].id });
  }
  return options;
}
