import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
import { parse } from 'jsonc-parser';
import { getAllFilesFromDir, normalize } from '@criticalmanufacturing/schematics-devkit/testing';
import { JsonObject } from '@angular-devkit/core';
import { readFileSync } from 'node:fs';

function getFileContent(tree: UnitTestTree, path: string): any {
  const content = tree.readContent(path).toString();
  return parse(content, undefined, { allowTrailingComma: true });
}

describe('Generate Library', () => {
  const schematicRunner = new SchematicTestRunner(
    '@criticalmanufacturing/ngx-schematics',
    require.resolve('../collection.json')
  );

  const workspaceOptions = {
    name: 'workspace',
    newProjectRoot: 'projects',
    version: '10.0.0'
  };

  const appOptions = {
    name: 'app',
    inlineStyle: false,
    inlineTemplate: false,
    routing: false,
    skipTests: false,
    skipPackageJson: false
  };

  const libraryOptions = {
    name: 'test-lib',
    entryFile: 'public-api',
    skipPackageJson: false,
    skipTsConfig: false,
    skipInstall: false,
    skipMetadata: false
  };

  const fixturesPath = `${__dirname}/fixtures`;
  const libPath = `projects/${libraryOptions.name}`;

  let appTree: UnitTestTree;

  beforeEach(async () => {
    appTree = await schematicRunner.runExternalSchematic(
      '@schematics/angular',
      'workspace',
      workspaceOptions
    );
  });

  describe('With standalone', () => {
    beforeEach(async () => {
      appTree = await schematicRunner.runExternalSchematic(
        '@schematics/angular',
        'application',
        appOptions,
        appTree
      );
    });

    it('should update the root ng-package.json', async () => {
      const options = { ...libraryOptions };

      const tree = await schematicRunner.runSchematic('library', options, appTree);
      expect(
        (tree.readJson(`projects/${libraryOptions.name}/ng-package.json`) as JsonObject)[
          'deleteDestPath'
        ]
      ).toEqual(false);
    });

    it('should create a tsconfig for library', async () => {
      const tree = await schematicRunner.runSchematic('library', libraryOptions, appTree);
      const fileContent = getFileContent(tree, `${libPath}/tsconfig.lib.json`);
      expect(fileContent).toBeDefined();
      expect(fileContent.include).toEqual(['**/*.ts']);
    });

    describe('should create the metadata secundary entry point', () => {
      it('should create the library files', async () => {
        const tree = await schematicRunner.runSchematic('library', libraryOptions, appTree);
        const files = getAllFilesFromDir(`${libPath}/metadata`, tree);

        expect(files).toEqual(
          expect.arrayContaining([
            `${libPath}/metadata/ng-package.json`,
            `${libPath}/metadata/src/public-api.ts`,
            `${libPath}/metadata/src/lib/${libraryOptions.name}-metadata.module.ts`,
            `${libPath}/metadata/src/lib/${libraryOptions.name}-metadata.service.ts`
          ])
        );
      });

      it('should create a ng-package.json in the metadata entry-point', async () => {
        const tree = await schematicRunner.runSchematic('library', libraryOptions, appTree);

        const actual = tree.readText(`${libPath}/metadata/ng-package.json`);
        const expected = readFileSync(`${fixturesPath}/metadata/ng-package.json`, {
          encoding: 'utf-8'
        });

        expect(normalize(actual)).toEqual(normalize(expected));
      });

      it('should create a public-api in the metadata entry-point', async () => {
        const tree = await schematicRunner.runSchematic('library', libraryOptions, appTree);

        const actual = tree.readText(`${libPath}/metadata/src/public-api.ts`);
        const expected = readFileSync(`${fixturesPath}/metadata/src/public-api.ts`, {
          encoding: 'utf-8'
        });

        expect(normalize(actual)).toEqual(normalize(expected));
      });

      it('should create a metadata module in the metadata entry-point', async () => {
        const tree = await schematicRunner.runSchematic('library', libraryOptions, appTree);

        const actual = tree.readText(
          `${libPath}/metadata/src/lib/${libraryOptions.name}-metadata.module.ts`
        );
        const expected = readFileSync(
          `${fixturesPath}//metadata/src/lib/${libraryOptions.name}-metadata.module.ts`,
          {
            encoding: 'utf-8'
          }
        );

        expect(normalize(actual)).toEqual(normalize(expected));
      });

      it('should create a metadata service in the metadata entry-point', async () => {
        const tree = await schematicRunner.runSchematic('library', libraryOptions, appTree);

        const actual = tree.readText(
          `${libPath}/metadata/src/lib/${libraryOptions.name}-metadata.service.ts`
        );
        const expected = readFileSync(
          `${fixturesPath}//metadata/src/lib/${libraryOptions.name}-metadata.service.ts`,
          {
            encoding: 'utf-8'
          }
        );

        expect(normalize(actual)).toEqual(normalize(expected));
      });

      it(`should add paths mapping to empty tsconfig`, async () => {
        const tree = await schematicRunner.runSchematic('library', libraryOptions, appTree);

        const tsConfigJson = getFileContent(tree, 'tsconfig.json');
        expect(tsConfigJson.compilerOptions.paths[`${libraryOptions.name}/metadata`]).toEqual([
          `./dist/${libraryOptions.name}/metadata`
        ]);
      });

      it(`should not modify the file when --skipTsConfig`, async () => {
        const tree = await schematicRunner.runSchematic(
          'library',
          {
            name: 'test-skip-tsconfig',
            skipTsConfig: true
          },
          appTree
        );

        const tsConfigJson = getFileContent(tree, 'tsconfig.json');
        expect(tsConfigJson.compilerOptions.paths).toBeUndefined();
      });

      it('should not add the metadata sub-entry', async () => {
        const options = { ...libraryOptions, skipMetadata: true };

        const tree = await schematicRunner.runSchematic('library', options, appTree);
        const files = getAllFilesFromDir(`projects/${libraryOptions.name}`, tree);
        expect(files).not.toEqual(
          expect.arrayContaining([
            `projects/${libraryOptions.name}/metadata/ng-package.json`,
            `projects/${libraryOptions.name}/metadata/src/public-api.ts`,
            `projects/${libraryOptions.name}/metadata/src/lib/${libraryOptions.name}-metadata.module.ts`,
            `projects/${libraryOptions.name}/metadata/src/lib/${libraryOptions.name}-metadata.service.ts`
          ])
        );
      });

      it('should update the app.config.ts', async () => {
        const options = { ...libraryOptions };

        const tree = await schematicRunner.runSchematic('library', options, appTree);
        expect(tree.readText(`/projects/app/src/app/app.config.ts`)).toContain(`provideTestLib()`);
      });
    });

    describe('should update the angular.json', () => {
      it(`should add library to workspace`, async () => {
        const tree = await schematicRunner.runSchematic('library', libraryOptions, appTree);

        const workspace = getFileContent(tree, '/angular.json');
        expect(workspace.projects['test-lib']).toBeDefined();
      });

      it('should set the prefix to lib if none is set', async () => {
        const tree = await schematicRunner.runSchematic('library', libraryOptions, appTree);

        const workspace = JSON.parse(tree.readContent('/angular.json'));
        expect(workspace.projects['test-lib'].prefix).toEqual('lib');
      });

      it('should set the prefix correctly', async () => {
        const prefix = 'test-prefix';

        const options = { ...libraryOptions, prefix: prefix };
        const tree = await schematicRunner.runSchematic('library', options, appTree);

        const workspace = JSON.parse(tree.readContent('/angular.json'));
        expect(workspace.projects['test-lib'].prefix).toEqual(prefix);
      });
    });
  });

  describe('Without standalone', () => {
    beforeEach(async () => {
      appTree = await schematicRunner.runExternalSchematic(
        '@schematics/angular',
        'application',
        { ...appOptions, standalone: false },
        appTree
      );
    });

    it('should update the app-module.ts', async () => {
      const options = { ...libraryOptions };

      const tree = await schematicRunner.runSchematic('library', options, appTree);
      expect(tree.readText(`/projects/app/src/app/app-module.ts`)).toContain(
        `TestLibMetadataModule`
      );
    });
  });
});
