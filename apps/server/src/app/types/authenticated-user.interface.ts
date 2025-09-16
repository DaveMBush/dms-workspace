export interface AuthenticatedUser {
  sub: string;
  email: string;
  username: string;
  groups: string[];
  exp?: number; // Token expiration time
  iat?: number; // Token issued at time
  [key: string]: unknown;
}
