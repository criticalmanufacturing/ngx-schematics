import { JsonArray, JsonObject } from '@angular-devkit/core';
import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
import { parse } from 'jsonc-parser';

describe('Test ng-add', () => {
  const schematicRunner = new SchematicTestRunner(
    '@criticalmanufacturing/ngx-schematics',
    require.resolve('../collection.json')
  );

  const workspaceOptions = {
    name: 'workspace',
    version: '10.0.0'
  };

  const ngAddOptions = {
    project: 'application',
    application: 'Core',
    version: 'dev'
  };

  let appTree: UnitTestTree;

  beforeEach(async () => {
    appTree = await schematicRunner.runExternalSchematic(
      '@schematics/angular',
      'workspace',
      workspaceOptions
    );
  });

  describe('without standalone', () => {
    const appOptions = {
      name: 'application',
      inlineStyle: false,
      inlineTemplate: false,
      routing: false,
      skipTests: false,
      skipPackageJson: false,
      standalone: false
    };

    beforeEach(async () => {
      appTree = await schematicRunner.runExternalSchematic(
        '@schematics/angular',
        'application',
        appOptions,
        appTree
      );
    });

    it('should have the necessary files', async () => {
      const tree = await schematicRunner.runSchematic('ng-add', ngAddOptions, appTree);

      expect(tree.files).toEqual(
        jasmine.arrayContaining([
          '/angular.json',
          '/package.json',
          '/tsconfig.json',
          '/.eslintrc.json',
          '/application/tsconfig.app.json',
          '/application/tsconfig.spec.json',
          '/application/ngsw-config.json',
          '/application/.eslintrc.json',
          '/application/src/index.html',
          '/application/src/main.ts',
          '/application/src/styles.css',
          '/application/src/manifest.webmanifest',
          '/application/src/assets/config.json',
          '/application/src/app/app.module.ts',
          '/application/src/app/app.component.html'
        ])
      );
    });

    describe('- Generate angular.json', () => {
      it('should have @criticalmanufacturing/ngx-schematics in schematicCollections', async () => {
        const tree = await schematicRunner.runSchematic('ng-add', ngAddOptions, appTree);

        const angularJsonContent = JSON.parse(tree.readContent('/angular.json'));
        expect(angularJsonContent.cli.schematicCollections).toContain(
          '@criticalmanufacturing/ngx-schematics'
        );
      });

      it('should set service worker', async () => {
        const tree = await schematicRunner.runSchematic('ng-add', ngAddOptions, appTree);

        const ngswConfig = tree.readJson('application/ngsw-config.json');

        const appAssetGroup = ((ngswConfig as JsonObject)['assetGroups'] as JsonArray).find(
          (assetGroup) => (assetGroup as JsonObject)['name'] === 'app'
        );

        const configDataGroup = ((ngswConfig as JsonObject)['dataGroups'] as JsonArray).find(
          (assetGroup) => (assetGroup as JsonObject)['name'] === 'config'
        );

        expect(
          ((appAssetGroup as JsonObject)?.['resources'] as JsonObject)?.['files'] as JsonArray
        ).toContain('/monaco-editor/**/*.js');

        expect(configDataGroup).not.toBeNull();
      });

      it('should have webmanifest in assets', async () => {
        const tree = await schematicRunner.runSchematic('ng-add', ngAddOptions, appTree);

        const angularJsonContent = JSON.parse(tree.readContent('/angular.json'));
        expect(angularJsonContent.projects.application.architect.build.options.assets).toContain(
          'application/src/manifest.webmanifest'
        );
        expect(angularJsonContent.projects.application.architect.test.options.assets).toContain(
          'application/src/manifest.webmanifest'
        );
      });

      it('should have lint architect', async () => {
        const tree = await schematicRunner.runSchematic('ng-add', ngAddOptions, appTree);

        const angularJsonContent = JSON.parse(tree.readContent('/angular.json'));
        expect(angularJsonContent.projects.application.architect.lint).toBeDefined();
        expect(angularJsonContent.projects.application.architect.lint.builder).toBe(
          '@angular-eslint/builder:lint'
        );
        expect(
          angularJsonContent.projects.application.architect.lint.options.lintFilePatterns
        ).toEqual(jasmine.arrayContaining(['application/**/*.ts', 'application/**/*.html']));
      });
    });

    describe('- Generate package.json', () => {
      it('should have the lint script', async () => {
        const tree = await schematicRunner.runSchematic('ng-add', ngAddOptions, appTree);

        const packageJsonContent = JSON.parse(tree.readContent('/package.json'));
        expect(packageJsonContent.scripts.lint).toBeDefined();
        expect(packageJsonContent.scripts.lint).toBe('ng lint');
      });

      it('should have cmf-core-ui package in the dependencies', async () => {
        const tree = await schematicRunner.runSchematic('ng-add', ngAddOptions, appTree);

        const packageJsonContent = JSON.parse(tree.readContent('/package.json'));
        expect(Object.getOwnPropertyNames(packageJsonContent.dependencies)).toEqual(
          jasmine.arrayContaining(['cmf-core-ui'])
        );
      });

      it('should delete the budgets configuration', async () => {
        const angularJsonContent = JSON.parse(appTree.readContent('/angular.json'));
        expect(
          angularJsonContent.projects.application.architect.build.configurations.production.budgets.findIndex(
            (budget: { type: string }) => budget.type === 'initial'
          )
        ).toBeGreaterThanOrEqual(0);

        const tree = await schematicRunner.runSchematic('ng-add', ngAddOptions, appTree);
        const updatedAngularJsonContent = JSON.parse(tree.readContent('/angular.json'));
        expect(
          updatedAngularJsonContent.projects.application.architect.build.configurations.production.budgets.findIndex(
            (budget: { type: string }) => budget.type === 'initial'
          )
        ).toEqual(-1);
      });

      it('should have cmf-mes-ui package in the dependencies', async () => {
        const ngAddMesOptions = {
          ...ngAddOptions,
          application: 'MES'
        };

        const tree = await schematicRunner.runSchematic('ng-add', ngAddMesOptions, appTree);

        const packageJsonContent = JSON.parse(tree.readContent('/package.json'));
        expect(Object.getOwnPropertyNames(packageJsonContent.dependencies)).toEqual(
          jasmine.arrayContaining(['cmf-mes-ui'])
        );
      });
    });

    describe('- Generate tsconfig.json', () => {
      it('should have new configs', async () => {
        const tree = await schematicRunner.runSchematic('ng-add', ngAddOptions, appTree);

        const tsConfigJsonContent = parse(tree.readContent('/tsconfig.json'));
        expect(tsConfigJsonContent.compilerOptions.noImplicitAny).toBeFalse();
        expect(tsConfigJsonContent.compilerOptions.strictFunctionTypes).toBeFalse();
        expect(tsConfigJsonContent.compilerOptions.strictNullChecks).toBeFalse();
      });
    });

    describe('- Generate index.html', () => {
      it('should have the link for manifest', async () => {
        const tree = await schematicRunner.runSchematic('ng-add', ngAddOptions, appTree);

        const indexHtmlContent = tree.readContent('/application/src/index.html');
        expect(indexHtmlContent).toContain('<link rel="manifest" href="manifest.webmanifest">');
      });

      it('should have the meta for theme-color', async () => {
        const tree = await schematicRunner.runSchematic('ng-add', ngAddOptions, appTree);

        const indexHtmlContent = tree.readContent('/application/src/index.html');
        expect(indexHtmlContent).toContain('<meta name="theme-color"');
      });

      it('should have the loading ', async () => {
        const tree = await schematicRunner.runSchematic('ng-add', ngAddOptions, appTree);

        const styleRegExp = new RegExp(
          `<div id="loading-container" class="cmf-loading-container">\\s*` +
            `<div class="cmf-loading-center">\\s*` +
            `<div class="cmf-loading-cmf-logo"></div>\\s*` +
            `<div class="cmf-loading-spinner"></div>\\s*` +
            `</div>\\s*` +
            `</div>`,
          'gm'
        );

        const indexHtmlContent = tree.readContent('/application/src/index.html');
        expect(indexHtmlContent).toMatch(styleRegExp);
      });

      it('should have the noscript', async () => {
        const tree = await schematicRunner.runSchematic('ng-add', ngAddOptions, appTree);

        const indexHtmlContent = tree.readContent('/application/src/index.html');
        expect(indexHtmlContent).toContain(
          '<noscript>Please enable JavaScript to continue using this application.</noscript>'
        );
      });
    });

    describe('- Generate main.ts', () => {
      it('should import the loadApplicationConfig from cmf-core', async () => {
        const tree = await schematicRunner.runSchematic('ng-add', ngAddOptions, appTree);

        const mainContent = tree.readContent('/application/src/main.ts');
        expect(mainContent).toContain(`import { loadApplicationConfig } from 'cmf-core/init';`);
      });

      it('should call loadApplicationConfig and import AppModule', async () => {
        const tree = await schematicRunner.runSchematic('ng-add', ngAddOptions, appTree);

        const mainContent = tree.readContent('/application/src/main.ts');
        expect(mainContent).toContain(`loadApplicationConfig('assets/config.json').then(() => {
  import(/* webpackMode: "eager" */ './app/app.module').then(({ AppModule }) => {
    platformBrowserDynamic().bootstrapModule(AppModule)
      .catch(err => console.error(err));
  });
});`);
      });
    });

    describe('- Generate App component', () => {
      it('should have the router-outlet', async () => {
        const tree = await schematicRunner.runSchematic('ng-add', ngAddOptions, appTree);

        const appComponentHtmlContent = tree.readContent('/application/src/app/app.component.html');
        expect(appComponentHtmlContent).toEqual('<router-outlet></router-outlet>');
      });

      it('should import the CoreUIModule and MetadataRoutingModule', async () => {
        const tree = await schematicRunner.runSchematic('ng-add', ngAddOptions, appTree);

        const appModuleContent = tree.readContent('/application/src/app/app.module.ts');
        expect(appModuleContent).toContain(`import { CoreUIModule } from 'cmf-core-ui';`);
        expect(appModuleContent).toContain(`import { MetadataRoutingModule } from 'cmf-core';`);

        const appModuleImports = appModuleContent.match(/imports: \[((\W|\w|\n|\r|\s)*)\]/gm)?.[0];
        expect(appModuleImports).not.toBeNull();
        expect(appModuleImports).toContain('CoreUIModule');
        expect(appModuleImports).toContain('MetadataRoutingModule');
      });

      it('should import the MesUIModule and MetadataRoutingModule', async () => {
        const ngAddMesOptions = {
          ...ngAddOptions,
          application: 'MES'
        };

        const tree = await schematicRunner.runSchematic('ng-add', ngAddMesOptions, appTree);

        const appModuleContent = tree.readContent('/application/src/app/app.module.ts');
        expect(appModuleContent).toContain(`import { MesUIModule } from 'cmf-mes-ui';`);
        expect(appModuleContent).toContain(`import { MetadataRoutingModule } from 'cmf-core';`);

        const appModuleImports = appModuleContent.match(/imports: \[((\W|\w|\n|\r|\s)*)\]/gm)?.[0];
        expect(appModuleImports).not.toBeNull();
        expect(appModuleImports).toContain('MesUIModule');
        expect(appModuleImports).toContain('MetadataRoutingModule');
      });
    });
  });

  describe('with standalone', () => {
    const appOptions = {
      name: 'application',
      inlineStyle: false,
      inlineTemplate: false,
      routing: false,
      skipTests: false,
      skipPackageJson: false,
      standalone: true
    };

    beforeEach(async () => {
      appTree = await schematicRunner.runExternalSchematic(
        '@schematics/angular',
        'application',
        appOptions,
        appTree
      );
    });

    describe('- Generate main.ts', () => {
      it('should import the loadApplicationConfig from cmf-core', async () => {
        const tree = await schematicRunner.runSchematic('ng-add', ngAddOptions, appTree);

        const mainContent = tree.readContent('/application/src/main.ts');
        expect(mainContent).toContain(`import { loadApplicationConfig } from 'cmf-core/init';`);
      });

      it('should call loadApplicationConfig and import the app component', async () => {
        const tree = await schematicRunner.runSchematic('ng-add', ngAddOptions, appTree);

        const mainContent = tree.readContent('/application/src/main.ts');
        expect(mainContent).toContain(`loadApplicationConfig('assets/config.json').then(() => {
  import(/* webpackMode: "eager" */ './app/app.config').then(({ appConfig }) => {
    bootstrapApplication(AppComponent, appConfig)
      .catch((err) => console.error(err));
  });
});`);
      });
    });

    describe('- Generate App component', () => {
      it('should have the router-outlet', async () => {
        const tree = await schematicRunner.runSchematic('ng-add', ngAddOptions, appTree);

        const appComponentHtmlContent = tree.readContent('/application/src/app/app.component.html');
        expect(appComponentHtmlContent).toEqual('<router-outlet></router-outlet>');
      });

      it('should import provideCoreUI and provideMetadataRouter', async () => {
        const tree = await schematicRunner.runSchematic('ng-add', ngAddOptions, appTree);

        const appModuleContent = tree.readContent('/application/src/app/app.config.ts');
        expect(appModuleContent).toContain(`import { provideCoreUI } from 'cmf-core-ui';`);
        expect(appModuleContent).toContain(`import { provideMetadataRouter } from 'cmf-core';`);

        const appModuleImports = appModuleContent.match(
          /providers: \[((\W|\w|\n|\r|\s)*)\]/gm
        )?.[0];
        expect(appModuleImports).not.toBeNull();
        expect(appModuleImports).toContain('provideCoreUI()');
        expect(appModuleImports).toContain('provideMetadataRouter()');
      });

      it('should import provideMESUI and provideMetadataRouter', async () => {
        const ngAddMesOptions = {
          ...ngAddOptions,
          application: 'MES'
        };

        const tree = await schematicRunner.runSchematic('ng-add', ngAddMesOptions, appTree);

        const appModuleContent = tree.readContent('/application/src/app/app.config.ts');
        expect(appModuleContent).toContain(`import { provideMesUI } from 'cmf-mes-ui';`);
        expect(appModuleContent).toContain(`import { provideMetadataRouter } from 'cmf-core';`);

        const appModuleImports = appModuleContent.match(
          /providers: \[((\W|\w|\n|\r|\s)*)\]/gm
        )?.[0];
        expect(appModuleImports).not.toBeNull();
        expect(appModuleImports).toContain('provideMesUI()');
        expect(appModuleImports).toContain('provideMetadataRouter()');
      });
    });
  });
});
