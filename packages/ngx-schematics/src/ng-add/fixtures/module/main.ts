/// <reference types="@angular/localize" />

import { platformBrowser } from '@angular/platform-browser';
import { loadApplicationConfig } from 'cmf-core/init';

loadApplicationConfig('assets/config.json').then(() => {
  import(/* webpackMode: "eager" */ './app/app-module').then(({ AppModule }) => {
    platformBrowser().bootstrapModule(AppModule, {

    })
      .catch(err => console.error(err));
  });
});