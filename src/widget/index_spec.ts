import { SchematicTestRunner, UnitTestTree } from "@angular-devkit/schematics/testing";
import { strings } from '@angular-devkit/core';
import { getAllFilesFromDir } from "../utility/test";
import { nameify } from "../utility/string";

describe('Generate Widget', () => {
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

    const widgetOptions = {
        name: 'test-widget',
        project: libraryOptions.name,
        style: 'less'
    }

    const defaultWidgetFilePath = `projects/${libraryOptions.name}/src/lib/${widgetOptions.name}-widget/${widgetOptions.name}-widget.component`;
    const defaultWidgetSettingsComponentFilePath = `projects/${libraryOptions.name}/src/lib/${widgetOptions.name}-widget/${widgetOptions.name}-widget-settings/${widgetOptions.name}-widget-settings.component`;

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

    it('should create the widget files', async () => {
        const tree = await schematicRunner
            .runSchematicAsync('widget', widgetOptions, appTree)
            .toPromise();

        const files = getAllFilesFromDir(`projects/${libraryOptions.name}/src/lib/${widgetOptions.name}-widget`, tree);

        expect(files).toEqual(
            jasmine.arrayContaining([
                `${defaultWidgetSettingsComponentFilePath}.html`,
                `${defaultWidgetSettingsComponentFilePath}.ts`,
                `${defaultWidgetSettingsComponentFilePath}.less`,
                `${defaultWidgetFilePath}.html`,
                `${defaultWidgetFilePath}.ts`,
                `${defaultWidgetFilePath}.less`
            ])
        );
    });

    it('should create the widget style file with other extension', async () => {

        const options = { ...widgetOptions, style: 'css' };

        const tree = await schematicRunner
            .runSchematicAsync('widget', options, appTree)
            .toPromise();

        const files = getAllFilesFromDir(`projects/${libraryOptions.name}/src/lib/${widgetOptions.name}-widget/${widgetOptions.name}-widget-settings`, tree);

        expect(files).toEqual(
            jasmine.arrayContaining([
                `${defaultWidgetSettingsComponentFilePath}.css`
            ])
        );
    });

    it('should not create the widget style file', async () => {
        const options = { ...widgetOptions, style: 'none' };

        const tree = await schematicRunner
            .runSchematicAsync('widget', options, appTree)
            .toPromise();

        const files = getAllFilesFromDir(`projects/${libraryOptions.name}/src/lib/${widgetOptions.name}-widget`, tree);
        expect(files).toHaveSize(4);
        expect(files).toEqual(
            jasmine.arrayContaining([
                `${defaultWidgetSettingsComponentFilePath}.html`,
                `${defaultWidgetSettingsComponentFilePath}.ts`,
                `${defaultWidgetFilePath}.html`,
                `${defaultWidgetFilePath}.ts`
            ])
        );
    });

    it('should have the Component and Widget decorators', async () => {
        const tree = await schematicRunner
            .runSchematicAsync('widget', widgetOptions, appTree)
            .toPromise();

        const widgetContent = tree.readContent(`${defaultWidgetFilePath}.ts`);
        expect(widgetContent).toMatch(/@Widget\(/);
        expect(widgetContent).toMatch(/@Component\(/);
    });

    it('should have the name, iconClass, and settingsComponent properties in the Widget decorator', async () => {
        const tree = await schematicRunner
            .runSchematicAsync('widget', widgetOptions, appTree)
            .toPromise();
        
        const widgetContent = tree.readContent(`${defaultWidgetFilePath}.ts`);
        expect(widgetContent).toContain(`name: $localize\`:@@${strings.dasherize(widgetOptions.project)}/${strings.dasherize(widgetOptions.name)}-widget#NAME:${nameify(widgetOptions.name)} Widget\``);
        expect(widgetContent).toContain(`iconClass: 'icon-core-st-lg-generic'`);
        expect(widgetContent).toMatch(new RegExp(`settingsComponent: {(\r*\n*(\\s*))component: ${strings.classify(widgetOptions.name)}WidgetSettingsComponent(\r*\n*(\\s*))}`, 'gm'));
    });

    it('should have the Component decorator having a different extension for the style file', async () => {

        const options = { ...widgetOptions, style: 'css' };

        const tree = await schematicRunner
            .runSchematicAsync('widget', options, appTree)
            .toPromise();

        const widgetSettingsContent = tree.readContent(`${defaultWidgetFilePath}.ts`);
        expect(widgetSettingsContent).toContain(`styleUrls: ['./${strings.dasherize(widgetOptions.name)}-widget.component.${options.style}']`);
    });

    it('should have the Component decorator without property styleUrls', async () => {

        const options = { ...widgetOptions, style: 'none' };

        const tree = await schematicRunner
            .runSchematicAsync('widget', options, appTree)
            .toPromise();

        const widgetContent = tree.readContent(`${defaultWidgetFilePath}.ts`);
        expect(widgetContent).withContext('The styleUrls should not be fulfilled').not.toMatch(/styleUrls: \['.\/(\w*-*)+-widget.component.\w*'\]/);
    });

    it('should have the selector, templateUrl, and styleUrls properties in the Component decorator', async () => {
        const tree = await schematicRunner
            .runSchematicAsync('widget', widgetOptions, appTree)
            .toPromise();
        
        const widgetContent = tree.readContent(`${defaultWidgetFilePath}.ts`);
        expect(widgetContent).toContain(`selector: '${strings.dasherize(widgetOptions.project)}-${strings.dasherize(widgetOptions.name)}-widget'`);
        expect(widgetContent).toContain(`templateUrl: './${strings.dasherize(widgetOptions.name)}-widget.component.html'`);
        expect(widgetContent).toContain(`styleUrls: ['./${strings.dasherize(widgetOptions.name)}-widget.component.less']`);
    });

    it('should extend WidgetGeneric and implement WidgetRepresentation', async () => {
        const tree = await schematicRunner
            .runSchematicAsync('widget', widgetOptions, appTree)
            .toPromise();

        const widgetClassName = `${strings.classify(widgetOptions.name)}WidgetComponent`;

        const widgetContent = tree.readContent(`${defaultWidgetFilePath}.ts`);
        expect(widgetContent).toContain(`export class ${widgetClassName} extends WidgetGeneric implements WidgetRepresentation {`);
    });

    it('should have the constructor receiving the ViewContainerRef, ElementRef and FeedbackService.', async () => {
        const tree = await schematicRunner
            .runSchematicAsync('widget', widgetOptions, appTree)
            .toPromise();

        const widgetContent = tree.readContent(`${defaultWidgetFilePath}.ts`);
        expect(widgetContent).toMatch(/constructor\(([viewContainerRef: ViewContainerRef|elementRef: ElementRef|feedback: FeedbackService]*,*(\r*\n*(\s*))*)+\)/gm);
        expect(widgetContent).toContain('super(viewContainerRef, elementRef, feedback);');
    });

    it('should be declared and exported in NgModule', async () => {
        const tree = await schematicRunner
            .runSchematicAsync('widget', widgetOptions, appTree)
            .toPromise();

        const widgetContent = tree.readContent(`${defaultWidgetFilePath}.ts`);
        expect(widgetContent).toContain(`declarations: [${strings.classify(widgetOptions.name)}WidgetComponent]`);
        expect(widgetContent).toContain(`exports: [${strings.classify(widgetOptions.name)}WidgetComponent]`);
        expect(widgetContent).toContain(`export class ${strings.classify(widgetOptions.name)}WidgetModule { }`);
    });

    describe('- Generate Widget Settings', () => {

        it('should create the widget settings file', async () => { 
            const tree = await schematicRunner
                .runSchematicAsync('widget', widgetOptions, appTree)
                .toPromise();

            const files = getAllFilesFromDir(`projects/${libraryOptions.name}/src/lib/${widgetOptions.name}-widget/${widgetOptions.name}-widget-settings`, tree);

            expect(files).toEqual(
                jasmine.arrayContaining([
                    `${defaultWidgetSettingsComponentFilePath}.html`,
                    `${defaultWidgetSettingsComponentFilePath}.ts`,
                    `${defaultWidgetSettingsComponentFilePath}.less`
                ])
            );
        });

        it('should generate the html file with `cmf-core-dashboards-widgetSettings` component selector', async () => {
            const tree = await schematicRunner
                .runSchematicAsync('widget', widgetOptions, appTree)
                .toPromise();

            const templateRegExp = new RegExp(
                `<cmf-core-dashboards-widgetSettings>(\r*\n*(\\s*))\\` +
                `<\/cmf-core-dashboards-widgetSettings>`, 'gm');

            const widgetSettingsTemplateContent = tree.readContent(`${defaultWidgetSettingsComponentFilePath}.html`);
            expect(widgetSettingsTemplateContent).toMatch(templateRegExp);
        });

        it('should generate the style file empty', async () => {
            const tree = await schematicRunner
                .runSchematicAsync('widget', widgetOptions, appTree)
                .toPromise();

            const widgetSettingsStyleContent = tree.readContent(`${defaultWidgetSettingsComponentFilePath}.less`);
            expect(widgetSettingsStyleContent).toEqual('');
        });

        it('should have the Component decorator with properties selector, templateUrl, and styleUrls', async () => {
            const tree = await schematicRunner
                .runSchematicAsync('widget', widgetOptions, appTree)
                .toPromise();

            const widgetSettingsContent = tree.readContent(`${defaultWidgetSettingsComponentFilePath}.ts`);
            expect(widgetSettingsContent).toMatch(/@Component\(/);
            expect(widgetSettingsContent).toContain(`selector: '${strings.dasherize(widgetOptions.project)}-${strings.dasherize(widgetOptions.name)}-widget-settings'`);
            expect(widgetSettingsContent).toContain(`templateUrl: './${strings.dasherize(widgetOptions.name)}-widget-settings.component.html'`);
            expect(widgetSettingsContent).toContain(`styleUrls: ['./${strings.dasherize(widgetOptions.name)}-widget-settings.component.less']`);
        });

        it('should have the Component decorator having a different extension for the style file', async () => {

            const options = { ...widgetOptions, style: 'css' };

            const tree = await schematicRunner
                .runSchematicAsync('widget', options, appTree)
                .toPromise();

            const widgetSettingsContent = tree.readContent(`${defaultWidgetSettingsComponentFilePath}.ts`);
            expect(widgetSettingsContent).toContain(`styleUrls: ['./${strings.dasherize(widgetOptions.name)}-widget-settings.component.${options.style}']`);
        });

        it('should have the Component decorator without property styleUrls', async () => {

            const options = { ...widgetOptions, style: 'none' };

            const tree = await schematicRunner
                .runSchematicAsync('widget', options, appTree)
                .toPromise();

            const widgetSettingsContent = tree.readContent(`${defaultWidgetSettingsComponentFilePath}.ts`);
            expect(widgetSettingsContent).withContext('The styleUrls should not be fulfilled').not.toMatch(/styleUrls: \['.\/(\w*-*)+.component.\w*'\]/);
        });

        it('should extend CustomizableComponent', async () => {
            const tree = await schematicRunner
                .runSchematicAsync('widget', widgetOptions, appTree)
                .toPromise();

            const widgetSettingsClassName = `${strings.classify(widgetOptions.name)}WidgetSettingsComponent`;

            const widgetSettingsContent = tree.readContent(`${defaultWidgetSettingsComponentFilePath}.ts`);
            expect(widgetSettingsContent).toContain(`export class ${widgetSettingsClassName} extends CustomizableComponent {`);
        });

        it('should have the constructor receiving the ViewContainerRef and providing it to the super', async () => {
            const tree = await schematicRunner
                .runSchematicAsync('widget', widgetOptions, appTree)
                .toPromise();
    
            const widgetSettingsContent = tree.readContent(`${defaultWidgetSettingsComponentFilePath}.ts`);
            expect(widgetSettingsContent).toMatch(/constructor\(viewContainerRef: ViewContainerRef\) {(\r*\n*(\s*))super\(viewContainerRef\);(\r*\n*(\s*))}/gm)
        });

        it('should import WidgetSettingsModule in NgModule', async () => {
            const tree = await schematicRunner
                .runSchematicAsync('widget', widgetOptions, appTree)
                .toPromise();
    
            const widgetSettingsContent = tree.readContent(`${defaultWidgetSettingsComponentFilePath}.ts`);
            expect(widgetSettingsContent).toContain('imports: [WidgetSettingsModule]');
        });

        it('should be declared and exported in NgModule', async () => {
            const tree = await schematicRunner
                .runSchematicAsync('widget', widgetOptions, appTree)
                .toPromise();
    
            const widgetSettingsClassName = `${strings.classify(widgetOptions.name)}WidgetSettings`;
    
            const widgetSettingsContent = tree.readContent(`${defaultWidgetSettingsComponentFilePath}.ts`);
            expect(widgetSettingsContent).toContain(`declarations: [${widgetSettingsClassName}Component]`);
            expect(widgetSettingsContent).toContain(`exports: [${widgetSettingsClassName}Component]`);
            expect(widgetSettingsContent).toContain(`export class ${widgetSettingsClassName}Module { }`);
        });
    });
});