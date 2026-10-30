import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { map } from 'rxjs';
import { AuthService } from '@entities/session/api/auth.service';

export const AuthGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.ensureLoaded().pipe(
    map(user => user ? true : router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } })),
  );
};
