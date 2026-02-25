import { prisma } from '../../prisma/prisma-client';

interface AccountValidationFailure {
  valid: false;
  error: string;
}

interface AccountValidationSuccess {
  valid: true;
  accountId: string;
}

/**
 * Validates that an account exists in the database.
 * Performs an exact-match lookup on the account name.
 */
export async function validateAccount(
  accountName: string
): Promise<AccountValidationFailure | AccountValidationSuccess> {
  const account = await prisma.accounts.findFirst({
    where: { name: accountName },
  });
  if (account === null) {
    return {
      valid: false,
      error: `Account '${accountName}' not found. Please check the account name.`,
    };
  }
  return { valid: true, accountId: account.id };
}
