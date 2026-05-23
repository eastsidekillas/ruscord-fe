import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '@entities/session/api/auth.service';
import { catchError, switchMap, throwError } from 'rxjs';

export const tokenInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);

  // добавляем withCredentials ко всем запросам глобально
  const credReq = req.clone({ withCredentials: true });

  return next(credReq).pipe(
    catchError(error => {
      // исключаем refresh endpoint чтобы избежать бесконечного цикла
      if (error.status === 401 && !credReq.url.includes('/auth/refresh/')) {
        return authService.refreshToken().pipe(
          switchMap(() => next(credReq)),
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
