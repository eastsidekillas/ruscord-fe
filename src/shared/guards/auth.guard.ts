import {CanActivateFn, Router} from '@angular/router';
import {inject} from '@angular/core';
import { AuthService } from '@shared/api/auth.service';
import {map} from 'rxjs';

export const AuthGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.checkAuth().pipe(
    map(isAuthenticated => {
      if (isAuthenticated) {
        return true;
      }
      router.navigate(['/login'])
      return false;
    })
  )
};
