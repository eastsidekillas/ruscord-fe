import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';

import { appRoutes } from './app.routes';
import {provideHttpClient, withInterceptors} from '@angular/common/http';
import { refreshInterceptor } from '@entities/session/interceptors/refresh.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(appRoutes),
    provideHttpClient(withInterceptors([refreshInterceptor]))
  ]
};
