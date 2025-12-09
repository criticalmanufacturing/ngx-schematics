import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
import { getAllFilesFromDir, normalize } from '@criticalmanufacturing/schematics-devkit/testing';
import { strings } from '@criticalmanufacturing/schematics-devkit';
import { readFileSync } from 'node:fs';

describe('Generate Widget', () => {
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

  const widgetOptions = {
    name: 'test',
    project: libraryOptions.name,
    style: 'less'
  };

  const fixturesPath = `${__dirname}/fixtures`;
  const libPath = `projects/${libraryOptions.name}`;
  const libMainPath = `${libPath}/src/lib`;
  const libMetadataPath = `${libPath}/metadata/src/lib`;
  const widgetName = `${strings.dasherize(widgetOptions.name)}-widget`;

  const expectedFiles = {
    wdiget: `${widgetName}/${widgetName}.component`,
    widgetSettings: `${widgetName}/${widgetName}-settings/${widgetName}-settings.component`,
    widgetSettingsService: `${widgetName}/${widgetName}-settings/${widgetName}-settings.service.ts`,
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

  it('should create the widget files', async () => {
    const tree = await schematicRunner.runSchematic('widget', widgetOptions, appTree);
    const files = getAllFilesFromDir(
      `projects/${libraryOptions.name}/src/lib/${widgetOptions.name}-widget`,
      tree
    );

    expect(files).toEqual(
      jasmine.arrayContaining([
        `${libMainPath}/${expectedFiles.wdiget}.html`,
        `${libMainPath}/${expectedFiles.wdiget}.ts`,
        `${libMainPath}/${expectedFiles.wdiget}.less`,
        `${libMainPath}/${expectedFiles.widgetSettings}.html`,
        `${libMainPath}/${expectedFiles.widgetSettings}.ts`,
        `${libMainPath}/${expectedFiles.widgetSettings}.less`,
        `${libMainPath}/${expectedFiles.widgetSettingsService}`
      ])
    );
  });

  it('should create the widget style file with other extension', async () => {
    const options = { ...widgetOptions, style: 'css' };
    const tree = await schematicRunner.runSchematic('widget', options, appTree);
    const files = getAllFilesFromDir(`${libMainPath}/${widgetName}/${widgetName}-settings`, tree);

    expect(files).toEqual(
      jasmine.arrayContaining([`${libMainPath}/${expectedFiles.widgetSettings}.css`])
    );
  });

  it('should not create the widget style file', async () => {
    const options = { ...widgetOptions, style: 'none' };
    const tree = await schematicRunner.runSchematic('widget', options, appTree);
    const files = getAllFilesFromDir(`${libMainPath}/${widgetName}`, tree);

    expect(files).not.toEqual(
      jasmine.arrayContaining([
        `${libMainPath}/${expectedFiles.wdiget}.less`,
        `${libMainPath}/${expectedFiles.widgetSettings}.less`
      ])
    );
  });

  it('should generate the widget ts file with the correct content', async () => {
    const tree = await schematicRunner.runSchematic('widget', widgetOptions, appTree);
    const actual = tree.readContent(`${libMainPath}/${expectedFiles.wdiget}.ts`);
    const expected = readFileSync(`${fixturesPath}/${expectedFiles.wdiget}.ts`, {
      encoding: 'utf-8'
    });

    expect(normalize(actual).split('\n')).toEqual(normalize(expected).split('\n'));
  });

  it('should generate the widget html file with the correct content', async () => {
    const tree = await schematicRunner.runSchematic('widget', widgetOptions, appTree);
    const actual = tree.readContent(`${libMainPath}/${expectedFiles.wdiget}.html`);
    const expected = readFileSync(`${fixturesPath}/${expectedFiles.wdiget}.html`, {
      encoding: 'utf-8'
    });

    expect(normalize(actual).split('\n')).toEqual(normalize(expected).split('\n'));
  });

  it('should have the Component decorator having a different extension for the style file', async () => {
    const options = { ...widgetOptions, style: 'css' };
    const tree = await schematicRunner.runSchematic('widget', options, appTree);

    const actual = tree.readContent(`${libMainPath}/${expectedFiles.wdiget}.ts`);
    expect(actual).toContain(
      `styleUrl: './${strings.dasherize(widgetOptions.name)}-widget.component.${options.style}'`
    );
  });

  it('should have the Component decorator without property styleUrl', async () => {
    const options = { ...widgetOptions, style: 'none' };
    const tree = await schematicRunner.runSchematic('widget', options, appTree);

    const actual = tree.readContent(`${libMainPath}/${expectedFiles.wdiget}.ts`);
    expect(actual)
      .withContext('The styleUrl should not be fulfilled')
      .not.toMatch(/styleUrl: '.\/(\w*-*)+-widget.component.\w*'/);
  });

  it('should update the metadata with a new action', async () => {
    const tree = await schematicRunner.runSchematic('widget', widgetOptions, appTree);
    const actual = tree.readContent(`${libMetadataPath}/${expectedFiles.metadata}`);
    const expected = readFileSync(`${fixturesPath}/${expectedFiles.metadata}`, {
      encoding: 'utf-8'
    });

    expect(normalize(actual).split('\n')).toEqual(normalize(expected).split('\n'));
  });

  describe('- Generate Widget Settings', () => {
    it('should generate the html file with the correct content', async () => {
      const tree = await schematicRunner.runSchematic('widget', widgetOptions, appTree);
      const actual = tree.readContent(`${libMainPath}/${expectedFiles.widgetSettings}.html`);
      const expected = readFileSync(`${fixturesPath}/${expectedFiles.widgetSettings}.html`, {
        encoding: 'utf-8'
      });

      expect(normalize(actual).split('\n')).toEqual(normalize(expected).split('\n'));
    });

    it('should generate the ts file with the correct content', async () => {
      const tree = await schematicRunner.runSchematic('widget', widgetOptions, appTree);
      const actual = tree.readContent(`${libMainPath}/${expectedFiles.widgetSettings}.ts`);
      const expected = readFileSync(`${fixturesPath}/${expectedFiles.widgetSettings}.ts`, {
        encoding: 'utf-8'
      });

      expect(normalize(actual).split('\n')).toEqual(normalize(expected).split('\n'));
    });

    it('should generate the style file empty', async () => {
      const tree = await schematicRunner.runSchematic('widget', widgetOptions, appTree);
      const actual = tree.readContent(`${libMainPath}/${expectedFiles.widgetSettings}.less`);

      expect(actual).toEqual('');
    });

    it('should have the Component decorator having a different extension for the style file', async () => {
      const options = { ...widgetOptions, style: 'css' };
      const tree = await schematicRunner.runSchematic('widget', options, appTree);
      const actual = tree.readContent(`${libMainPath}/${expectedFiles.widgetSettings}.ts`);

      expect(actual).toContain(
        `styleUrl: './${strings.dasherize(widgetOptions.name)}-widget-settings.component.${
          options.style
        }'`
      );
    });

    it('should have the Component decorator without property styleUrl', async () => {
      const options = { ...widgetOptions, style: 'none' };
      const tree = await schematicRunner.runSchematic('widget', options, appTree);
      const actual = tree.readContent(`${libMainPath}/${expectedFiles.widgetSettings}.ts`);

      expect(actual)
        .withContext('The styleUrl should not be fulfilled')
        .not.toMatch(/styleUrl: '.\/(\w*-*)+.component.\w*'/);
    });
  });
});
