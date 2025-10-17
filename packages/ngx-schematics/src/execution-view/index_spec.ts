import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
import { strings } from '@criticalmanufacturing/schematics-devkit';
import { getAllFilesFromDir, normalize } from '@criticalmanufacturing/schematics-devkit/testing';
import { readFileSync } from 'node:fs';

describe('Generate Execution View', () => {
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

  const executionViewOptions = {
    name: 'TestExecutionView',
    entityType: 'TestEntityType',
    project: libraryOptions.name,
    namespace: 'TestNamespace'
  };

  const fixturesPath = `${__dirname}/fixtures`;
  const libPath = `projects/${libraryOptions.name}`;
  const libMainPath = `${libPath}/src/lib`;
  const libMetadataPath = `${libPath}/metadata/src/lib`;
  const executionViewName = `wizard-${strings.dasherize(executionViewOptions.name)}`;

  const expectedFiles = {
    executionView: `${executionViewName}/${executionViewName}.component`,
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

  it('should create the execution view files', async () => {
    const tree = await schematicRunner.runSchematic(
      'execution-view',
      executionViewOptions,
      appTree
    );
    const files = getAllFilesFromDir(`${libMainPath}/${executionViewName}`, tree);

    expect(files).toEqual(
      jasmine.arrayContaining([
        `${libMainPath}/${expectedFiles.executionView}.html`,
        `${libMainPath}/${expectedFiles.executionView}.ts`,
        `${libMainPath}/${expectedFiles.executionView}.less`
      ])
    );
  });

  it('should create the execution view style file with other extension', async () => {
    const options = { ...executionViewOptions, style: 'css' };
    const tree = await schematicRunner.runSchematic('execution-view', options, appTree);
    const files = getAllFilesFromDir(`${libMainPath}/${executionViewName}`, tree);

    expect(files).toEqual(
      jasmine.arrayContaining([`${libMainPath}/${expectedFiles.executionView}.css`])
    );
  });

  it('should not create the execution view style file', async () => {
    const options = { ...executionViewOptions, style: 'none' };
    const tree = await schematicRunner.runSchematic('execution-view', options, appTree);
    const files = getAllFilesFromDir(`${libMainPath}/${executionViewName}`, tree);

    expect(files).not.toEqual(
      jasmine.arrayContaining([`${libMainPath}/${expectedFiles.executionView}.less`])
    );
  });

  it('should generate the style file empty', async () => {
    const tree = await schematicRunner.runSchematic(
      'execution-view',
      executionViewOptions,
      appTree
    );
    const actual = tree.readContent(`${libMainPath}/${expectedFiles.executionView}.less`);

    expect(actual).toEqual('');
  });

  it('should generate the execution view html file with the correct content', async () => {
    const tree = await schematicRunner.runSchematic(
      'execution-view',
      executionViewOptions,
      appTree
    );
    const actual = tree.readContent(`${libMainPath}/${expectedFiles.executionView}.html`);
    const expected = readFileSync(`${fixturesPath}/${expectedFiles.executionView}.html`, {
      encoding: 'utf-8'
    });

    expect(normalize(actual)).toBe(normalize(expected));
  });

  it('should generate the execution view ts file with the correct content', async () => {
    const tree = await schematicRunner.runSchematic(
      'execution-view',
      executionViewOptions,
      appTree
    );
    const actual = tree.readContent(`${libMainPath}/${expectedFiles.executionView}.ts`);
    const expected = readFileSync(`${fixturesPath}/${expectedFiles.executionView}.ts`, {
      encoding: 'utf-8'
    });

    expect(normalize(actual)).toBe(normalize(expected));
  });

  it('should update the metadata with a new action', async () => {
    const tree = await schematicRunner.runSchematic(
      'execution-view',
      executionViewOptions,
      appTree
    );
    const actual = tree.readContent(`${libMetadataPath}/${expectedFiles.metadata}`);
    const expected = readFileSync(`${fixturesPath}/${expectedFiles.metadata}`, {
      encoding: 'utf-8'
    });

    expect(normalize(actual)).toBe(normalize(expected));
  });
});
