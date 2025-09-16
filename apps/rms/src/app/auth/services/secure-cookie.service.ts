import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, EMPTY, map, Observable, switchMap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { CSRFTokenResponse } from './csrf-token-response.interface';
import { SecureCookieRequest } from './secure-cookie-request.interface';

@Injectable({
  providedIn: 'root',
})
export class SecureCookieService {
  private http = inject(HttpClient);
  private readonly csrfEndpoint = `${environment.apiUrl}/api/auth/csrf-token`;
  private readonly setCookieEndpoint = `${environment.apiUrl}/api/auth/set-secure-cookie`;
  private readonly clearCookiesEndpoint = `${environment.apiUrl}/api/auth/clear-cookies`;

  setSecureToken(token: string, expirationDate: Date): Observable<unknown> {
    // eslint-disable-next-line @smarttools/no-anonymous-functions -- Arrow function needed for proper this context
    const makeSetCookieRequest = (csrfToken: string): Observable<unknown> =>
      this.http.post<unknown>(
        this.setCookieEndpoint,
        {
          token,
          expirationDate: expirationDate.toISOString(),
        } as SecureCookieRequest,
        {
          headers: {
            'X-CSRF-Token': csrfToken,
          },
          withCredentials: true,
        }
      );

    return this.getCSRFToken().pipe(switchMap(makeSetCookieRequest));
  }

  getCSRFToken(): Observable<string> {
    // eslint-disable-next-line @smarttools/no-anonymous-functions -- Arrow function needed for proper this context
    const validateAndExtractToken = (response: CSRFTokenResponse): string => {
      if (!response?.csrfToken || response.csrfToken.length === 0) {
        throw new Error('No CSRF token received');
      }
      return response.csrfToken;
    };

    return this.http
      .get<CSRFTokenResponse>(this.csrfEndpoint, { withCredentials: true })
      .pipe(map(validateAndExtractToken));
  }

  clearSecureTokens(): Observable<unknown> {
    // eslint-disable-next-line @smarttools/no-anonymous-functions -- Arrow function needed for proper this context
    const makeClearCookiesRequest = (csrfToken: string): Observable<unknown> =>
      this.http.post<unknown>(
        this.clearCookiesEndpoint,
        {},
        {
          headers: {
            'X-CSRF-Token': csrfToken,
          },
          withCredentials: true,
        }
      );

    // eslint-disable-next-line @smarttools/no-anonymous-functions -- Arrow function needed for proper this context
    const handleClearCookiesError = (): Observable<never> => {
      // Don't throw here as logout should proceed even if cookie clearing fails
      return EMPTY;
    };

    return this.getCSRFToken().pipe(
      switchMap(makeClearCookiesRequest),
      catchError(handleClearCookiesError)
    );
  }

  isSecureCookiesEnabled(): boolean {
    return environment.security?.useSecureCookies ?? false;
  }
}
