// Authentication type definitions for RMS Application
/* eslint-disable @typescript-eslint/naming-convention -- External API properties use snake_case */
/* eslint-disable @smarttools/one-exported-item-per-file -- Auth types are closely related */

export interface AuthUser {
  username: string;
  email: string;
  attributes: {
    email: string;
    email_verified: boolean;
    sub: string;
  };
  signInUserSession?: {
    accessToken: {
      jwtToken: string;
      payload: {
        sub: string;
        iss: string;
        client_id: string;
        origin_jti: string;
        event_id: string;
        token_use: string;
        scope: string;
        auth_time: number;
        exp: number;
        iat: number;
        jti: string;
        username: string;
      };
    };
    idToken: {
      jwtToken: string;
      payload: {
        sub: string;
        aud: string;
        cognito: string;
        event_id: string;
        token_use: string;
        auth_time: number;
        iss: string;
        exp: number;
        iat: number;
        email: string;
      };
    };
    refreshToken: {
      token: string;
    };
  };
}

export interface AuthSession {
  accessToken: string;
  idToken: string;
  refreshToken: string;
  expiration?: number;
  tokens?: SessionTokens;
}

export interface SessionTokens {
  accessToken: string | null;
  idToken: string | null;
  refreshToken?: string | null;
}

export interface SignInRequest {
  username: string;
  password: string;
}

export interface SignInResponse {
  user: AuthUser;
  session: AuthSession;
}

export interface AuthError {
  code: string;
  message: string;
  name: string;
}

export interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
}

// AWS Amplify Auth error codes
export enum AuthErrorCode {
  USER_NOT_CONFIRMED = 'UserNotConfirmedException',
  NOT_AUTHORIZED = 'NotAuthorizedException',
  USER_NOT_FOUND = 'UserNotFoundException',
  TOO_MANY_REQUESTS = 'TooManyRequestsException',
  INVALID_PASSWORD = 'InvalidPasswordException',
  PASSWORD_RESET_REQUIRED = 'PasswordResetRequiredException',
  NETWORK_ERROR = 'NetworkError',
  UNKNOWN_ERROR = 'UnknownError',
}

export interface LoginFormData {
  email: string;
  password: string;
}
