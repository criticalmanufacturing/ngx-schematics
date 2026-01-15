import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
import { FULL_CALENDAR } from '.';

describe('Test ng-update', () => {
  const migrationsSchematicRunner = new SchematicTestRunner(
    '@criticalmanufacturing/ngx-schematics',
    require.resolve('../../migrations.json')
  );

  const workspaceOptions = {
    name: 'workspace',
    version: '10.0.0'
  };

  const appOptions = {
    name: 'application',
    inlineStyle: false,
    inlineTemplate: false,
    routing: false,
    skipTests: false,
    skipPackageJson: false,
    standalone: false
  };

  let appTree: UnitTestTree;

  beforeEach(async () => {
    appTree = await migrationsSchematicRunner.runExternalSchematic(
      '@schematics/angular',
      'workspace',
      workspaceOptions
    );

    appTree = await migrationsSchematicRunner.runExternalSchematic(
      '@schematics/angular',
      'application',
      appOptions,
      appTree
    );
  });

  describe('- Migrate to v2.0', () => {
    it('should update the default project builder polyfills', async () => {
      const workspace = JSON.parse(appTree.readContent('angular.json'));

      const polyfills = workspace.projects.application.architect.build.options
        .polyfills as string[];
      expect(polyfills === undefined || !polyfills.includes('reflect-metadata')).toBe(true);

      const tree = await migrationsSchematicRunner.runSchematic('update-2-0-0', {}, appTree);

      const updatedWorkspace = JSON.parse(tree.readContent('angular.json'));
      expect(updatedWorkspace.projects.application.architect.build.options.polyfills).toContain(
        'reflect-metadata'
      );
    });

    it('should remove initial themes from the index.html', async () => {
      appTree.overwrite(
        '/application/src/index.html',
        `\
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>DocumentationPortal</title>
  <base href="/">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="icon" type="image/x-icon" href="favicon.ico">
  <link rel="manifest" href="manifest.webmanifest">
  <meta name="theme-color" content="#1976d2">
  <style id="initial-theme">
    @import url("cmf.style.blue.css");
  </style>
</head>
<body>
  <div id="loading-container" class="cmf-loading-container">
    <div class="cmf-loading-center">
      <div class="cmf-loading-cmf-logo"></div>
      <div class="cmf-loading-spinner"></div>
    </div>
  </div>
  <cmf-docs-app-root></cmf-docs-app-root>
  <noscript>Please enable JavaScript to continue using this application.</noscript>
</body>
</html>`
      );

      const tree = await migrationsSchematicRunner.runSchematic('update-2-0-0', {}, appTree);
      const appModule = tree.readText('/application/src/index.html');
      expect(appModule).not.toContain('<style id="initial-theme">');
    });

    it('should remove the CoreModule', async () => {
      appTree.overwrite(
        '/application/src/app/app-module.ts',
        `\
import { NgModule, isDevMode } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { ServiceWorkerModule } from '@angular/service-worker';

import { AppComponent } from './app.component';

import { CoreModule, MetadataRoutingModule } from 'cmf-core';
import { CoreUIModule } from 'cmf-core-ui';

@NgModule({
    declarations: [
        AppComponent
    ],
    imports: [
        BrowserModule,
        CoreModule,
        CoreUIModule,
        MetadataRoutingModule
    ],
    providers: [],
    bootstrap: [AppComponent]
})
export class AppModule { }`
      );

      const tree = await migrationsSchematicRunner.runSchematic('update-2-0-0', {}, appTree);
      const appModule = tree.readText('/application/src/app/app-module.ts');
      expect(appModule).not.toContain('CoreModule');
    });

    it('should update the default project builder scripts', async () => {
      const workspace = JSON.parse(appTree.readContent('angular.json'));
      workspace.projects.application.architect.build.scripts ??= [];
      workspace.projects.application.architect.build.scripts.push(FULL_CALENDAR);

      const tree = await migrationsSchematicRunner.runSchematic('update-2-0-0', {}, appTree);

      const updatedWorkspace = JSON.parse(tree.readContent('angular.json'));

      const scripts = updatedWorkspace.projects.application.architect.build.options.scripts;
      expect(scripts === undefined || !scripts.includes(FULL_CALENDAR)).toBe(true);
    });
  });
});
