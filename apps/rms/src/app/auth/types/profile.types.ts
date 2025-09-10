export interface UserProfile {
  username: string;
  email: string;
  emailVerified: boolean;
  name?: string;
  createdAt: Date;
  lastModified: Date;
  sessionInfo: {
    loginTime: Date;
    tokenExpiration: Date;
    sessionDuration: number;
  };
}
