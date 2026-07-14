import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
import { strings } from '@criticalmanufacturing/schematics-devkit';
import { getAllFilesFromDir, normalize } from '@criticalmanufacturing/schematics-devkit/testing';
import { readFileSync } from 'node:fs';

describe('Generate Converter', () => {
  const schematicRunner = new SchematicTestRunner(
    '@criticalmanufacturing/ngx-iot-schematics',
    require.resolve('../collection.json')
  );

  const workspaceOptions = {
    name: 'workspace',
    newProjectRoot: 'projects',
    version: '12.0.0'
  };

  const libraryOptions = {
    name: 'testlib',
    skipPackageJson: false,
    skipTsConfig: false,
    skipInstall: false,
    namespace: '@testlib'
  };

  const converterOptions = {
    name: 'TestConverter',
    project: libraryOptions.name
  };

  const fixturesPath = `${__dirname}/fixtures`;
  const libPath = `projects/${libraryOptions.name}`;
  const libMainPath = `${libPath}/src/lib`;
  const converterName = `${strings.dasherize(converterOptions.name)}`;

  const expectedFiles = {
    converter: `${converterName}/${converterName}`
  };

  let appTree: UnitTestTree;

  beforeEach(async () => {
    appTree = await schematicRunner.runExternalSchematic(
      '@schematics/angular',
      'workspace',
      workspaceOptions
    );

    appTree = await schematicRunner.runSchematic('library', libraryOptions, appTree);
  });

  it('should create the converter files', async () => {
    const tree = await schematicRunner.runSchematic('converter', converterOptions, appTree);
    const files = getAllFilesFromDir(`${libMainPath}/converters/${converterName}`, tree);

    expect(files).toEqual(
      expect.arrayContaining([
        `${libMainPath}/converters/${expectedFiles.converter}.converter-designer.ts`,
        `${libMainPath}/converters/${expectedFiles.converter}.converter.ts`
      ])
    );
  });

  it('should generate the converter designer ts file with the correct content', async () => {
    const tree = await schematicRunner.runSchematic('converter', converterOptions, appTree);
    const actual = tree.readContent(
      `${libMainPath}/converters/${expectedFiles.converter}.converter-designer.ts`
    );
    const expected = readFileSync(
      `${fixturesPath}/${expectedFiles.converter}.converter-designer.ts`,
      {
        encoding: 'utf-8'
      }
    );

    expect(normalize(actual)).toEqual(normalize(expected));
  });

  it('should generate the converter ts file with the correct content', async () => {
    const tree = await schematicRunner.runSchematic('converter', converterOptions, appTree);
    const actual = tree.readContent(
      `${libMainPath}/converters/${expectedFiles.converter}.converter.ts`
    );
    const expected = readFileSync(`${fixturesPath}/${expectedFiles.converter}.converter.ts`, {
      encoding: 'utf-8'
    });

    expect(normalize(actual)).toEqual(normalize(expected));
  });

  it('should update the public-api-designer.ts file with the correct content', async () => {
    const tree = await schematicRunner.runSchematic('converter', converterOptions, appTree);
    const actual = tree.readContent(`${libPath}/src/public-api-designer.ts`);
    const expected = readFileSync(`${fixturesPath}/public-api-designer.ts`, {
      encoding: 'utf-8'
    });

    expect(normalize(actual)).toEqual(normalize(expected));
  });

  it('should update the public-api-runtime.ts file with the correct content', async () => {
    const tree = await schematicRunner.runSchematic('converter', converterOptions, appTree);
    const actual = tree.readContent(`${libPath}/src/public-api-runtime.ts`);
    const expected = readFileSync(`${fixturesPath}/public-api-runtime.ts`, {
      encoding: 'utf-8'
    });

    expect(normalize(actual)).toEqual(normalize(expected));
  });

  it('should update the metadata.ts file with the correct content', async () => {
    const tree = await schematicRunner.runSchematic('converter', converterOptions, appTree);
    const actual = tree.readContent(`${libPath}/metadata/src/lib/metadata.ts`);
    const expected = readFileSync(`${fixturesPath}/metadata.ts`, {
      encoding: 'utf-8'
    });

    expect(normalize(actual)).toEqual(normalize(expected));
  });
});
