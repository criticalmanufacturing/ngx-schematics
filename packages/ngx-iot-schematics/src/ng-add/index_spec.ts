import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
import { parse } from 'jsonc-parser';

describe('Test ng-add', () => {
  const schematicRunner = new SchematicTestRunner(
    '@criticalmanufacturing/ngx-iot-schematics',
    require.resolve('../collection.json')
  );

  const workspaceOptions = { name: 'workspace', version: '10.0.0' };

  const appOptions = {
    name: 'application',
    inlineStyle: false,
    inlineTemplate: false,
    routing: false,
    skipTests: false,
    skipPackageJson: false,
    zoneless: false
  };

  const ngAddOptions = { project: 'application', application: 'Core', version: 'dev' };

  let appTree: UnitTestTree;

  beforeEach(async () => {
    appTree = await schematicRunner.runExternalSchematic(
      '@schematics/angular',
      'workspace',
      workspaceOptions
    );

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
      expect.arrayContaining([
        '/angular.json',
        '/package.json',
        '/README.md',
        '/tsconfig.json',
        '/.editorconfig',
        '/.gitignore',
        '/eslint.config.js',
        '/.vscode/extensions.json',
        '/.vscode/launch.json',
        '/.vscode/tasks.json',
        '/application/tsconfig.app.json',
        '/application/tsconfig.spec.json',
        '/application/eslint.config.js',
        '/application/src/main.ts',
        '/application/src/index.html',
        '/application/src/styles.css',
        '/application/src/app/app.spec.ts',
        '/application/src/app/app.ts',
        '/application/src/app/app.css',
        '/application/src/app/app.html',
        '/application/src/app/app.config.ts'
      ])
    );
  });

  describe('- Generate angular.json', () => {
    it('should have @criticalmanufacturing/ngx-iot-schematics in schematicCollections', async () => {
      const tree = await schematicRunner.runSchematic('ng-add', ngAddOptions, appTree);

      const angularJsonContent = JSON.parse(tree.readContent('/angular.json'));
      expect(angularJsonContent.cli.schematicCollections).toContain(
        '@criticalmanufacturing/ngx-iot-schematics'
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
      ).toEqual(expect.arrayContaining(['application/**/*.ts', 'application/**/*.html']));
    });
  });

  describe('- Generate package.json', () => {
    it('should have the lint script', async () => {
      const tree = await schematicRunner.runSchematic('ng-add', ngAddOptions, appTree);

      const packageJsonContent = JSON.parse(tree.readContent('/package.json'));
      expect(packageJsonContent.scripts.lint).toBeDefined();
      expect(packageJsonContent.scripts.lint).toBe('npm run lint -ws');
    });
  });

  describe('- Generate tsconfig.json', () => {
    it('should have new configs', async () => {
      const tree = await schematicRunner.runSchematic('ng-add', ngAddOptions, appTree);

      const tsConfigJsonContent = parse(tree.readContent('/tsconfig.json'));
      expect(tsConfigJsonContent.compilerOptions.noImplicitAny).toBeFalsy();
      expect(tsConfigJsonContent.compilerOptions.strictFunctionTypes).toBeFalsy();
      expect(tsConfigJsonContent.compilerOptions.strictNullChecks).toBeFalsy();
    });
  });
});
