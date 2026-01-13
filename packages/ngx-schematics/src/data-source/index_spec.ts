import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
import { getAllFilesFromDir, normalize } from '@criticalmanufacturing/schematics-devkit/testing';
import { strings } from '@criticalmanufacturing/schematics-devkit';
import { readFileSync } from 'node:fs';

describe('Generate Data Source', () => {
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

  const dataSourceOptions = {
    name: 'test',
    project: libraryOptions.name,
    style: 'less'
  };

  const fixturesPath = `${__dirname}/fixtures`;
  const libPath = `projects/${libraryOptions.name}`;
  const libMainPath = `${libPath}/src/lib`;
  const libMetadataPath = `${libPath}/metadata/src/lib`;
  const dataSourceName = `${strings.dasherize(dataSourceOptions.name)}-data-source`;

  const expectedFiles = {
    dataSource: `${dataSourceName}/${dataSourceName}.service.ts`,
    dataSourceSettings: `${dataSourceName}/${dataSourceName}-settings/${dataSourceName}-settings.component`,
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

  it('should create the data source files', async () => {
    const tree = await schematicRunner.runSchematic('data-source', dataSourceOptions, appTree);
    const files = getAllFilesFromDir(`${libMainPath}/${dataSourceName}`, tree);

    expect(files).toEqual(jasmine.arrayContaining([`${libMainPath}/${expectedFiles.dataSource}`]));
  });

  it('should create the data source style file with other extension', async () => {
    const options = { ...dataSourceOptions, style: 'css' };
    const tree = await schematicRunner.runSchematic('data-source', options, appTree);
    const files = getAllFilesFromDir(`${libMainPath}/${dataSourceName}`, tree);

    expect(files).toEqual(
      jasmine.arrayContaining([`${libMainPath}/${expectedFiles.dataSourceSettings}.css`])
    );
  });

  it('should not create the data source style file', async () => {
    const options = { ...dataSourceOptions, style: 'none' };
    const tree = await schematicRunner.runSchematic('data-source', options, appTree);
    const files = getAllFilesFromDir(
      `${libMainPath}/${dataSourceName}/${dataSourceName}-settings`,
      tree
    );

    expect(files).not.toEqual(
      jasmine.arrayContaining([`${libMainPath}/${expectedFiles.dataSourceSettings}.less`])
    );
  });

  it('should generate the data source file with the correct content', async () => {
    const tree = await schematicRunner.runSchematic('data-source', dataSourceOptions, appTree);
    const actual = tree.readContent(`${libMainPath}/${expectedFiles.dataSource}`);
    const expected = readFileSync(`${fixturesPath}/${expectedFiles.dataSource}`, {
      encoding: 'utf-8'
    });

    expect(normalize(actual).split('\n')).toEqual(normalize(expected).split('\n'));
  });

  it('should add the data source to the metadata', async () => {
    const tree = await schematicRunner.runSchematic('data-source', dataSourceOptions, appTree);
    const actual = tree.readContent(`${libMetadataPath}/${expectedFiles.metadata}`);
    const expected = readFileSync(`${fixturesPath}/${expectedFiles.metadata}`, {
      encoding: 'utf-8'
    });

    expect(normalize(actual).split('\n')).toEqual(normalize(expected).split('\n'));
  });
  describe('- Generate Data Source Settings', () => {
    it('should create the data source settings file', async () => {
      const tree = await schematicRunner.runSchematic('data-source', dataSourceOptions, appTree);
      const files = getAllFilesFromDir(
        `${libMainPath}/${dataSourceName}/${dataSourceName}-settings`,
        tree
      );

      expect(files).toEqual(
        jasmine.arrayContaining([
          `${libMainPath}/${expectedFiles.dataSourceSettings}.html`,
          `${libMainPath}/${expectedFiles.dataSourceSettings}.less`,
          `${libMainPath}/${expectedFiles.dataSourceSettings}.ts`
        ])
      );
    });

    it('should generate the component file with the correct content', async () => {
      const tree = await schematicRunner.runSchematic('data-source', dataSourceOptions, appTree);
      const actual = tree.readContent(`${libMainPath}/${expectedFiles.dataSourceSettings}.ts`);
      const expected = readFileSync(`${fixturesPath}/${expectedFiles.dataSourceSettings}.ts`, {
        encoding: 'utf-8'
      });

      expect(normalize(actual).split('\n')).toEqual(normalize(expected).split('\n'));
    });

    it('should generate the html file with the correct content', async () => {
      const tree = await schematicRunner.runSchematic('data-source', dataSourceOptions, appTree);
      const actual = tree.readContent(`${libMainPath}/${expectedFiles.dataSourceSettings}.html`);
      const expected = readFileSync(`${fixturesPath}/${expectedFiles.dataSourceSettings}.html`, {
        encoding: 'utf-8'
      });

      expect(normalize(actual).split('\n')).toEqual(normalize(expected).split('\n'));
    });

    it('should generate the style file empty', async () => {
      const tree = await schematicRunner.runSchematic('data-source', dataSourceOptions, appTree);

      const dataSourceSettingsStyleContent = tree.readContent(
        `${libMainPath}/${expectedFiles.dataSourceSettings}.less`
      );
      expect(dataSourceSettingsStyleContent).toEqual('');
    });

    it('should have the Component decorator having a different extension for the style file', async () => {
      const options = { ...dataSourceOptions, style: 'css' };

      const tree = await schematicRunner.runSchematic('data-source', options, appTree);

      const dataSourceSettingsContent = tree.readContent(
        `${libMainPath}/${expectedFiles.dataSourceSettings}.ts`
      );
      expect(dataSourceSettingsContent).toContain(
        `styleUrl: './${strings.dasherize(
          dataSourceOptions.name
        )}-data-source-settings.component.${options.style}'`
      );
    });

    it('should have the Component decorator without property styleUrl', async () => {
      const options = { ...dataSourceOptions, style: 'none' };

      const tree = await schematicRunner.runSchematic('data-source', options, appTree);

      const dataSourceSettingsContent = tree.readContent(
        `${libMainPath}/${expectedFiles.dataSourceSettings}.ts`
      );
      expect(dataSourceSettingsContent)
        .withContext('The styleUrl should not be fulfilled')
        .not.toMatch(/styleUrl: '.\/(\w*-*)+.component.\w*'/);
    });
  });
});
