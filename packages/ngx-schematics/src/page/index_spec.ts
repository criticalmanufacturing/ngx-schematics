import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
import { strings } from '@criticalmanufacturing/schematics-devkit';
import { getAllFilesFromDir, normalize } from '@criticalmanufacturing/schematics-devkit/testing';
import { readFileSync } from 'node:fs';

describe('Generate Page', () => {
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

  const pageOptions = {
    name: 'TestPage',
    project: libraryOptions.name,
    pageId: 'Test.PageTest',
    iconClass: 'icon-test',
    menuGroupId: 'TestMenuGroup',
    menuSubGroupId: ''
  };

  const fixturesPath = `${__dirname}/fixtures`;
  const libPath = `projects/${libraryOptions.name}`;
  const libMainPath = `${libPath}/src/lib`;
  const libMetadataPath = `${libPath}/metadata/src/lib`;
  const pageName = `page-${strings.dasherize(pageOptions.name)}`;

  const expectedFiles = {
    page: `${pageName}/${pageName}.component`,
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

  it('should create the page files', async () => {
    const tree = await schematicRunner.runSchematic('page', pageOptions, appTree);
    const files = getAllFilesFromDir(`${libMainPath}/${pageName}`, tree);

    expect(files).toEqual(
      jasmine.arrayContaining([
        `${libMainPath}/${expectedFiles.page}.html`,
        `${libMainPath}/${expectedFiles.page}.ts`,
        `${libMainPath}/${expectedFiles.page}.less`
      ])
    );
  });

  it('should generate the page html file with the correct content', async () => {
    const tree = await schematicRunner.runSchematic('page', pageOptions, appTree);
    const actual = tree.readContent(`${libMainPath}/${expectedFiles.page}.html`);
    const expected = readFileSync(`${fixturesPath}/${expectedFiles.page}.html`, {
      encoding: 'utf-8'
    });

    expect(normalize(actual).split('\n')).toEqual(normalize(expected).split('\n'));
  });

  it('should generate the page ts file with the correct content', async () => {
    const tree = await schematicRunner.runSchematic('page', pageOptions, appTree);
    const actual = tree.readContent(`${libMainPath}/${expectedFiles.page}.ts`);
    const expected = readFileSync(`${fixturesPath}/${expectedFiles.page}.ts`, {
      encoding: 'utf-8'
    });

    expect(normalize(actual).split('\n')).toEqual(normalize(expected).split('\n'));
  });

  it('should update the metadata with a new action', async () => {
    const tree = await schematicRunner.runSchematic('page', pageOptions, appTree);
    const actual = tree.readContent(`${libMetadataPath}/${expectedFiles.metadata}`);
    const expected = readFileSync(`${fixturesPath}/${expectedFiles.metadata}`, {
      encoding: 'utf-8'
    });

    expect(normalize(actual).split('\n')).toEqual(normalize(expected).split('\n'));
  });
});
