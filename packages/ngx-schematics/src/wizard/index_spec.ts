import { strings } from '@criticalmanufacturing/schematics-devkit';
import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';

describe('Generate Wizard', () => {
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

  const wizardOptions = {
    name: 'TestWizard',
    entityType: 'TestEntityType',
    project: libraryOptions.name,
    namespace: 'TestNamespace'
  };

  const wizardPath = `projects/${libraryOptions.name}/src/lib/wizard-${strings.dasherize(
    wizardOptions.name
  )}`;

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

  it('should create the wizard files', async () => {
    const tree = await schematicRunner.runSchematic('wizard', wizardOptions, appTree);

    const dasherizedWizardName = strings.dasherize(wizardOptions.name);

    expect(tree.getDir(wizardPath).subfiles).toEqual(
      jasmine.arrayContaining([
        `wizard-${dasherizedWizardName}.component.less`,
        `wizard-${dasherizedWizardName}.component.html`,
        `wizard-${dasherizedWizardName}.component.ts`
      ])
    );
  });

  it('should create the wizard style file with other extension', async () => {
    const options = { ...wizardOptions, style: 'css' };

    const tree = await schematicRunner.runSchematic('wizard', options, appTree);

    const dasherizedWizardName = strings.dasherize(wizardOptions.name);

    expect(tree.getDir(wizardPath).subfiles).toEqual(
      jasmine.arrayContaining([`wizard-${dasherizedWizardName}.component.css`])
    );
  });

  it('should not create the wizard style file', async () => {
    const options = { ...wizardOptions, style: 'none' };

    const tree = await schematicRunner.runSchematic('wizard', options, appTree);

    const files = tree.getDir(wizardPath).subfiles;

    expect(files).toHaveSize(2);
    expect(files).toEqual(
      jasmine.arrayContaining([
        `wizard-${strings.dasherize(wizardOptions.name)}.component.html`,
        `wizard-${strings.dasherize(wizardOptions.name)}.component.ts`
      ])
    );
  });

  it('should generate the style file empty', async () => {
    const tree = await schematicRunner.runSchematic('wizard', wizardOptions, appTree);

    const dasherizedWizardName = strings.dasherize(wizardOptions.name);

    const wizardStyleContent = tree.readContent(
      `${wizardPath}/wizard-${dasherizedWizardName}.component.less`
    );
    expect(wizardStyleContent).toEqual('');
  });

  it('should generate the html file with `cmf-core-controls-wizard` component selector', async () => {
    const tree = await schematicRunner.runSchematic('wizard', wizardOptions, appTree);

    const dasherizedWizardName = strings.dasherize(wizardOptions.name);

    const templateRegExp = new RegExp(
      `<cmf-core-controls-wizard \\[cmf-core-business-controls-transaction-wizard\\]="instance"\\s*` +
        `i18n-mainTitle="@@${strings.dasherize(
          wizardOptions.project
        )}/wizard-${dasherizedWizardName}#TITLE"\\s*` +
        `mainTitle="${strings.nameify(wizardOptions.name)}"\\s*` +
        `i18n-action-name="@@${strings.dasherize(
          wizardOptions.project
        )}/wizard-${dasherizedWizardName}#ACTION"\\s*` +
        `action-name="Finish">\\s*` +
        `<!-- Wizard steps -->\\s*` +
        `<cmf-core-controls-wizard-step\\s*` +
        `i18n-mainTitle="@@${strings.dasherize(
          wizardOptions.project
        )}/wizard-${dasherizedWizardName}#DETAILS"\\s*` +
        `mainTitle="Details">\\s*` +
        `<p>Wizard ${strings.nameify(wizardOptions.name)} works!</p>\\s*` +
        `</cmf-core-controls-wizard-step>\\s*` +
        `</cmf-core-controls-wizard>`,
      'gm'
    );

    const wizardTemplateContent = tree.readContent(
      `${wizardPath}/wizard-${dasherizedWizardName}.component.html`
    );
    expect(wizardTemplateContent).toMatch(templateRegExp);
  });

  it('should have the Component decorator with properties selector, templateUrl, styleUrls, and viewProviders', async () => {
    const tree = await schematicRunner.runSchematic('wizard', wizardOptions, appTree);

    const wizardContent = tree.readContent(
      `${wizardPath}/wizard-${strings.dasherize(wizardOptions.name)}.component.ts`
    );
    expect(wizardContent).toMatch(/@Component\(/);
    expect(wizardContent).toContain(`standalone: true`);
    expect(wizardContent).toContain(
      `selector: '${strings.dasherize(wizardOptions.project)}-wizard-${strings.dasherize(
        wizardOptions.name
      )}'`
    );
    expect(wizardContent).toMatch(
      /imports: \[\s*((CommonModule|TransactionWizardModule)\s*,?\s*){2}\]/gm
    );
    expect(wizardContent).toContain(
      `templateUrl: './wizard-${strings.dasherize(wizardOptions.name)}.component.html'`
    );
    expect(wizardContent).toContain(
      `styleUrls: ['./wizard-${strings.dasherize(wizardOptions.name)}.component.less']`
    );
    expect(wizardContent).toContain(
      `viewProviders: [{ provide: HOST_VIEW_COMPONENT, useExisting: forwardRef(() => Wizard${strings.classify(
        wizardOptions.name
      )}Component) }]`
    );
  });

  it('should extend CustomizableComponent', async () => {
    const tree = await schematicRunner.runSchematic('wizard', wizardOptions, appTree);

    const wizardContent = tree.readContent(
      `${wizardPath}/wizard-${strings.dasherize(wizardOptions.name)}.component.ts`
    );
    expect(wizardContent).toContain(
      `export class Wizard${strings.classify(
        wizardOptions.name
      )}Component extends CustomizableComponent`
    );
  });

  it('should implement TransactionWizard and OnInit', async () => {
    const tree = await schematicRunner.runSchematic('wizard', wizardOptions, appTree);

    const wizardContent = tree.readContent(
      `${wizardPath}/wizard-${strings.dasherize(wizardOptions.name)}.component.ts`
    );
    expect(wizardContent).toContain(`implements OnInit, TransactionWizard`);
    expect(wizardContent).toContain(
      `public async prepareDataInput(): Promise<Cmf.Foundation.BusinessOrchestration.BaseInput[]> {`
    );
    expect(wizardContent).toContain(
      `public async handleDataOutput(outputs: Cmf.Foundation.BusinessOrchestration.BaseOutput[], wizardArgs?: WizardEventArgs): Promise<void> {`
    );
    expect(wizardContent).toContain(
      `public async prepareTransactionInput(args: TransactionEventArgs): Promise<Cmf.Foundation.BusinessOrchestration.BaseInput> {`
    );
    expect(wizardContent).toContain(
      `public async handleTransactionOutput(output: Cmf.Foundation.BusinessOrchestration.BaseOutput): Promise<void> {`
    );
    expect(wizardContent).toContain(`public ngOnInit(): void {`);
  });

  it('should inject the PageBag, UtilService, and EntityTypeService', async () => {
    const tree = await schematicRunner.runSchematic('wizard', wizardOptions, appTree);

    const wizardContent = tree.readContent(
      `${wizardPath}/wizard-${strings.dasherize(wizardOptions.name)}.component.ts`
    );

    expect(wizardContent).toContain('protected pageBag = inject(PageBag)');
    expect(wizardContent).toContain('protected util = inject(UtilService)');
    expect(wizardContent).toContain('protected entityTypes = inject(EntityTypeService)');
    expect(wizardContent).not.toContain('constructor');
  });
});
