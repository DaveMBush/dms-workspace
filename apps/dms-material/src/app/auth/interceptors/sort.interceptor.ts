import {
  HttpEvent,
  HttpHandlerFn,
  HttpInterceptorFn,
  HttpRequest,
} from '@angular/common/http';
import { Observable } from 'rxjs';

/**
 * Sort interceptor that adds X-Sort-Field and X-Sort-Order headers
 * to sortable API endpoints based on persisted sort state.
 *
 * TDD RED: Implementation in Story AW.6
 */
export const sortInterceptor: HttpInterceptorFn = function sortInterceptorImpl(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> {
  return next(req);
};
