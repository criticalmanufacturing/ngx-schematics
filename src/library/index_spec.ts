import { SchematicTestRunner, UnitTestTree } from "@angular-devkit/schematics/testing";
import { parse } from 'jsonc-parser';
import { getAllFilesFromDir } from "../utility/test";

function getFileContent(tree: UnitTestTree, path: string) {
    const content = tree.readContent(path).toString();
    return parse(content, undefined, { allowTrailingComma: true });
}

describe('Generate Library', () => {

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
        skipPackageJson: false
    };

    const libraryOptions = {
        name: 'testlib',
        entryFile: 'public-api',
        skipPackageJson: false,
        skipTsConfig: false,
        skipInstall: false,
        lint: true
    };

    let appTree: UnitTestTree;

    beforeEach(async () => {
        appTree = await schematicRunner
            .runExternalSchematicAsync('@schematics/angular', 'workspace', workspaceOptions)
            .toPromise();

        appTree = await schematicRunner
            .runExternalSchematicAsync('@schematics/angular', 'application', appOptions, appTree)
            .toPromise();
    });

    it('should create the library files', async () => {
        const tree = await schematicRunner
            .runSchematicAsync('library', libraryOptions, appTree)
            .toPromise();

        const files = getAllFilesFromDir(`projects/${libraryOptions.name}`, tree);

        expect(files).toEqual(
            jasmine.arrayContaining([
                `projects/${libraryOptions.name}/metadata/ng-package.json`,
                `projects/${libraryOptions.name}/metadata/src/public-api.ts`,
                `projects/${libraryOptions.name}/metadata/src/lib/${libraryOptions.name}-metadata.module.ts`,
                `projects/${libraryOptions.name}/metadata/src/lib/${libraryOptions.name}-metadata.service.ts`
            ])
        );
    });

    it('should create a package.json having as name the library name', async () => {
        const tree = await schematicRunner
            .runSchematicAsync('library', libraryOptions, appTree)
            .toPromise();
        const fileContent = getFileContent(tree, `/projects/${libraryOptions.name}/package.json`);
        expect(fileContent).not.toBeNull();
        expect(fileContent.name).toMatch(libraryOptions.name);
    });

    it('should create a tsconfig for library', async () => {
        const tree = await schematicRunner
            .runSchematicAsync('library', libraryOptions, appTree)
            .toPromise();
        const fileContent = getFileContent(tree, `/projects/${libraryOptions.name}/tsconfig.lib.json`);
        expect(fileContent).toBeDefined();
    });

    it('should create a ng-package.json with ngPackage conf', async () => {
        const tree = await schematicRunner
            .runSchematicAsync('library', libraryOptions, appTree)
            .toPromise();
        const fileContent = getFileContent(tree, `/projects/${libraryOptions.name}/ng-package.json`);
        expect(fileContent.lib).toBeDefined();

        let entryFile = libraryOptions.entryFile ?? 'public-api.ts'

        expect(fileContent.lib.entryFile).toEqual(`src/${entryFile}.ts`);
        expect(fileContent.dest).toEqual(`../../dist/${libraryOptions.name}`);
    });

    it('should use default value for baseDir and entryFile', async () => {

        const name = 'test-default-values';

        const tree = await schematicRunner
            .runSchematicAsync(
                'library',
                {
                    name: name
                },
                appTree,
            )
            .toPromise();
        expect(tree.files).toContain(`/projects/${name}/src/public-api.ts`);
    });

    it('should use given name for entryFile', async () => {

        const name = 'test-entry-file-name';
        const entryFileName = 'entry-file-name';

        const tree = await schematicRunner
            .runSchematicAsync(
                'library',
                {
                    name: name,
                    entryFile: entryFileName
                },
                appTree,
            )
            .toPromise();
        expect(tree.files).toContain(`/projects/${name}/src/${entryFileName}.ts`);
    });

    it(`should add library to workspace`, async () => {
        const tree = await schematicRunner
          .runSchematicAsync('library', libraryOptions, appTree)
          .toPromise();
    
        const workspace = getFileContent(tree, '/angular.json');
        expect(workspace.projects.testlib).toBeDefined();
    });
    
    it('should set the prefix to lib if none is set', async () => {
        const tree = await schematicRunner
            .runSchematicAsync('library', libraryOptions, appTree)
            .toPromise();

        const workspace = JSON.parse(tree.readContent('/angular.json'));
        expect(workspace.projects.testlib.prefix).toEqual('lib');
    });

    it('should set the prefix correctly', async () => {

        const prefix = 'test-prefix';

        const options = { ...libraryOptions, prefix: prefix };
        const tree = await schematicRunner
            .runSchematicAsync('library', options, appTree)
            .toPromise();

        const workspace = JSON.parse(tree.readContent('/angular.json'));
        expect(workspace.projects.testlib.prefix).toEqual(prefix);
    });

    it(`should add ng-packagr to devDependencies`, async () => {
        const tree = await schematicRunner
            .runSchematicAsync('library', libraryOptions, appTree)
            .toPromise();
  
        const packageJson = getFileContent(tree, 'package.json');
        expect(packageJson.devDependencies['ng-packagr']).toBeDefined();
    });

    it(`should not modify the file when --skipPackageJson`, async () => {
        const tree = await schematicRunner
            .runSchematicAsync(
                'library',
                {
                    name: 'test-skip-package-json',
                    skipPackageJson: true
                },
                appTree,
            )
            .toPromise();
  
        const packageJson = getFileContent(tree, 'package.json');
        expect(packageJson.devDependencies['ng-packagr']).toBeUndefined();
    });

    it(`should add paths mapping to empty tsconfig`, async () => {
        const tree = await schematicRunner
            .runSchematicAsync('library', libraryOptions, appTree)
            .toPromise();
  
        const tsConfigJson = getFileContent(tree, 'tsconfig.json');
        expect(tsConfigJson.compilerOptions.paths[`${libraryOptions.name}`]).toEqual([`dist/${libraryOptions.name}`]);
    });

    it(`should not modify the file when --skipTsConfig`, async () => {
        const tree = await schematicRunner
            .runSchematicAsync(
                'library',
                {
                    name: 'test-skip-tsconfig',
                    skipTsConfig: true
                },
                appTree,
            )
            .toPromise();
  
        const tsConfigJson = getFileContent(tree, 'tsconfig.json');
        expect(tsConfigJson.compilerOptions.paths).toBeUndefined();
    });

    it('should generate a component inside of a library', async () => {

        const componentName = 'test-component';

        let tree = await schematicRunner
          .runSchematicAsync('library', libraryOptions, appTree)
          .toPromise();
        const componentOptions = {
          name: componentName,
          project: libraryOptions.name,
        };
        tree = await schematicRunner.runSchematicAsync('component', componentOptions, tree).toPromise();
        expect(tree.exists(`/projects/${libraryOptions.name}/src/lib/${componentName}/${componentName}.component.ts`)).toBe(true);
    });

    it('should export the metadata service and module', async () => {
        const tree = await schematicRunner
            .runSchematicAsync('library', libraryOptions, appTree)
            .toPromise();
        const fileContent = tree.readContent(`/projects/${libraryOptions.name}/metadata/src/public-api.ts`);
        expect(fileContent).toMatch(new RegExp(`from './lib/${libraryOptions.name}\-metadata\.service';`));
        expect(fileContent).toMatch(new RegExp(`from './lib/${libraryOptions.name}\-metadata\.module';`));
    });
});