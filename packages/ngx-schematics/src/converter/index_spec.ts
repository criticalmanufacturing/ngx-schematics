import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
import { strings } from '@criticalmanufacturing/schematics-devkit';
import { getAllFilesFromDir, normalize } from '@criticalmanufacturing/schematics-devkit/testing';
import { readFileSync } from 'node:fs';

describe('Generate Converter', () => {
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
    skipPackageJson: false,
    skipTsConfig: false,
    skipInstall: false
  };

  const converterOptions = {
    name: 'test',
    path: `projects/${libraryOptions.name}/src/lib`,
    project: libraryOptions.name
  };

  const fixturesPath = `${__dirname}/fixtures`;
  const libPath = `projects/${libraryOptions.name}`;
  const libMainPath = `${libPath}/src/lib`;
  const libMetadataPath = `${libPath}/metadata/src/lib`;
  const converterName = `${strings.dasherize(converterOptions.name)}-converter`;

  const expectedFiles = {
    converter: `${converterName}/${converterName}.pipe.ts`,
    metadata: `${strings.dasherize(libraryOptions.name)}-metadata.service.ts`
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

    appTree = await schematicRunner.runSchematic('library', libraryOptions, appTree);
  });

  it('should create the converter files', async () => {
    const tree = await schematicRunner.runSchematic('converter', converterOptions, appTree);
    const files = getAllFilesFromDir(`${libMainPath}/${converterName}`, tree);

    expect(files).toEqual(expect.arrayContaining([`${libMainPath}/${expectedFiles.converter}`]));
  });

  it('should generate the converter file with the correct content', async () => {
    const tree = await schematicRunner.runSchematic('converter', converterOptions, appTree);
    const actual = tree.readContent(`${libMainPath}/${expectedFiles.converter}`);
    const expected = readFileSync(`${fixturesPath}/${expectedFiles.converter}`, {
      encoding: 'utf-8'
    });

    expect(normalize(actual)).toBe(normalize(expected));
  });

  it('should add the converter to the metadata', async () => {
    const tree = await schematicRunner.runSchematic('converter', converterOptions, appTree);
    const actual = tree.readContent(`${libMetadataPath}/${expectedFiles.metadata}`);
    const expected = readFileSync(`${fixturesPath}/${expectedFiles.metadata}`, {
      encoding: 'utf-8'
    });

    expect(normalize(actual)).toBe(normalize(expected));
  });
});
