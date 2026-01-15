import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
import { parse } from 'jsonc-parser';
import { getAllFilesFromDir } from '@criticalmanufacturing/schematics-devkit/testing';

function getFileContent(tree: UnitTestTree, path: string): any {
  const content = tree.readContent(path).toString();
  return parse(content, undefined, { allowTrailingComma: true });
}

describe('Generate Library', () => {
  const schematicRunner = new SchematicTestRunner(
    '@criticalmanufacturing/ngx-iot-schematics',
    require.resolve('../collection.json')
  );

  const workspaceOptions = { name: 'workspace', newProjectRoot: 'projects', version: '10.0.0' };

  const appOptions = {
    name: 'app',
    inlineStyle: false,
    inlineTemplate: false,
    routing: false,
    skipTests: false,
    skipPackageJson: false
  };

  const libraryOptions = {
    name: 'testlib',
    skipPackageJson: false,
    skipTsConfig: false,
    skipInstall: false,
    namespace: '@testlib'
  };

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

  it('should create the library files', async () => {
    const tree = await schematicRunner.runSchematic('library', libraryOptions, appTree);

    const files = getAllFilesFromDir(`projects/${libraryOptions.name}`, tree);

    expect(files).toEqual(
      expect.arrayContaining([
        `projects/${libraryOptions.name}/src/lib/tasks/${libraryOptions.name}/${libraryOptions.name}-settings.component.html`,
        `projects/${libraryOptions.name}/src/lib/tasks/${libraryOptions.name}/${libraryOptions.name}-settings.component.ts`,
        `projects/${libraryOptions.name}/src/lib/tasks/${libraryOptions.name}/${libraryOptions.name}-settings.component.less`,
        `projects/${libraryOptions.name}/src/lib/tasks/${libraryOptions.name}/${libraryOptions.name}.task-designer.ts`,
        `projects/${libraryOptions.name}/src/lib/tasks/${libraryOptions.name}/${libraryOptions.name}.task-module.ts`,
        `projects/${libraryOptions.name}/src/lib/tasks/${libraryOptions.name}/${libraryOptions.name}.task.ts`,

        `projects/${libraryOptions.name}/test/unit/tasks/${libraryOptions.name}/${libraryOptions.name}.task.test.ts`,

        `projects/${libraryOptions.name}/src/public-api-designer.ts`,
        `projects/${libraryOptions.name}/src/public-api-runtime.ts`,

        `projects/${libraryOptions.name}/metadata/src/lib/metadata.ts`,
        `projects/${libraryOptions.name}/metadata/src/public-api.ts`,
        `projects/${libraryOptions.name}/metadata/ng-package.json`,

        `projects/${libraryOptions.name}/test/unit/tsconfig.json`,

        `projects/${libraryOptions.name}/tsconfig.spec.json`,
        `projects/${libraryOptions.name}/tsconfig.lib.json`,
        `projects/${libraryOptions.name}/tsconfig.lib.prod.json`,
        `projects/${libraryOptions.name}/tsconfig.lib.runtime.json`,
        `projects/${libraryOptions.name}/ng-package.json`,
        `projects/${libraryOptions.name}/packConfig.json`,
        `projects/${libraryOptions.name}/package.json`,

        `projects/${libraryOptions.name}/.gitignore`,
        `projects/${libraryOptions.name}/README.md`
      ])
    );
  });

  it('should create a package.json having as name the library name', async () => {
    const tree = await schematicRunner.runSchematic('library', libraryOptions, appTree);
    const fileContent = getFileContent(tree, `/projects/${libraryOptions.name}/package.json`);
    expect(fileContent).not.toBeNull();
    expect(fileContent.name).toMatch(libraryOptions.name);
  });

  it('should create a tsconfig for library', async () => {
    const tree = await schematicRunner.runSchematic('library', libraryOptions, appTree);
    const fileContent = getFileContent(tree, `/projects/${libraryOptions.name}/tsconfig.lib.json`);
    expect(fileContent).toBeDefined();
  });

  it(`should have a linter in the package.json`, async () => {
    const tree = await schematicRunner.runSchematic('library', libraryOptions, appTree);

    const packageJsonContent = getFileContent(
      tree,
      `/projects/${libraryOptions.name}/package.json`
    );
    expect(packageJsonContent.scripts.lint).toBeDefined();
    expect(packageJsonContent.scripts.lint).toBe('ng lint');
  });

  it('should use default value for baseDir and entryFile', async () => {
    const name = 'test-default-values';
    const namespace = '@testlib';

    const tree = await schematicRunner.runSchematic(
      'library',
      { name: name, namespace: namespace },
      appTree
    );
    expect(tree.files).toContain(`/projects/${name}/src/public-api-designer.ts`);
    expect(tree.files).toContain(`/projects/${name}/src/public-api-runtime.ts`);
  });

  it(`should add library to workspace`, async () => {
    const tree = await schematicRunner.runSchematic('library', libraryOptions, appTree);

    const workspace = getFileContent(tree, '/angular.json');
    expect(workspace.projects.testlib).toBeDefined();
  });

  it('should set the prefix to lib if none is set', async () => {
    const tree = await schematicRunner.runSchematic('library', libraryOptions, appTree);

    const workspace = JSON.parse(tree.readContent('/angular.json'));
    expect(workspace.projects.testlib.prefix).toEqual('lib');
  });

  it('should set the prefix correctly', async () => {
    const prefix = 'test-prefix';

    const options = { ...libraryOptions, prefix: prefix };
    const tree = await schematicRunner.runSchematic('library', options, appTree);

    const workspace = JSON.parse(tree.readContent('/angular.json'));
    expect(workspace.projects.testlib.prefix).toEqual(prefix);
  });

  it(`should add ng-packagr to devDependencies`, async () => {
    const tree = await schematicRunner.runSchematic('library', libraryOptions, appTree);

    const packageJson = getFileContent(tree, 'package.json');
    expect(packageJson.devDependencies['ng-packagr']).toBeDefined();
  });

  it(`should not modify the file when --skipPackageJson`, async () => {
    const namespace = '@testlib';
    const tree = await schematicRunner.runSchematic(
      'library',
      { name: 'test-skip-package-json', skipPackageJson: true, namespace: namespace },
      appTree
    );

    const packageJson = getFileContent(tree, 'package.json');
    expect(packageJson.devDependencies['ng-packagr']).toBeUndefined();
  });

  it(`should add paths mapping to empty tsconfig`, async () => {
    const tree = await schematicRunner.runSchematic('library', libraryOptions, appTree);

    const tsConfigJson = getFileContent(tree, 'tsconfig.json');
    expect(tsConfigJson.compilerOptions.paths[`${libraryOptions.name}`]).toEqual([
      `./dist/${libraryOptions.name}`
    ]);
  });

  it(`should not modify the file when --skipTsConfig`, async () => {
    const namespace = '@testlib';
    const tree = await schematicRunner.runSchematic(
      'library',
      { name: 'test-skip-tsconfig', skipTsConfig: true, namespace: namespace },
      appTree
    );

    const tsConfigJson = getFileContent(tree, 'tsconfig.json');
    expect(tsConfigJson.compilerOptions.paths).toBeUndefined();
  });
});
