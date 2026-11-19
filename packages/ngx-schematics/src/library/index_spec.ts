import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
import { parse } from 'jsonc-parser';
import { getAllFilesFromDir, normalize } from '@criticalmanufacturing/schematics-devkit/testing';
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

  it.each([false, true])(
    'should only reference declared localization types with --skipPackageJson (declared: %s)',
    async (hasLocalize) => {
      const packageJson = getFileContent(appTree, 'package.json');
      if (hasLocalize) {
        packageJson.dependencies['@angular/localize'] = '^22.3.0';
        appTree.overwrite('package.json', JSON.stringify(packageJson));
      }

      const tree = await schematicRunner.runSchematic(
        'library',
        { ...libraryOptions, skipPackageJson: true, skipMetadata: true, skipInstall: true },
        appTree
      );

      expect(getFileContent(tree, `${libPath}/tsconfig.lib.json`).compilerOptions.types).toEqual(
        hasLocalize ? ['@angular/localize'] : []
      );
      expect(getFileContent(tree, 'package.json')).toEqual(packageJson);
    }
  );

  describe('With standalone', () => {
    beforeEach(async () => {
      appTree = await schematicRunner.runExternalSchematic(
        '@schematics/angular',
        'application',
        appOptions,
        appTree
      );
    });

    it('should preserve existing files in the build output', async () => {
      const tree = await schematicRunner.runSchematic('library', libraryOptions, appTree);
      const workspace = getFileContent(tree, '/angular.json');
      const build = workspace.projects[libraryOptions.name].architect.build;

      expect(build.builder).toBe('@angular/build:library');
      expect(build.options.deleteOutputPath).toBe(false);
      expect(tree.exists(`${libPath}/ng-package.json`)).toBe(false);
    });

    it('should create a tsconfig for library', async () => {
      const tree = await schematicRunner.runSchematic('library', libraryOptions, appTree);
      const fileContent = getFileContent(tree, `${libPath}/tsconfig.lib.json`);
      expect(fileContent).toBeDefined();
      expect(fileContent.include).toEqual(['**/*.ts']);
      expect(fileContent.compilerOptions.types).toContain('@angular/localize');
      expect(getFileContent(tree, 'tsconfig.json').include).toBeUndefined();
    });

    describe('should create the metadata secondary entry point', () => {
      it('should create the library files', async () => {
        const tree = await schematicRunner.runSchematic('library', libraryOptions, appTree);
        const files = getAllFilesFromDir(`${libPath}/metadata`, tree);

        expect(files).toEqual(
          expect.arrayContaining([
            `${libPath}/metadata/src/public-api.ts`,
            `${libPath}/metadata/src/lib/${libraryOptions.name}-metadata.module.ts`,
            `${libPath}/metadata/src/lib/${libraryOptions.name}-metadata.service.ts`
          ])
        );
      });

      it('should register the primary and metadata entry points in package.json', async () => {
        const tree = await schematicRunner.runSchematic('library', libraryOptions, appTree);
        const packageJson = getFileContent(tree, `${libPath}/package.json`);

        expect(packageJson.exports).toEqual({
          '.': './src/public-api.ts',
          './metadata': './metadata/src/public-api.ts'
        });
        expect(tree.exists(`${libPath}/metadata/ng-package.json`)).toBe(false);
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

      it('should preserve existing TypeScript paths for metadata', async () => {
        const metadataImport = `${libraryOptions.name}/metadata`;
        const rootTsConfig = getFileContent(appTree, 'tsconfig.json');
        rootTsConfig.compilerOptions.paths = { [metadataImport]: ['./custom/metadata'] };
        appTree.overwrite('tsconfig.json', JSON.stringify(rootTsConfig));

        const tree = await schematicRunner.runSchematic('library', libraryOptions, appTree);

        expect(getFileContent(tree, 'tsconfig.json').compilerOptions.paths[metadataImport]).toEqual(
          ['./custom/metadata', `./dist/${libraryOptions.name}/metadata`]
        );
      });

      it('should configure metadata for a scoped library', async () => {
        const name = '@test/test-lib';
        const tree = await schematicRunner.runSchematic('library', { name }, appTree);
        const tsConfigJson = getFileContent(tree, 'tsconfig.json');

        expect(tsConfigJson.compilerOptions.paths[`${name}/metadata`]).toEqual([
          './dist/test/test-lib/metadata'
        ]);
        expect(
          tree.readText('projects/test/test-lib/metadata/src/lib/test-lib-metadata.module.ts')
        ).toContain('function provideTestLib()');
        const appConfig = tree.readText('projects/app/src/app/app.config.ts');
        expect(appConfig).toContain(`${name}/metadata`);
        expect(appConfig).toContain('provideTestLib()');
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
        const packageJson = getFileContent(tree, `${libPath}/package.json`);
        const tsConfigJson = getFileContent(tree, 'tsconfig.json');
        expect(tree.exists(`${libPath}/metadata/src/public-api.ts`)).toBe(false);
        expect(packageJson.exports['./metadata']).toBeUndefined();
        expect(
          tsConfigJson.compilerOptions.paths[`${libraryOptions.name}/metadata`]
        ).toBeUndefined();
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
