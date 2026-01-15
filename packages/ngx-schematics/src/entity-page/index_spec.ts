import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
import { strings } from '@criticalmanufacturing/schematics-devkit';
import { getAllFilesFromDir, normalize } from '@criticalmanufacturing/schematics-devkit/testing';
import { readFileSync } from 'node:fs';

describe('Generate Entity Page', () => {
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

  const entityPageOptions = {
    name: 'TestEntityType',
    entityType: 'TestEntityType',
    project: libraryOptions.name,
    namespace: 'TestNamespace'
  };

  const fixturesPath = `${__dirname}/fixtures`;
  const libPath = `projects/${libraryOptions.name}`;
  const libMainPath = `${libPath}/src/lib`;
  const libMetadataPath = `${libPath}/metadata/src/lib`;
  const pageName = `page-${strings.dasherize(entityPageOptions.name)}`;

  const expectedFiles = {
    page: {
      html: `${pageName}/${pageName}.component.html`,
      ts: `${pageName}/${pageName}.component.ts`
    },
    detailsView: {
      html: `${pageName}/${pageName}-details-view/${pageName}-details-view.component.html`,
      ts: `${pageName}/${pageName}-details-view/${pageName}-details-view.component.ts`
    },
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

  it('should create the entity page files', async () => {
    const tree = await schematicRunner.runSchematic('entity-page', entityPageOptions, appTree);
    const files = getAllFilesFromDir(`${libMainPath}/${pageName}`, tree);

    expect(files).toEqual(
      expect.arrayContaining([
        `${libMainPath}/${expectedFiles.page.html}`,
        `${libMainPath}/${expectedFiles.page.ts}`,
        `${libMainPath}/${expectedFiles.detailsView.html}`,
        `${libMainPath}/${expectedFiles.detailsView.ts}`
      ])
    );
  });

  it('should generate the page template file with the correct content', async () => {
    const tree = await schematicRunner.runSchematic('entity-page', entityPageOptions, appTree);
    const actual = tree.readContent(`${libMainPath}/${expectedFiles.page.html}`);
    const expected = readFileSync(`${fixturesPath}/${expectedFiles.page.html}`, {
      encoding: 'utf-8'
    });
    expect(normalize(actual).split('\n')).toEqual(normalize(expected).split('\n'));
  });

  it('should generate the page component file with the correct content', async () => {
    const tree = await schematicRunner.runSchematic('entity-page', entityPageOptions, appTree);
    const actual = tree.readContent(`${libMainPath}/${expectedFiles.page.ts}`);
    const expected = readFileSync(`${fixturesPath}/${expectedFiles.page.ts}`, {
      encoding: 'utf-8'
    });

    expect(normalize(actual).split('\n')).toEqual(normalize(expected).split('\n'));
  });

  it('should get the routes for an entity in metadata', async () => {
    const tree = await schematicRunner.runSchematic('entity-page', entityPageOptions, appTree);
    const actual = tree.readContent(`${libMetadataPath}/${expectedFiles.metadata}`);
    const expected = readFileSync(`${fixturesPath}/${expectedFiles.metadata}`, {
      encoding: 'utf-8'
    });

    expect(normalize(actual).split('\n')).toEqual(normalize(expected).split('\n'));
  });

  describe('- Generate Details View', () => {
    it('generate the details view template file with the correct content', async () => {
      const tree = await schematicRunner.runSchematic('entity-page', entityPageOptions, appTree);
      const actual = tree.readContent(`${libMainPath}/${expectedFiles.detailsView.html}`);
      const expected = readFileSync(`${fixturesPath}/${expectedFiles.detailsView.html}`, {
        encoding: 'utf-8'
      });

      expect(normalize(actual).split('\n')).toEqual(normalize(expected).split('\n'));
    });

    it('should generate the page component file with the correct content', async () => {
      const tree = await schematicRunner.runSchematic('entity-page', entityPageOptions, appTree);
      const actual = tree.readContent(`${libMainPath}/${expectedFiles.detailsView.ts}`);
      const expected = readFileSync(`${fixturesPath}/${expectedFiles.detailsView.ts}`, {
        encoding: 'utf-8'
      });

      expect(normalize(actual).split('\n')).toEqual(normalize(expected).split('\n'));
    });
  });
});
