/// <reference types="@angular/localize" />

import { bootstrapApplication } from '@angular/platform-browser';
import { App } from './app/app';
import { loadApplicationConfig } from 'cmf-core/init';

loadApplicationConfig('assets/config.json').then(() => {
  import(/* webpackMode: "eager" */ './app/app.config').then(({ appConfig }) => {
    bootstrapApplication(App, appConfig)
      .catch((err) => console.error(err));
  });
});
