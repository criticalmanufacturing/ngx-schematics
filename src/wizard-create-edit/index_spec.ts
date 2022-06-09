import { join, normalize } from '@angular-devkit/core';
import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';

describe('wizard create edit generator', () => {

    const schematicRunner = new SchematicTestRunner(
        '@criticalmanufacturing/ng-schematics',
        require.resolve('../collection.json'),
    );

    let appTree: UnitTestTree;

    const defaultOptions = {
        name: 'checklist',
        path: 'projects/my-lib/lib/src',
        project: 'my-lib',
        namespace: 'Navigo',
        style: 'less',
        type: 'Component'
    };

    const libraryOptions = {
        name: 'my-lib'
    };

    const workspaceOptions = {
        name: 'workspace',
        newProjectRoot: 'projects',
        version: '10.0.0',
    };

    const appOptions = {
        name: 'app',
        inlineStyle: false,
        inlineTemplate: false,
        routing: false,
        skipTests: false,
        skipPackageJson: false,
    };

    beforeEach(async () => {
        appTree = await schematicRunner
            .runExternalSchematicAsync('@schematics/angular', 'workspace', workspaceOptions)
            .toPromise();
        appTree = await schematicRunner
            .runExternalSchematicAsync('@schematics/angular', 'application', appOptions, appTree)
            .toPromise();
    });

    it('inserts exports correcly', async () => {
        appTree = await schematicRunner.runSchematicAsync('library', libraryOptions, appTree).toPromise();
        appTree = await schematicRunner.runSchematicAsync('wizard-create-edit', defaultOptions, appTree).toPromise();

        const basedir = join(normalize(defaultOptions.path), `wizard-create-edit-${defaultOptions.name}`);

        expect(appTree.getDir(basedir).subfiles).toEqual(
            jasmine.arrayContaining([
                `wizard-create-edit-${defaultOptions.name}.component.${defaultOptions.style}`,
                `wizard-create-edit-${defaultOptions.name}.component.html`,
                `wizard-create-edit-${defaultOptions.name}.component.ts`,
            ]),
        );
    });
});
