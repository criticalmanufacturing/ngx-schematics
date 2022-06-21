import { strings } from "@angular-devkit/core";
import { SchematicTestRunner, UnitTestTree } from "@angular-devkit/schematics/testing";

describe('Generate Wizard Create Edit', () => {
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
        name: "TestWizardCreateEdit",
        entityType: 'TestEntityType',
        project: libraryOptions.name,
        namespace: 'TestNamespace'
    }

    const wizardPath = `projects/${libraryOptions.name}/src/lib/wizard-create-edit-${strings.dasherize(wizardOptions.name)}`;

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
            .runSchematicAsync('wizard-create-edit', wizardOptions, appTree)
            .toPromise();

        const dasherizedWizardName = strings.dasherize(wizardOptions.name);

        expect(tree.getDir(wizardPath).subfiles).toEqual(
            jasmine.arrayContaining([
                `wizard-create-edit-${dasherizedWizardName}.component.less`,
                `wizard-create-edit-${dasherizedWizardName}.component.html`,
                `wizard-create-edit-${dasherizedWizardName}.component.ts`,
            ])
        );
    });

    it('should create the wizard style file with other extension', async () => {

        const options = { ...wizardOptions, style: 'css' };

        const tree = await schematicRunner
            .runSchematicAsync('wizard-create-edit', options, appTree)
            .toPromise();

        const dasherizedWizardName = strings.dasherize(wizardOptions.name);

        expect(tree.getDir(wizardPath).subfiles).toEqual(
            jasmine.arrayContaining([
                `wizard-create-edit-${dasherizedWizardName}.component.css`
            ])
        );
    });

    it('should not create the wizard style file', async () => {
        const options = { ...wizardOptions, style: 'none' };

        const tree = await schematicRunner
            .runSchematicAsync('wizard-create-edit', options, appTree)
            .toPromise();

        const files = tree.getDir(wizardPath).subfiles;

        expect(files).toHaveSize(2);
        expect(files).toEqual(
            jasmine.arrayContaining([
                `wizard-create-edit-${strings.dasherize(wizardOptions.name)}.component.html`,
                `wizard-create-edit-${strings.dasherize(wizardOptions.name)}.component.ts`,
            ])
        );
    });

    it('should generate the style file empty', async () => {
        const tree = await schematicRunner
            .runSchematicAsync('wizard-create-edit', wizardOptions, appTree)
            .toPromise();

        const dasherizedWizardName = strings.dasherize(wizardOptions.name);

        const wizardStyleContent = tree.readContent(`${wizardPath}/wizard-create-edit-${dasherizedWizardName}.component.less`);
        expect(wizardStyleContent).toEqual('');
    });

    it('should generate the html file with `cmf-core-business-controls-createEditEntity` component selector', async () => {
        const tree = await schematicRunner
            .runSchematicAsync('wizard-create-edit', wizardOptions, appTree)
            .toPromise();

        const dasherizedWizardName = strings.dasherize(wizardOptions.name);

        const templateRegExp = new RegExp(
            `<cmf-core-business-controls-createEditEntity\\s*` +
                `\\[editMode\\]="editMode"\\s*` +
                `\\[mainTitle\\]="title"\\s*` +
                `\\[actionName\\]="action"\\s*` +
                `\\[onInitialSetupStart\\]="onInitialSetupStart"\\s*` +
                `\\[onInitialSetupFinish\\]="onInitialSetupFinish"\\s*` +
                `\\[onBeforeServiceCall\\]="onBeforeServiceCall"\\s*` +
                `\\[instance\\]="instance">\\s*` +

                `<!-- General Data Step -->\\s*` +
                `<cmf-core-business-controls-createEditStepGeneralData\\s*` +
                    `i18n-mainTitle="@@${strings.dasherize(wizardOptions.project)}/wizard-create-edit-${strings.dasherize(wizardOptions.name)}#GENERAL_DATA" mainTitle="General Data"\\s*` +
                    `\\[instance\\]="instance"\\s*` +
                    `\\[editMode\\]="editMode">\\s*` +
                `</cmf-core-business-controls-createEditStepGeneralData>\\s*` +
            `</cmf-core-business-controls-createEditEntity>`,
            'gm'
        );

        const wizardTemplateContent = tree.readContent(`${wizardPath}/wizard-create-edit-${dasherizedWizardName}.component.html`);
        expect(wizardTemplateContent).toMatch(templateRegExp);
    });

    it('should have the Component decorator with properties selector, templateUrl, and styleUrls', async () => {

        const tree = await schematicRunner
            .runSchematicAsync('wizard-create-edit', wizardOptions, appTree)
            .toPromise();

        const wizardContent = tree.readContent(`${wizardPath}/wizard-create-edit-${strings.dasherize(wizardOptions.name)}.component.ts`);
        expect(wizardContent).toMatch(/@Component\(/);
        expect(wizardContent).toContain(`selector: '${strings.dasherize(wizardOptions.project)}-wizard-create-edit-${strings.dasherize(wizardOptions.name)}'`);
        expect(wizardContent).toContain(`templateUrl: './wizard-create-edit-${strings.dasherize(wizardOptions.name)}.component.html'`);
        expect(wizardContent).toContain(`styleUrls: ['./wizard-create-edit-${strings.dasherize(wizardOptions.name)}.component.less']`);
    });

    it('should extend CustomizableComponent', async () => {
        const tree = await schematicRunner
            .runSchematicAsync('wizard-create-edit', wizardOptions, appTree)
            .toPromise();

        const wizardContent = tree.readContent(`${wizardPath}/wizard-create-edit-${strings.dasherize(wizardOptions.name)}.component.ts`);
        expect(wizardContent).toContain(`export class WizardCreateEdit${strings.classify(wizardOptions.name)}Component extends CustomizableComponent`);
    });

    it('should implement OnInit', async () => {
        const tree = await schematicRunner
            .runSchematicAsync('wizard-create-edit', wizardOptions, appTree)
            .toPromise();

        const wizardContent = tree.readContent(`${wizardPath}/wizard-create-edit-${strings.dasherize(wizardOptions.name)}.component.ts`);
        expect(wizardContent).toContain(`implements OnInit`);
        expect(wizardContent).toContain(`public ngOnInit(): void {`);
    });

    it('should have the constructor receiving the ViewContainerRef, PageBag, UtilService, and EntityTypeService', async () => {
        const tree = await schematicRunner
            .runSchematicAsync('wizard-create-edit', wizardOptions, appTree)
            .toPromise();

        const wizardContent = tree.readContent(`${wizardPath}/wizard-create-edit-${strings.dasherize(wizardOptions.name)}.component.ts`);
        expect(wizardContent).toMatch(/constructor\(\s*((viewContainerRef: ViewContainerRef|private _pageBag: PageBag|private util: UtilService|private entityTypes: EntityTypeService)\s*,?\s*){4}\)/gm);
        expect(wizardContent).toContain('super(viewContainerRef);');
    });

    it('should implement the onInitialSetupStart, onInitialSetupFinish, and onBeforeServiceCall functions', async () => {
        const tree = await schematicRunner
            .runSchematicAsync('wizard-create-edit', wizardOptions, appTree)
            .toPromise();
        
        const wizardContent = tree.readContent(`${wizardPath}/wizard-create-edit-${strings.dasherize(wizardOptions.name)}.component.ts`);
        expect(wizardContent).toContain('public onInitialSetupStart = (): Cmf.Foundation.BusinessOrchestration.BaseInput[] => {');
        expect(wizardContent).toContain('public onInitialSetupFinish = (instance: any, outputs: Cmf.Foundation.BusinessOrchestration.BaseOutput[]): void => {');
        expect(wizardContent).toContain('public onBeforeServiceCall = (): Cmf.Foundation.BusinessOrchestration.BaseInput => {');
    });

    it('should import CommonModule, CreateEditEntityModule, and CreateEditStepGeneralDataModule in NgModule', async () => {
        const tree = await schematicRunner
            .runSchematicAsync('wizard-create-edit', wizardOptions, appTree)
            .toPromise();

        const wizardContent = tree.readContent(`${wizardPath}/wizard-create-edit-${strings.dasherize(wizardOptions.name)}.component.ts`);
        expect(wizardContent).toMatch(/imports: \[\s*((CommonModule|CreateEditEntityModule|CreateEditStepGeneralDataModule)\s*,?\s*){3}\]/gm);
    });

    it('should be declared and exported in NgModule', async () => {
        const tree = await schematicRunner
            .runSchematicAsync('wizard-create-edit', wizardOptions, appTree)
            .toPromise();

        const wizardContent = tree.readContent(`${wizardPath}/wizard-create-edit-${strings.dasherize(wizardOptions.name)}.component.ts`);
        expect(wizardContent).toContain(`declarations: [WizardCreateEdit${strings.classify(wizardOptions.name)}Component]`);
        expect(wizardContent).toContain(`exports: [WizardCreateEdit${strings.classify(wizardOptions.name)}Component]`);
        expect(wizardContent).toContain(`export class WizardCreateEdit${strings.classify(wizardOptions.name)}Module { }`);
    });
})