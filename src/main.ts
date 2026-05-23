import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent, appConfig)
  .then(() => {
    const splash = document.getElementById('app-splash');
    if (splash) {
      splash.classList.add('splash-hide');
      setTimeout(() => splash.remove(), 420);
    }
  })
  .catch((err) => console.error(err));
