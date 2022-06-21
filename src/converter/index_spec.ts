import { SchematicTestRunner, UnitTestTree } from "@angular-devkit/schematics/testing";
import { strings } from '@angular-devkit/core';
import { nameify } from "../utility/string";

describe('Generate Converter', () => {

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

    const converterOptions = {
        name: 'test-converter',
        path: `projects/${libraryOptions.name}/src/lib`,
        project: libraryOptions.name
    }

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

    it('should create the converter file', async () => {
        const tree = await schematicRunner
            .runSchematicAsync('converter', converterOptions, appTree)
            .toPromise();

        expect(tree.getDir(`${converterOptions.path}/${converterOptions.name}`).subfiles).toEqual(
            jasmine.arrayContaining([
                `${converterOptions.name}.pipe.ts`,
            ])
        );
    });

    it('should have the Pipe and Converter decorators', async () => {
        const tree = await schematicRunner
            .runSchematicAsync('converter', converterOptions, appTree)
            .toPromise();

        const pipeContent = tree.readContent(`${converterOptions.path}/${converterOptions.name}/${converterOptions.name}.pipe.ts`);

        expect(pipeContent).toMatch(/import \{\s*((NgModule|PipeTransform|Pipe)\s*,?\s*){3}\} from '@angular\/core';/gm);
        expect(pipeContent).toMatch(/import \{\s*Converter\s*\} from 'cmf-core-dashboards';/gm);
        expect(pipeContent).toMatch(/@Pipe\(/);
        expect(pipeContent).toMatch(/@Converter\(/g);
    });

    it('should have the name and factory properties in the Converter decorator', async () => {
        const tree = await schematicRunner
            .runSchematicAsync('converter', converterOptions, appTree)
            .toPromise();

        const converterName = `${nameify(converterOptions.name)} Converter`;
        const converterClassName = `${strings.classify(converterOptions.name)}Pipe`;

        const pipeContent = tree.readContent(`${converterOptions.path}/${converterOptions.name}/${converterOptions.name}.pipe.ts`);
        expect(pipeContent).toContain(`name: $localize\`:@@${strings.dasherize(converterOptions.project)}/${converterOptions.name}#NAME:${converterName}\``);
        expect(pipeContent).toContain(`factory: () => new ${converterClassName}(),`);
    });

    it('should have the name property in the Pipe decorator', async () => {
        const tree = await schematicRunner
            .runSchematicAsync('converter', converterOptions, appTree)
            .toPromise();

        const converterName = `${strings.camelize(converterOptions.name)}`;

        const pipeContent = tree.readContent(`${converterOptions.path}/${converterOptions.name}/${converterOptions.name}.pipe.ts`);
        expect(pipeContent).toContain(`name: '${converterName}'`);
    });

    it('should implement PipeTransform', async () => {
        const tree = await schematicRunner
            .runSchematicAsync('converter', converterOptions, appTree)
            .toPromise();

        const converterClassName = `${strings.classify(converterOptions.name)}Pipe`;

        const pipeContent = tree.readContent(`${converterOptions.path}/${converterOptions.name}/${converterOptions.name}.pipe.ts`);
        expect(pipeContent).toContain(`export class ${converterClassName} implements PipeTransform {`);
        expect(pipeContent).toContain('transform(value: any, ...args: any[]): any');
    });

    it('should be declared and exported in NgModule', async () => {
        const tree = await schematicRunner
            .runSchematicAsync('converter', converterOptions, appTree)
            .toPromise();

        const converterClassName = `${strings.classify(converterOptions.name)}Pipe`;

        const pipeContent = tree.readContent(`${converterOptions.path}/${converterOptions.name}/${converterOptions.name}.pipe.ts`);
        expect(pipeContent).toContain(`declarations: \[${converterClassName}\]`);
        expect(pipeContent).toContain(`exports: \[${converterClassName}\]`);
        expect(pipeContent).toContain(`export class ${converterClassName}Module { }`);
    });
});