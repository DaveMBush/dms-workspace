import { AuthErrorType } from './auth.types';

export class AuthError extends Error {
  constructor(
    message: string,
    public type: AuthErrorType,
    public statusCode: number
  ) {
    super(message);
    this.name = 'AuthError';
  }
}
