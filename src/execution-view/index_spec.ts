import { strings } from "@angular-devkit/core";
import { SchematicTestRunner, UnitTestTree } from "@angular-devkit/schematics/testing";
import { nameify } from "../utility/string";

describe('Generate Execution View', () => {
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

    const executionViewOptions = {
        name: "TestExecutionView",
        entityType: 'TestEntityType',
        project: libraryOptions.name,
        namespace: 'TestNamespace'
    }

    const executionViewPath = `projects/${libraryOptions.name}/src/lib/wizard-${strings.dasherize(executionViewOptions.name)}`;

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

    it('should create the execution view files', async () => {
        const tree = await schematicRunner
            .runSchematicAsync('execution-view', executionViewOptions, appTree)
            .toPromise();

        const dasherizedExecutionViewName = strings.dasherize(executionViewOptions.name);

        expect(tree.getDir(executionViewPath).subfiles).toEqual(
            jasmine.arrayContaining([
                `wizard-${dasherizedExecutionViewName}.component.less`,
                `wizard-${dasherizedExecutionViewName}.component.html`,
                `wizard-${dasherizedExecutionViewName}.component.ts`,
            ])
        );
    });

    it('should create the execution view style file with other extension', async () => {

        const options = { ...executionViewOptions, style: 'css' };

        const tree = await schematicRunner
            .runSchematicAsync('execution-view', options, appTree)
            .toPromise();

        const dasherizedExecutionViewName = strings.dasherize(executionViewOptions.name);

        expect(tree.getDir(executionViewPath).subfiles).toEqual(
            jasmine.arrayContaining([
                `wizard-${dasherizedExecutionViewName}.component.css`
            ])
        );
    });

    it('should not create the execution view style file', async () => {
        const options = { ...executionViewOptions, style: 'none' };

        const tree = await schematicRunner
            .runSchematicAsync('execution-view', options, appTree)
            .toPromise();

        const files = tree.getDir(executionViewPath).subfiles;

        expect(files).toHaveSize(2);
        expect(files).toEqual(
            jasmine.arrayContaining([
                `wizard-${strings.dasherize(executionViewOptions.name)}.component.html`,
                `wizard-${strings.dasherize(executionViewOptions.name)}.component.ts`,
            ])
        );
    });

    it('should generate the style file empty', async () => {
        const tree = await schematicRunner
            .runSchematicAsync('execution-view', executionViewOptions, appTree)
            .toPromise();

        const dasherizedExecutionViewName = strings.dasherize(executionViewOptions.name);

        const executionViewStyleContent = tree.readContent(`${executionViewPath}/wizard-${dasherizedExecutionViewName}.component.less`);
        expect(executionViewStyleContent).toEqual('');
    });

    it('should generate the html file with `cmf-core-controls-execution-view` component selector', async () => {
        const tree = await schematicRunner
            .runSchematicAsync('execution-view', executionViewOptions, appTree)
            .toPromise();

        const dasherizedExecutionViewName = strings.dasherize(executionViewOptions.name);

        const templateRegExp = new RegExp(
            `<cmf-core-controls-execution-view \\[cmf-core-business-controls-transaction-execution-view\\]="instance!"(\r*\n*(\\s*))` +
                `i18n-mainTitle="@@lib/wizard-${dasherizedExecutionViewName}#TITLE" mainTitle="${nameify(executionViewOptions.name)}"(\r*\n*(\\s*))` +
                `i18n-action-name="lib/wizard-${dasherizedExecutionViewName}#ACTION" action-name="Finish">(\r*\n*(\\s*))` +
                    `<!-- Execution View steps -->(\r*\n*(\\s*))` +
                    `<cmf-core-controls-execution-view-tab i18n-mainTitle="@@lib/wizard-${dasherizedExecutionViewName}#DETAILS" mainTitle="Details">(\r*\n*(\\s*))` +
                        `<p>${nameify(executionViewOptions.name)} Wizard works!</p>(\r*\n*(\\s*))` +
                    `</cmf-core-controls-execution-view-tab>(\r*\n*(\\s*))` +
            `</cmf-core-controls-execution-view>`,
            'gm');

        const executionViewTemplateContent = tree.readContent(`${executionViewPath}/wizard-${dasherizedExecutionViewName}.component.html`);
        expect(executionViewTemplateContent).toMatch(templateRegExp);
    });

    it('should have the Component decorator with properties selector, templateUrl, styleUrls, and viewProviders', async () => {

        const tree = await schematicRunner
            .runSchematicAsync('execution-view', executionViewOptions, appTree)
            .toPromise();

        const executionViewContent = tree.readContent(`${executionViewPath}/wizard-${strings.dasherize(executionViewOptions.name)}.component.ts`);
        expect(executionViewContent).toMatch(/@Component\(/);
        expect(executionViewContent).toContain(`selector: 'lib-wizard-${strings.dasherize(executionViewOptions.name)}'`);
        expect(executionViewContent).toContain(`templateUrl: './wizard-${strings.dasherize(executionViewOptions.name)}.component.html'`);
        expect(executionViewContent).toContain(`styleUrls: ['./wizard-${strings.dasherize(executionViewOptions.name)}.component.less']`);
        expect(executionViewContent).toContain(`viewProviders: [{ provide: HOST_VIEW_COMPONENT, useExisting: forwardRef(() => Wizard${strings.classify(executionViewOptions.name)}Component) }]`);
    });

    it('should extend CustomizableComponent', async () => {
        const tree = await schematicRunner
            .runSchematicAsync('execution-view', executionViewOptions, appTree)
            .toPromise();

        const executionViewContent = tree.readContent(`${executionViewPath}/wizard-${strings.dasherize(executionViewOptions.name)}.component.ts`);
        expect(executionViewContent).toContain(`export class Wizard${strings.classify(executionViewOptions.name)}Component extends CustomizableComponent`);
    });

    it('should implement TransactionExecutionView and OnInit', async () => {
        const tree = await schematicRunner
            .runSchematicAsync('execution-view', executionViewOptions, appTree)
            .toPromise();

        const executionViewContent = tree.readContent(`${executionViewPath}/wizard-${strings.dasherize(executionViewOptions.name)}.component.ts`);
        expect(executionViewContent).toContain(`implements TransactionExecutionView, OnInit`);
        expect(executionViewContent).toContain(`public async prepareDataInput(): Promise<Cmf.Foundation.BusinessOrchestration.BaseInput[]> {`);
        expect(executionViewContent).toContain(`public async handleDataOutput(outputs: Cmf.Foundation.BusinessOrchestration.BaseOutput[], executionViewArgs?: ExecutionViewEventArgs): Promise<void> {`);
        expect(executionViewContent).toContain(`public async prepareTransactionInput(args: TransactionEventArgs): Promise<Cmf.Foundation.BusinessOrchestration.BaseInput> {`);
        expect(executionViewContent).toContain(`public async handleTransactionOutput(output: Cmf.Foundation.BusinessOrchestration.BaseOutput): Promise<void> {`);
        expect(executionViewContent).toContain(`public ngOnInit(): void {`);
    });

    it('should have the constructor receiving the ViewContainerRef, PageBag, UtilService, and EntityTypeService', async () => {
        const tree = await schematicRunner
            .runSchematicAsync('execution-view', executionViewOptions, appTree)
            .toPromise();

        const executionViewContent = tree.readContent(`${executionViewPath}/wizard-${strings.dasherize(executionViewOptions.name)}.component.ts`);
        expect(executionViewContent).toMatch(/constructor\(([viewContainerRef: ViewContainerRef|private pageBag: PageBag|private util: UtilService|private entityTypes: EntityTypeService]*,*(\r*\n*(\s*))*)+\)/gm);
        expect(executionViewContent).toContain('super(viewContainerRef);');
    });

    it('should import CommonModule, ExecutionViewModule, and TransactionExecutionViewModule in NgModule', async () => {
        const tree = await schematicRunner
            .runSchematicAsync('execution-view', executionViewOptions, appTree)
            .toPromise();

        const executionViewContent = tree.readContent(`${executionViewPath}/wizard-${strings.dasherize(executionViewOptions.name)}.component.ts`);
        expect(executionViewContent).toMatch(/imports: \[([CommonModule|ExecutionViewModule|TransactionExecutionViewModule]*,*(\r*\n*(\s*))*)+\]/gm);
    });

    it('should be declared and exported in NgModule', async () => {
        const tree = await schematicRunner
            .runSchematicAsync('execution-view', executionViewOptions, appTree)
            .toPromise();

        const executionViewContent = tree.readContent(`${executionViewPath}/wizard-${strings.dasherize(executionViewOptions.name)}.component.ts`);
        expect(executionViewContent).toContain(`declarations: [Wizard${strings.classify(executionViewOptions.name)}Component]`);
        expect(executionViewContent).toContain(`exports: [Wizard${strings.classify(executionViewOptions.name)}Component]`);
        expect(executionViewContent).toContain(`export class Wizard${strings.classify(executionViewOptions.name)}Module { }`);
    });
})