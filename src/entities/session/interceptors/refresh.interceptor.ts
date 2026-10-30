import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, finalize, shareReplay, switchMap, throwError } from 'rxjs';
import { AuthService } from '@entities/session/api/auth.service';

// Requests that never trigger a refresh: they either are the refresh, or a
// 401 from them means wrong credentials, not an expired access token.
const NO_REFRESH = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout'];

let refreshing$: Observable<void> | null = null;

/**
 * On 401 the access cookie has expired (it lives 10 minutes): refresh once,
 * shared by every request that failed meanwhile, and repeat the request.
 * If the refresh fails too, the session is over.
 */
export const refreshInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return next(req).pipe(
    catchError((err: unknown) => {
      if (!(err instanceof HttpErrorResponse) || err.status !== 401 || NO_REFRESH.some(p => req.url.includes(p))) {
        return throwError(() => err);
      }
      if (!refreshing$) {
        refreshing$ = auth.refresh().pipe(
          finalize(() => (refreshing$ = null)),
          shareReplay(1),
        );
      }
      return refreshing$.pipe(
        catchError(() => {
          const wasIn = auth.signedIn();
          auth.forget();
          if (wasIn && router.url.startsWith('/channels')) {
            router.navigate(['/login'], { queryParams: { returnUrl: router.url } });
          }
          return throwError(() => err);
        }),
        switchMap(() => next(req)),
      );
    }),
  );
};
