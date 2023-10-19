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
    skipPackageJson: false
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

      let appModuleContent = tree.readText('/application/src/app/app.module.ts');
      expect(appModuleContent).toContain(`ServiceWorkerModule.register('ngsw-worker.js'`);

      await migrationsSchematicRunner.runSchematic('update-1-2-0', {}, tree);

      appModuleContent = tree.readText('/application/src/app/app.module.ts');
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
