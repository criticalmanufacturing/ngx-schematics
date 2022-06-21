import { strings } from "@angular-devkit/core";
import { SchematicTestRunner, UnitTestTree } from "@angular-devkit/schematics/testing";

describe('Generate Package Info', () => {
    const schematicRunner = new SchematicTestRunner(
        '@criticalmanufacturing/ng-schematics',
        require.resolve('../collection.json'),
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
        skipPackageJson: false,
    };

    const libraryOptions = {
        name: 'testlib',
        skipPackageJson: false,
        skipTsConfig: false,
        skipInstall: false,
    };

    const packageInfoOptions = {
        project: libraryOptions.name
    }

    const defaultMetadataFilePath = `/projects/${libraryOptions.name}/metadata/src/lib/${libraryOptions.name}-metadata.service.ts`;

    let appTree: UnitTestTree;

    beforeEach(async () => {
        appTree = await schematicRunner
            .runExternalSchematicAsync('@schematics/angular', 'workspace', workspaceOptions)
            .toPromise();

        appTree = await schematicRunner
            .runExternalSchematicAsync('@schematics/angular', 'application', appOptions, appTree)
            .toPromise();

        appTree = await schematicRunner
            .runSchematicAsync('library', libraryOptions, appTree)
            .toPromise();
    });

    it('should generate the package-info having a Widget', async () => {

        const widgetName = 'test-widget';

        let tree = await schematicRunner
            .runSchematicAsync(
                'widget',
                {
                    name: widgetName,
                    project: libraryOptions.name
                },
                appTree
            ).toPromise();

        tree = await schematicRunner
            .runSchematicAsync('package-info', packageInfoOptions, tree)
            .toPromise();

        const widgetComponentName = `${strings.classify(widgetName)}WidgetComponent`;

        const metadataContent = tree.readContent(defaultMetadataFilePath);
        const packageInfoWidgets = metadataContent.match(/widgets: \[(\r*\n*\s*)(\W|\w)+\]/gm)?.[0];
        expect(packageInfoWidgets).not.toBeNull();
        expect(packageInfoWidgets).toContain(`'${widgetComponentName}'`);
    });

    it('should generate the package-info having a Data Source', async () => {

        const dataSourceName = 'test-data-source';

        let tree = await schematicRunner
            .runSchematicAsync(
                'data-source',
                {
                    name: dataSourceName,
                    project: libraryOptions.name
                },
                appTree
            ).toPromise();

        tree = await schematicRunner
            .runSchematicAsync('package-info', packageInfoOptions, tree)
            .toPromise();

        const dataSourceComponentName = `${strings.classify(dataSourceName)}DataSource`;

        const metadataContent = tree.readContent(defaultMetadataFilePath);
        const packageInfoDataSources = metadataContent.match(/dataSources: \[(\r*\n*\s*)(\W|\w)+\]/gm)?.[0];
        expect(packageInfoDataSources).not.toBeNull();
        expect(packageInfoDataSources).toContain(`'${dataSourceComponentName}'`);
    });

    it('should generate the package-info having a Converter', async () => {

        const converterName = 'test-converter';

        let tree = await schematicRunner
            .runSchematicAsync(
                'converter',
                {
                    name: converterName,
                    path: `projects/${libraryOptions.name}/src/lib`,
                    project: libraryOptions.name
                },
                appTree
            ).toPromise();

        tree = await schematicRunner
            .runSchematicAsync('package-info', packageInfoOptions, tree)
            .toPromise();

        const converterComponentName = `${strings.classify(converterName)}Pipe`;

        const metadataContent = tree.readContent(defaultMetadataFilePath);
        const packageInfoConverters = metadataContent.match(/converters: \[(\r*\n*\s*)(\W|\w)+\]/gm)?.[0];
        expect(packageInfoConverters).not.toBeNull();
        expect(packageInfoConverters).toContain(`'${converterComponentName}'`);
    });

    it('should generate the package-info having a Component', async () => {

        const entityPageName = 'test-entity-page';

        let tree = await schematicRunner
            .runSchematicAsync(
                'entity-page',
                {
                    name: entityPageName,
                    project: libraryOptions.name,
                    namespace: 'TestNamespace'
                },
                appTree
            ).toPromise();

        tree = await schematicRunner
            .runSchematicAsync('package-info', packageInfoOptions, tree)
            .toPromise();

        const entityPageClassName = `Page${strings.classify(entityPageName)}Component`;

        const metadataContent = tree.readContent(defaultMetadataFilePath);
        const packageInfoComponents = metadataContent.match(/components: \[(\r*\n*\s*)(\W|\w)+\]/gm)?.[0];
        expect(packageInfoComponents).not.toBeNull();
        expect(packageInfoComponents).toContain(`'${entityPageClassName}'`);
    });
});