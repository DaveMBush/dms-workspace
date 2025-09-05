export interface AuthenticatedUser {
  sub: string;
  email: string;
  username: string;
  groups: string[];
}
