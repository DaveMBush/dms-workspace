export interface JWTUser {
  sub: string;
  email: string;
  username: string;
  groups: string[];
  exp?: number;
  iat?: number;
  [key: string]: unknown;
}
