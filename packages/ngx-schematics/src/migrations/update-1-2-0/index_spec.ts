import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';

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

  const ngAddOptions = {
    project: 'application'
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

  describe('- Migrate to v1.2', () => {
    it('should update the service worker to register', async () => {
      const tree = await migrationsSchematicRunner.runExternalSchematic(
        '@angular/pwa',
        'pwa',
        ngAddOptions,
        appTree
      );

      appTree.overwrite(
        '/application/src/app/app.module.ts',
        `\
import { NgModule, isDevMode } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppComponent } from './app.component';
import { ServiceWorkerModule } from '@angular/service-worker';
import { CoreUIModule } from 'cmf-core-ui';
import { MetadataRoutingModule } from 'cmf-core';

@NgModule({
    declarations: [
        AppComponent
    ],
    imports: [
        BrowserModule,
        ServiceWorkerModule.register('ngsw-worker.js', {
            enabled: !isDevMode(),
            // Register the ServiceWorker as soon as the application is stable
            // or after 30 seconds (whichever comes first).
            registrationStrategy: 'registerWhenStable:30000'
        }),
        CoreUIModule.forRoot(),
        MetadataRoutingModule
    ],
    providers: [],
    bootstrap: [AppComponent]
})
export class AppModule { }`
      );

      await migrationsSchematicRunner.runSchematic('update-1-2-0', {}, tree);

      const appModuleContent = tree.readText('/application/src/app/app.module.ts');
      expect(appModuleContent).toContain(`ServiceWorkerModule.register('ngsw-loader-worker.js'`);
    });

    it('should update the service worker to register', async () => {
      await migrationsSchematicRunner.runSchematic('update-1-2-0', {}, appTree);

      const workspace = JSON.parse(appTree.readContent('angular.json'));
      expect(workspace.projects.application.architect.build.options.assets).toContain({
        glob: '**/*',
        input: 'node_modules/cmf-core/assets/js',
        output: ''
      });
    });
  });
});
