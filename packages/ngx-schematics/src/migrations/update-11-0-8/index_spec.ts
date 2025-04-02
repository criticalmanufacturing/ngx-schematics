import { JsonArray, JsonObject } from '@angular-devkit/core';
import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';

describe('Test ng-update', () => {
  const migrationsSchematicRunner = new SchematicTestRunner(
    '@criticalmanufacturing/ngx-schematics',
    require.resolve('../../migrations.json')
  );

  const workspaceOptions = {
    name: 'workspace',
    version: '11.0.0'
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

  const swOptions = {
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

    appTree = await migrationsSchematicRunner.runExternalSchematic(
      '@angular/pwa',
      'pwa',
      swOptions,
      appTree
    );
  });

  describe('- Migrate to v2.0', () => {
    it('should update configs in the ngsw-config.json', async () => {
      appTree.overwrite(
        '/application/ngsw-config.json',
        `\
{
  "$schema": "./node_modules/@angular/service-worker/config/schema.json",
  "index": "/index.html",
  "assetGroups": [
    {
      "name": "app",
      "installMode": "prefetch",
      "resources": {
        "files": [
          "/favicon.ico",
          "/manifest.webmanifest",
          "/*.css",
          "/*.js",
          "/monaco-editor/**/*.js"
        ]
      }
    },
    {
      "name": "assets",
      "installMode": "lazy",
      "updateMode": "prefetch",
      "resources": {
        "files": [
          "/assets/**",
          "!/assets/config.json",
          "/media/**",
          "/*.(svg|cur|jpg|jpeg|png|apng|webp|avif|gif|otf|ttf|woff|woff2)"
        ]
      }
    }
  ],
  "dataGroups": [
    {
      "name": "config",
      "urls": [
        "/assets/config.json"
      ],
      "cacheConfig": {
        "maxSize": 1,
        "maxAge": "30d",
        "strategy": "freshness"
      }
    }
  ],
  "navigationRequestStrategy": "freshness"
}`
      );

      const tree = await migrationsSchematicRunner.runSchematic('update-11-0-8', {}, appTree);
      const ngswConfig = tree.readJson('/application/ngsw-config.json') as JsonObject;
      const assetsAssetGroup = (ngswConfig['assetGroups'] as JsonArray).find(
        (assetGroup) => (assetGroup as JsonObject)['name'] === 'assets'
      );
      const assetsAssetFiles = ((assetsAssetGroup as JsonObject)?.['resources'] as JsonObject)?.[
        'files'
      ] as JsonArray;

      expect(assetsAssetFiles).toContain('!/ngsw-loader-worker.js');
    });
  });
});
