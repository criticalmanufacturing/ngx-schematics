import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
import { normalize } from '@criticalmanufacturing/schematics-devkit/testing';
import { parse } from 'jsonc-parser';
import { readFileSync } from 'node:fs';

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

  const fixturesPath = `${__dirname}/fixtures`;

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
          '/eslint.config.js',
          '/application/tsconfig.app.json',
          '/application/tsconfig.spec.json',
          '/application/ngsw-config.json',
          '/application/eslint.config.js',
          '/application/src/main.ts',
          '/application/src/index.html',
          '/application/src/styles.css',
          '/application/src/app/app-module.ts',
          '/application/src/app/app.ts',
          '/application/src/app/app.css',
          '/application/src/app/app.html',
          '/application/src/app/app.workers.ts',
          '/application/src/assets/config.json',
          '/application/src/manifest.webmanifest'
        ])
      );
      expect(tree.files.every((x) => !x.startsWith('/application/public'))).toBeTrue();
    });

    describe('- Generate index.html', () => {
      it('should have the updated index.html', async () => {
        const tree = await schematicRunner.runSchematic('ng-add', ngAddOptions, appTree);

        const actual = tree.readContent('/application/src/index.html');
        const expected = readFileSync(`${fixturesPath}/module/index.html`, {
          encoding: 'utf-8'
        });

        expect(normalize(actual)).toEqual(normalize(expected));
      });
    });

    describe('- Generate app.ts', () => {
      it('should should update the component template', async () => {
        const tree = await schematicRunner.runSchematic('ng-add', ngAddOptions, appTree);

        const actual = tree.readContent('/application/src/app/app.html');
        const expected = readFileSync(`${fixturesPath}/module/app/app.html`, {
          encoding: 'utf-8'
        });

        expect(normalize(actual)).toEqual(normalize(expected));
      });

      it('should should update the component class', async () => {
        const tree = await schematicRunner.runSchematic('ng-add', ngAddOptions, appTree);

        const actual = tree.readContent('/application/src/app/app.ts');
        const expected = readFileSync(`${fixturesPath}/module/app/app.ts`, {
          encoding: 'utf-8'
        });

        expect(normalize(actual)).toEqual(normalize(expected));
      });
    });

    describe('- Generate main.ts', () => {
      it('should update the main.ts', async () => {
        const tree = await schematicRunner.runSchematic('ng-add', ngAddOptions, appTree);

        const actual = tree.readContent('/application/src/main.ts');
        const expected = readFileSync(`${fixturesPath}/module/main.ts`, {
          encoding: 'utf-8'
        });

        expect(normalize(actual)).toEqual(normalize(expected));
      });
    });

    describe('- Generate app-module.ts', () => {
      it('should update the app-module.ts for CoreUI', async () => {
        const tree = await schematicRunner.runSchematic('ng-add', ngAddOptions, appTree);

        const actual = tree.readContent('/application/src/app/app-module.ts');
        const expected = readFileSync(`${fixturesPath}/module/app/core-app-module.ts`, {
          encoding: 'utf-8'
        });

        expect(normalize(actual)).toEqual(normalize(expected));
      });

      it('should update the app-module.ts for MesUI', async () => {
        const ngAddMesOptions = {
          ...ngAddOptions,
          application: 'MES'
        };

        const tree = await schematicRunner.runSchematic('ng-add', ngAddMesOptions, appTree);

        const actual = tree.readContent('/application/src/app/app-module.ts');
        const expected = readFileSync(`${fixturesPath}/module/app/mes-app-module.ts`, {
          encoding: 'utf-8'
        });

        expect(normalize(actual)).toEqual(normalize(expected));
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

    it('should have the necessary files', async () => {
      const tree = await schematicRunner.runSchematic('ng-add', ngAddOptions, appTree);

      expect(tree.files).toEqual(
        jasmine.arrayContaining([
          '/angular.json',
          '/package.json',
          '/tsconfig.json',
          '/eslint.config.js',
          '/application/tsconfig.app.json',
          '/application/tsconfig.spec.json',
          '/application/ngsw-config.json',
          '/application/eslint.config.js',
          '/application/src/main.ts',
          '/application/src/index.html',
          '/application/src/styles.css',
          '/application/src/app/app.config.ts',
          '/application/src/app/app.ts',
          '/application/src/app/app.css',
          '/application/src/app/app.html',
          '/application/src/app/app.workers.ts',
          '/application/src/assets/config.json',
          '/application/src/manifest.webmanifest'
        ])
      );
      expect(tree.files.every((x) => !x.startsWith('/application/public'))).toBeTrue();
    });

    describe('- Generate index.html', () => {
      it('should have the updated index.html', async () => {
        const tree = await schematicRunner.runSchematic('ng-add', ngAddOptions, appTree);

        const actual = tree.readContent('/application/src/index.html');
        const expected = readFileSync(`${fixturesPath}/module/index.html`, {
          encoding: 'utf-8'
        });

        expect(normalize(actual)).toEqual(normalize(expected));
      });
    });

    describe('- Generate app.ts', () => {
      it('should should update the component template', async () => {
        const tree = await schematicRunner.runSchematic('ng-add', ngAddOptions, appTree);

        const actual = tree.readContent('/application/src/app/app.html');
        const expected = readFileSync(`${fixturesPath}/standalone/app/app.html`, {
          encoding: 'utf-8'
        });

        expect(normalize(actual)).toEqual(normalize(expected));
      });

      it('should should update the component class', async () => {
        const tree = await schematicRunner.runSchematic('ng-add', ngAddOptions, appTree);

        const actual = tree.readContent('/application/src/app/app.ts');
        const expected = readFileSync(`${fixturesPath}/standalone/app/app.ts`, {
          encoding: 'utf-8'
        });

        expect(normalize(actual)).toEqual(normalize(expected));
      });
    });

    describe('- Generate workers.ts', () => {
      it('should have the updated workers.ts', async () => {
        const tree = await schematicRunner.runSchematic('ng-add', ngAddOptions, appTree);

        const actual = tree.readContent('/application/src/app/app.workers.ts');
        const expected = readFileSync(`${fixturesPath}/standalone/app/app.workers.ts`, {
          encoding: 'utf-8'
        });

        expect(normalize(actual)).toEqual(normalize(expected));
      });
    });

    describe('- Generate main.ts', () => {
      it('should update the main.ts', async () => {
        const tree = await schematicRunner.runSchematic('ng-add', ngAddOptions, appTree);

        const actual = tree.readContent('/application/src/main.ts');
        const expected = readFileSync(`${fixturesPath}/standalone/main.ts`, {
          encoding: 'utf-8'
        });

        expect(normalize(actual)).toEqual(normalize(expected));
      });
    });

    describe('- Generate app.config.ts', () => {
      it('should update the app.config.ts for CoreUI', async () => {
        const tree = await schematicRunner.runSchematic('ng-add', ngAddOptions, appTree);

        const actual = tree.readContent('/application/src/app/app.config.ts');
        const expected = readFileSync(`${fixturesPath}/standalone/app/core-app.config.ts`, {
          encoding: 'utf-8'
        });

        expect(normalize(actual)).toEqual(normalize(expected));
      });

      it('should update the app.config.ts for MesUI', async () => {
        const ngAddMesOptions = {
          ...ngAddOptions,
          application: 'MES'
        };

        const tree = await schematicRunner.runSchematic('ng-add', ngAddMesOptions, appTree);

        const actual = tree.readContent('/application/src/app/app.config.ts');
        const expected = readFileSync(`${fixturesPath}/standalone/app/mes-app.config.ts`, {
          encoding: 'utf-8'
        });

        expect(normalize(actual)).toEqual(normalize(expected));
      });
    });

    describe('- Generate angular.json', () => {
      it('should update the application builder outputPath', async () => {
        const tree = await schematicRunner.runSchematic('ng-add', ngAddOptions, appTree);

        const angularJsonContent = JSON.parse(tree.readContent('/angular.json'));
        expect(angularJsonContent.projects.application.architect.build.options.outputPath).toEqual({
          base: 'dist/application',
          browser: ''
        });
      });

      it('should have @criticalmanufacturing/ngx-schematics in schematicCollections', async () => {
        const tree = await schematicRunner.runSchematic('ng-add', ngAddOptions, appTree);

        const angularJsonContent = JSON.parse(tree.readContent('/angular.json'));
        expect(angularJsonContent.cli.schematicCollections).toContain(
          '@criticalmanufacturing/ngx-schematics'
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

      it('should update the application builder loader', async () => {
        const tree = await schematicRunner.runSchematic('ng-add', ngAddOptions, appTree);

        const angularJsonContent = JSON.parse(tree.readContent('/angular.json'));
        expect(angularJsonContent.projects.application.architect.build.options.loader).toEqual({
          '.ttf': 'file'
        });
      });
    });

    describe('- Generate package.json', () => {
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
        expect(tsConfigJsonContent.compilerOptions.preserveSymlinks).toBeTrue();
      });
    });

    describe('- Generate ngsw-config.json', () => {
      it('should update service worker config', async () => {
        const tree = await schematicRunner.runSchematic('ng-add', ngAddOptions, appTree);

        const actual = tree.readText('application/ngsw-config.json');
        const expected = readFileSync(`${fixturesPath}/ngsw-config.json`, {
          encoding: 'utf-8'
        });

        expect(normalize(actual)).toEqual(normalize(expected));
      });
    });

    describe('- Generate manifest.webmanifest', () => {
      it('should update webmanifest', async () => {
        const tree = await schematicRunner.runSchematic('ng-add', ngAddOptions, appTree);

        const actual = tree.readText('application/src/manifest.webmanifest');
        const expected = readFileSync(`${fixturesPath}/manifest.webmanifest`, {
          encoding: 'utf-8'
        });

        expect(normalize(actual)).toEqual(normalize(expected));
      });
    });
  });
});
