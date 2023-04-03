import { strings } from '@angular-devkit/core';
import {
  SchematicTestRunner,
  UnitTestTree
} from '@angular-devkit/schematics/testing';

describe('Generate Package Info', () => {
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
    name: 'testlib',
    skipPackageJson: false,
    skipTsConfig: false,
    skipInstall: false
  };

  const packageInfoOptions = {
    project: libraryOptions.name
  };

  const defaultMetadataFilePath = `/projects/${libraryOptions.name}/metadata/src/lib/${libraryOptions.name}-metadata.service.ts`;

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

    appTree = await schematicRunner.runSchematic(
      'library',
      libraryOptions,
      appTree
    );
  });

  it('should generate the package-info having a Widget', async () => {
    const widgetName = 'test';

    let tree = await schematicRunner.runSchematic(
      'widget',
      {
        name: widgetName,
        project: libraryOptions.name
      },
      appTree
    );

    tree = await schematicRunner.runSchematic(
      'package-info',
      packageInfoOptions,
      tree
    );

    const widgetComponentName = `${strings.classify(widgetName)}Widget`;

    const metadataContent = tree.readContent(defaultMetadataFilePath);
    const packageInfoWidgets = metadataContent.match(
      /widgets: \[(\r*\n*\s*)(\W|\w)+?\]/gm
    )?.[0];
    expect(packageInfoWidgets).not.toBeNull();
    expect(packageInfoWidgets).toContain(`'${widgetComponentName}'`);
  });

  it('should generate the package-info having a Data Source', async () => {
    const dataSourceName = 'test';

    let tree = await schematicRunner.runSchematic(
      'data-source',
      {
        name: dataSourceName,
        project: libraryOptions.name
      },
      appTree
    );

    tree = await schematicRunner.runSchematic(
      'package-info',
      packageInfoOptions,
      tree
    );

    const dataSourceComponentName = `${strings.classify(
      dataSourceName
    )}DataSource`;

    const metadataContent = tree.readContent(defaultMetadataFilePath);
    const packageInfoDataSources = metadataContent.match(
      /dataSources: \[(\r*\n*\s*)(\W|\w)+?\]/gm
    )?.[0];
    expect(packageInfoDataSources).not.toBeNull();
    expect(packageInfoDataSources).toContain(`'${dataSourceComponentName}'`);
  });

  it('should generate the package-info having a Converter', async () => {
    const converterName = 'test';

    let tree = await schematicRunner.runSchematic(
      'converter',
      {
        name: converterName,
        path: `projects/${libraryOptions.name}/src/lib`,
        project: libraryOptions.name
      },
      appTree
    );

    tree = await schematicRunner.runSchematic(
      'package-info',
      packageInfoOptions,
      tree
    );

    const converterComponentName = `${strings.classify(
      converterName
    )}Converter`;

    const metadataContent = tree.readContent(defaultMetadataFilePath);
    const packageInfoConverters = metadataContent.match(
      /converters: \[(\r*\n*\s*)(\W|\w)+?\]/gm
    )?.[0];
    expect(packageInfoConverters).not.toBeNull();
    expect(packageInfoConverters).toContain(`'${converterComponentName}'`);
  });

  it('should generate the package-info having a Component', async () => {
    const entityPageName = 'test-entity-page';

    let tree = await schematicRunner.runSchematic(
      'entity-page',
      {
        name: entityPageName,
        project: libraryOptions.name,
        entityType: 'TestEntityType',
        namespace: 'TestNamespace'
      },
      appTree
    );

    tree = await schematicRunner.runSchematic(
      'package-info',
      packageInfoOptions,
      tree
    );

    const entityPageClassName = `Page${strings.classify(
      entityPageName
    )}Component`;

    const metadataContent = tree.readContent(defaultMetadataFilePath);
    const packageInfoComponents = metadataContent.match(
      /components: \[(\r*\n*\s*)(\W|\w)+\]/gm
    )?.[0];
    expect(packageInfoComponents).not.toBeNull();
    expect(packageInfoComponents).toContain(`'${entityPageClassName}'`);
  });
});
