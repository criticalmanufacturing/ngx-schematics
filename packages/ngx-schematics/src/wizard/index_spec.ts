import { strings } from '@criticalmanufacturing/schematics-devkit';
import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
import { getAllFilesFromDir, normalize } from '@criticalmanufacturing/schematics-devkit/testing';
import { readFileSync } from 'node:fs';

describe('Generate Wizard', () => {
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

  const wizardOptions = {
    name: 'TestWizard',
    entityType: 'TestEntityType',
    project: libraryOptions.name,
    namespace: 'TestNamespace'
  };

  const fixturesPath = `${__dirname}/fixtures`;
  const libPath = `projects/${libraryOptions.name}`;
  const libMainPath = `${libPath}/src/lib`;
  const libMetadataPath = `${libPath}/metadata/src/lib`;
  const wizardName = `wizard-${strings.dasherize(wizardOptions.name)}`;

  const expectedFiles = {
    wizard: `${wizardName}/${wizardName}.component`,
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

  it('should create the wizard files', async () => {
    const tree = await schematicRunner.runSchematic('wizard', wizardOptions, appTree);
    const files = getAllFilesFromDir(`${libMainPath}/${wizardName}`, tree);

    expect(files).toEqual(
      jasmine.arrayContaining([
        `${libMainPath}/${expectedFiles.wizard}.less`,
        `${libMainPath}/${expectedFiles.wizard}.html`,
        `${libMainPath}/${expectedFiles.wizard}.ts`
      ])
    );
  });

  it('should create the wizard style file with other extension', async () => {
    const options = { ...wizardOptions, style: 'css' };
    const tree = await schematicRunner.runSchematic('wizard', options, appTree);
    const files = getAllFilesFromDir(`${libMainPath}/${wizardName}`, tree);

    expect(files).toEqual(jasmine.arrayContaining([`${libMainPath}/${expectedFiles.wizard}.css`]));
  });

  it('should not create the wizard style file', async () => {
    const options = { ...wizardOptions, style: 'none' };
    const tree = await schematicRunner.runSchematic('wizard', options, appTree);
    const files = getAllFilesFromDir(`${libMainPath}/${wizardName}`, tree);

    expect(files).not.toEqual(
      jasmine.arrayContaining([`${libMainPath}/${expectedFiles.wizard}.less`])
    );
  });

  it('should generate the style file empty', async () => {
    const tree = await schematicRunner.runSchematic('wizard', wizardOptions, appTree);
    const wizardStyleContent = tree.readContent(`${libMainPath}/${expectedFiles.wizard}.less`);

    expect(wizardStyleContent).toEqual('');
  });

  it('should generate the wizard ts file with the correct content', async () => {
    const tree = await schematicRunner.runSchematic('wizard', wizardOptions, appTree);
    const actual = tree.readContent(`${libMainPath}/${expectedFiles.wizard}.ts`);
    const expected = readFileSync(`${fixturesPath}/${expectedFiles.wizard}.ts`, {
      encoding: 'utf-8'
    });

    expect(normalize(actual)).toBe(normalize(expected));
  });

  it('should generate the wizard html file with the correct content', async () => {
    const tree = await schematicRunner.runSchematic('wizard', wizardOptions, appTree);
    const actual = tree.readContent(`${libMainPath}/${expectedFiles.wizard}.html`);
    const expected = readFileSync(`${fixturesPath}/${expectedFiles.wizard}.html`, {
      encoding: 'utf-8'
    });

    expect(normalize(actual)).toBe(normalize(expected));
  });

  it('should update the metadata with a new action', async () => {
    const tree = await schematicRunner.runSchematic('wizard', wizardOptions, appTree);
    const actual = tree.readContent(`${libMetadataPath}/${expectedFiles.metadata}`);
    const expected = readFileSync(`${fixturesPath}/${expectedFiles.metadata}`, {
      encoding: 'utf-8'
    });

    expect(normalize(actual)).toBe(normalize(expected));
  });
});
