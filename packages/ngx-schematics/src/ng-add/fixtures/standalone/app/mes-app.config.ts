import { ApplicationConfig, provideBrowserGlobalErrorListeners, isDevMode, provideZoneChangeDetection } from '@angular/core';
import { provideServiceWorker } from '@angular/service-worker';
import { provideMesUI } from 'cmf-mes-ui';
import { provideMetadataRouter } from 'cmf-core';
import './app.workers';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideServiceWorker('ngsw-loader-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000'
    }),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideMesUI(),
    provideMetadataRouter()
  ]
};
