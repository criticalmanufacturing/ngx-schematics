import { strings } from "@angular-devkit/core";
import { SchematicTestRunner, UnitTestTree } from "@angular-devkit/schematics/testing";
import { nameify } from "../utility/string";

describe('Generate Wizard', () => {
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

    const wizardOptions = {
        name: "TestWizard",
        entityType: 'TestEntityType',
        project: libraryOptions.name,
        namespace: 'TestNamespace'
    }

    const wizardPath = `projects/${libraryOptions.name}/src/lib/wizard-${strings.dasherize(wizardOptions.name)}`;

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

    it('should create the wizard files', async () => {
        const tree = await schematicRunner
            .runSchematicAsync('wizard', wizardOptions, appTree)
            .toPromise();

        const dasherizedWizardName = strings.dasherize(wizardOptions.name);

        expect(tree.getDir(wizardPath).subfiles).toEqual(
            jasmine.arrayContaining([
                `wizard-${dasherizedWizardName}.component.less`,
                `wizard-${dasherizedWizardName}.component.html`,
                `wizard-${dasherizedWizardName}.component.ts`,
            ])
        );
    });

    it('should create the wizard style file with other extension', async () => {

        const options = { ...wizardOptions, style: 'css' };

        const tree = await schematicRunner
            .runSchematicAsync('wizard', options, appTree)
            .toPromise();

        const dasherizedWizardName = strings.dasherize(wizardOptions.name);

        expect(tree.getDir(wizardPath).subfiles).toEqual(
            jasmine.arrayContaining([
                `wizard-${dasherizedWizardName}.component.css`
            ])
        );
    });

    it('should not create the wizard style file', async () => {
        const options = { ...wizardOptions, style: 'none' };

        const tree = await schematicRunner
            .runSchematicAsync('wizard', options, appTree)
            .toPromise();

        const files = tree.getDir(wizardPath).subfiles;

        expect(files).toHaveSize(2);
        expect(files).toEqual(
            jasmine.arrayContaining([
                `wizard-${strings.dasherize(wizardOptions.name)}.component.html`,
                `wizard-${strings.dasherize(wizardOptions.name)}.component.ts`,
            ])
        );
    });

    it('should generate the style file empty', async () => {
        const tree = await schematicRunner
            .runSchematicAsync('wizard', wizardOptions, appTree)
            .toPromise();

        const dasherizedWizardName = strings.dasherize(wizardOptions.name);

        const wizardStyleContent = tree.readContent(`${wizardPath}/wizard-${dasherizedWizardName}.component.less`);
        expect(wizardStyleContent).toEqual('');
    });

    it('should generate the html file with `cmf-core-controls-wizard` component selector', async () => {
        const tree = await schematicRunner
            .runSchematicAsync('wizard', wizardOptions, appTree)
            .toPromise();

        const dasherizedWizardName = strings.dasherize(wizardOptions.name);

        const templateRegExp = new RegExp(
            `<cmf-core-controls-wizard \\[cmf-core-business-controls-transaction-wizard\\]="instance!"(\r*\n*(\\s*))` +
                `i18n-mainTitle="@@lib/wizard-${dasherizedWizardName}#TITLE"(\r*\n*(\\s*))` +
                `mainTitle="${nameify(wizardOptions.name)}"(\r*\n*(\\s*))`+
                `i18n-action-name="lib/wizard-${dasherizedWizardName}#ACTION"(\r*\n*(\\s*))` +
                `action-name="Finish">(\r*\n*(\\s*))`+
                    `<!-- Wizard steps -->(\r*\n*(\\s*))` +
                    `<cmf-core-controls-wizard-step(\r*\n*(\\s*))` +
                        `i18n-mainTitle="@@lib/wizard-${dasherizedWizardName}#DETAILS"(\r*\n*(\\s*))` +
                        `mainTitle="Details">(\r*\n*(\\s*))` +
                        `<p>Wizard ${nameify(wizardOptions.name)} works!</p>(\r*\n*(\\s*))` +
                    `</cmf-core-controls-wizard-step>(\r*\n*(\\s*))` +
            `</cmf-core-controls-wizard>`,
            'gm');

        const wizardTemplateContent = tree.readContent(`${wizardPath}/wizard-${dasherizedWizardName}.component.html`);
        expect(wizardTemplateContent).toMatch(templateRegExp);
    });

    it('should have the Component decorator with properties selector, templateUrl, styleUrls, and viewProviders', async () => {

        const tree = await schematicRunner
            .runSchematicAsync('wizard', wizardOptions, appTree)
            .toPromise();

        const wizardContent = tree.readContent(`${wizardPath}/wizard-${strings.dasherize(wizardOptions.name)}.component.ts`);
        expect(wizardContent).toMatch(/@Component\(/);
        expect(wizardContent).toContain(`selector: 'lib-wizard-${strings.dasherize(wizardOptions.name)}'`);
        expect(wizardContent).toContain(`templateUrl: './wizard-${strings.dasherize(wizardOptions.name)}.component.html'`);
        expect(wizardContent).toContain(`styleUrls: ['./wizard-${strings.dasherize(wizardOptions.name)}.component.less']`);
        expect(wizardContent).toContain(`viewProviders: [{ provide: HOST_VIEW_COMPONENT, useExisting: forwardRef(() => Wizard${strings.classify(wizardOptions.name)}Component) }]`);
    });

    it('should extend CustomizableComponent', async () => {
        const tree = await schematicRunner
            .runSchematicAsync('wizard', wizardOptions, appTree)
            .toPromise();

        const wizardContent = tree.readContent(`${wizardPath}/wizard-${strings.dasherize(wizardOptions.name)}.component.ts`);
        expect(wizardContent).toContain(`export class Wizard${strings.classify(wizardOptions.name)}Component extends CustomizableComponent`);
    });

    it('should implement TransactionWizard and OnInit', async () => {
        const tree = await schematicRunner
            .runSchematicAsync('wizard', wizardOptions, appTree)
            .toPromise();

        const wizardContent = tree.readContent(`${wizardPath}/wizard-${strings.dasherize(wizardOptions.name)}.component.ts`);
        expect(wizardContent).toContain(`implements TransactionWizard, OnInit`);
        expect(wizardContent).toContain(`public async prepareDataInput(): Promise<Cmf.Foundation.BusinessOrchestration.BaseInput[]> {`);
        expect(wizardContent).toContain(`public async handleDataOutput(outputs: Cmf.Foundation.BusinessOrchestration.BaseOutput[], wizardArgs?: WizardEventArgs): Promise<void> {`);
        expect(wizardContent).toContain(`public async prepareTransactionInput(args: TransactionEventArgs): Promise<Cmf.Foundation.BusinessOrchestration.BaseInput> {`);
        expect(wizardContent).toContain(`public async handleTransactionOutput(output: Cmf.Foundation.BusinessOrchestration.BaseOutput): Promise<void> {`);
        expect(wizardContent).toContain(`public ngOnInit(): void {`);
    });

    it('should have the constructor receiving the ViewContainerRef, PageBag, UtilService, and EntityTypeService', async () => {
        const tree = await schematicRunner
            .runSchematicAsync('wizard', wizardOptions, appTree)
            .toPromise();

        const wizardContent = tree.readContent(`${wizardPath}/wizard-${strings.dasherize(wizardOptions.name)}.component.ts`);
        expect(wizardContent).toMatch(/constructor\(([viewContainerRef: ViewContainerRef|private pageBag: PageBag|private util: UtilService|private entityTypes: EntityTypeService]*,*(\r*\n*(\s*))*)+\)/gm);
        expect(wizardContent).toContain('super(viewContainerRef);');
    });

    it('should import CommonModule and TransactionWizardModule in NgModule', async () => {
        const tree = await schematicRunner
            .runSchematicAsync('wizard', wizardOptions, appTree)
            .toPromise();

        const wizardContent = tree.readContent(`${wizardPath}/wizard-${strings.dasherize(wizardOptions.name)}.component.ts`);
        expect(wizardContent).toMatch(/imports: \[([CommonModule|TransactionWizardModule]*,*(\r*\n*(\s*))*)+\]/gm);
    });

    it('should be declared and exported in NgModule', async () => {
        const tree = await schematicRunner
            .runSchematicAsync('wizard', wizardOptions, appTree)
            .toPromise();

        const wizardContent = tree.readContent(`${wizardPath}/wizard-${strings.dasherize(wizardOptions.name)}.component.ts`);
        expect(wizardContent).toContain(`declarations: [Wizard${strings.classify(wizardOptions.name)}Component]`);
        expect(wizardContent).toContain(`exports: [Wizard${strings.classify(wizardOptions.name)}Component]`);
        expect(wizardContent).toContain(`export class Wizard${strings.classify(wizardOptions.name)}Module { }`);
    });
})