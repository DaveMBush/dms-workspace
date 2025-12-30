import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { AuthSession } from '../auth.types';
import { storeAuthTokens } from '../utils/store-auth-tokens.function';
import { SecureCookieService } from './secure-cookie.service';
import { TokenData } from './token-data.interface';

@Injectable({
  providedIn: 'root',
})
export class TokenHandlerService {
  private secureCookieService = inject(SecureCookieService);

  async handleSessionTokens(session: unknown): Promise<void> {
    const sessionData = session as {
      tokens?: {
        accessToken?: { toString(): string; payload: { exp: number } };
        idToken?: { toString(): string };
        refreshToken?: { toString(): string };
      };
    };

    if (!sessionData.tokens) {
      return;
    }

    const tokenData = this.extractTokenData(sessionData.tokens);

    if (this.secureCookieService.isSecureCookiesEnabled()) {
      await this.handleSecureCookieStorage(tokenData);
    } else {
      storeAuthTokens(tokenData as AuthSession);
    }
  }

  private extractTokenData(tokens: {
    accessToken?: { toString(): string; payload: { exp: number } };
    idToken?: { toString(): string };
    refreshToken?: { toString(): string };
  }): TokenData {
    return {
      accessToken: tokens.accessToken?.toString() ?? '',
      idToken: tokens.idToken?.toString() ?? '',
      refreshToken: tokens.refreshToken?.toString() ?? '',
      expiration: tokens.accessToken?.payload.exp,
    };
  }

  private async handleSecureCookieStorage(tokenData: TokenData): Promise<void> {
    try {
      const expirationDate = this.getExpirationDate(tokenData.expiration);
      // eslint-disable-next-line no-restricted-syntax -- AWS Amplify integration requires Promise handling
      await firstValueFrom<unknown>(
        this.secureCookieService.setSecureToken(
          tokenData.accessToken,
          expirationDate
        )
      );
    } catch {
      // Fallback to localStorage if secure cookie fails
      storeAuthTokens(tokenData as AuthSession);
    }
  }

  private getExpirationDate(expiration?: number): Date {
    const expirationDate = new Date();
    if (typeof expiration === 'number' && expiration > 0) {
      expirationDate.setTime(expiration * 1000);
    } else {
      // Default to 1 hour if no expiration
      expirationDate.setTime(Date.now() + 60 * 60 * 1000);
    }
    return expirationDate;
  }
}
