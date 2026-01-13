import { NgModule, provideBrowserGlobalErrorListeners, isDevMode } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { App } from './app';
import { ServiceWorkerModule } from '@angular/service-worker';
import { CoreUIModule } from 'cmf-core-ui';
import { MetadataRoutingModule } from 'cmf-core';
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
    }),
    CoreUIModule.forRoot(),
    MetadataRoutingModule
  ],
  providers: [
    provideBrowserGlobalErrorListeners()
  ],
  bootstrap: [App]
})
export class AppModule { }
