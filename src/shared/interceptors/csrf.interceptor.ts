import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '@shared/api/auth.service';
import { catchError, switchMap, throwError } from 'rxjs';

export const tokenInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);

  return next(req).pipe(
    catchError(error => {
      if (error.status === 401) {
        return authService.refreshToken().pipe(
          switchMap(() => next(req)),
          catchError(() => {
            authService.logout();
            return throwError(() => new Error('Unauthorized'));
          })
        );
      }
      return throwError(() => error);
    })
  );
};
