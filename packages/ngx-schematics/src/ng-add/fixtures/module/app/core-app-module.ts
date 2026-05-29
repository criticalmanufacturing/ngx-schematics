import { NgModule, provideBrowserGlobalErrorListeners, provideZoneChangeDetection, isDevMode } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { App } from './app';
import { ServiceWorkerModule } from '@angular/service-worker';
import { provideCoreUI } from 'cmf-core-ui';
import { provideMetadataRouter } from 'cmf-core';
import './app.workers';

@NgModule({
  declarations: [
    App
  ],
  imports: [
    BrowserModule,
    ServiceWorkerModule.register('ngsw-loader-worker.js', {
      enabled: !isDevMode(),
      // Register the ServiceWorker as soon as the application is stable
      // or after 30 seconds (whichever comes first).
      registrationStrategy: 'registerWhenStable:30000'
    })
  ],
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection(),
    provideCoreUI(),
    provideMetadataRouter()
  ],
  bootstrap: [App]
})
export class AppModule { }
