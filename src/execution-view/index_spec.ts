import { strings } from '@angular-devkit/core';
import {
  SchematicTestRunner,
  UnitTestTree
} from '@angular-devkit/schematics/testing';
import { nameify } from '../utility/string';

describe('Generate Execution View', () => {
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

  const executionViewOptions = {
    name: 'TestExecutionView',
    entityType: 'TestEntityType',
    project: libraryOptions.name,
    namespace: 'TestNamespace'
  };

  const executionViewPath = `projects/${
    libraryOptions.name
  }/src/lib/wizard-${strings.dasherize(executionViewOptions.name)}`;

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

  it('should create the execution view files', async () => {
    const tree = await schematicRunner.runSchematic(
      'execution-view',
      executionViewOptions,
      appTree
    );

    const dasherizedExecutionViewName = strings.dasherize(
      executionViewOptions.name
    );

    expect(tree.getDir(executionViewPath).subfiles).toEqual(
      jasmine.arrayContaining([
        `wizard-${dasherizedExecutionViewName}.component.less`,
        `wizard-${dasherizedExecutionViewName}.component.html`,
        `wizard-${dasherizedExecutionViewName}.component.ts`
      ])
    );
  });

  it('should create the execution view style file with other extension', async () => {
    const options = { ...executionViewOptions, style: 'css' };

    const tree = await schematicRunner.runSchematic(
      'execution-view',
      options,
      appTree
    );

    const dasherizedExecutionViewName = strings.dasherize(
      executionViewOptions.name
    );

    expect(tree.getDir(executionViewPath).subfiles).toEqual(
      jasmine.arrayContaining([
        `wizard-${dasherizedExecutionViewName}.component.css`
      ])
    );
  });

  it('should not create the execution view style file', async () => {
    const options = { ...executionViewOptions, style: 'none' };

    const tree = await schematicRunner.runSchematic(
      'execution-view',
      options,
      appTree
    );

    const files = tree.getDir(executionViewPath).subfiles;

    expect(files).toHaveSize(2);
    expect(files).toEqual(
      jasmine.arrayContaining([
        `wizard-${strings.dasherize(executionViewOptions.name)}.component.html`,
        `wizard-${strings.dasherize(executionViewOptions.name)}.component.ts`
      ])
    );
  });

  it('should generate the style file empty', async () => {
    const tree = await schematicRunner.runSchematic(
      'execution-view',
      executionViewOptions,
      appTree
    );

    const dasherizedExecutionViewName = strings.dasherize(
      executionViewOptions.name
    );

    const executionViewStyleContent = tree.readContent(
      `${executionViewPath}/wizard-${dasherizedExecutionViewName}.component.less`
    );
    expect(executionViewStyleContent).toEqual('');
  });

  it('should generate the html file with `cmf-core-controls-execution-view` component selector', async () => {
    const tree = await schematicRunner.runSchematic(
      'execution-view',
      executionViewOptions,
      appTree
    );

    const dasherizedExecutionViewName = strings.dasherize(
      executionViewOptions.name
    );

    const templateRegExp = new RegExp(
      `<cmf-core-controls-execution-view \\[cmf-core-business-controls-transaction-execution-view\\]="instance"\\s*` +
        `i18n-mainTitle="@@${strings.dasherize(
          executionViewOptions.project
        )}/wizard-${dasherizedExecutionViewName}#TITLE" mainTitle="${nameify(
          executionViewOptions.name
        )}"\\s*` +
        `i18n-action-name="@@${strings.dasherize(
          executionViewOptions.project
        )}/wizard-${dasherizedExecutionViewName}#ACTION" action-name="Finish">\\s*` +
        `<!-- Execution View steps -->\\s*` +
        `<cmf-core-controls-execution-view-tab i18n-mainTitle="@@${strings.dasherize(
          executionViewOptions.project
        )}/wizard-${dasherizedExecutionViewName}#DETAILS" mainTitle="Details">\\s*` +
        `<p>${nameify(executionViewOptions.name)} Wizard works!</p>\\s*` +
        `</cmf-core-controls-execution-view-tab>\\s*` +
        `</cmf-core-controls-execution-view>`,
      'gm'
    );

    const executionViewTemplateContent = tree.readContent(
      `${executionViewPath}/wizard-${dasherizedExecutionViewName}.component.html`
    );
    expect(executionViewTemplateContent).toMatch(templateRegExp);
  });

  it('should have the Component decorator with properties selector, templateUrl, styleUrls, and viewProviders', async () => {
    const tree = await schematicRunner.runSchematic(
      'execution-view',
      executionViewOptions,
      appTree
    );

    const executionViewContent = tree.readContent(
      `${executionViewPath}/wizard-${strings.dasherize(
        executionViewOptions.name
      )}.component.ts`
    );
    expect(executionViewContent).toMatch(/@Component\(/);
    expect(executionViewContent).toContain(`standalone: true`);
    expect(executionViewContent).toContain(
      `selector: '${strings.dasherize(
        executionViewOptions.project
      )}-wizard-${strings.dasherize(executionViewOptions.name)}'`
    );
    expect(executionViewContent).toMatch(
      /imports: \[\s*((CommonModule|ExecutionViewModule|TransactionExecutionViewModule)\s*,?\s*){3}\]/gm
    );
    expect(executionViewContent).toContain(
      `templateUrl: './wizard-${strings.dasherize(
        executionViewOptions.name
      )}.component.html'`
    );
    expect(executionViewContent).toContain(
      `styleUrls: ['./wizard-${strings.dasherize(
        executionViewOptions.name
      )}.component.less']`
    );
    expect(executionViewContent).toContain(
      `viewProviders: [{ provide: HOST_VIEW_COMPONENT, useExisting: forwardRef(() => Wizard${strings.classify(
        executionViewOptions.name
      )}Component) }]`
    );
  });

  it('should extend CustomizableComponent', async () => {
    const tree = await schematicRunner.runSchematic(
      'execution-view',
      executionViewOptions,
      appTree
    );

    const executionViewContent = tree.readContent(
      `${executionViewPath}/wizard-${strings.dasherize(
        executionViewOptions.name
      )}.component.ts`
    );
    expect(executionViewContent).toContain(
      `export class Wizard${strings.classify(
        executionViewOptions.name
      )}Component extends CustomizableComponent`
    );
  });

  it('should implement TransactionExecutionView and OnInit', async () => {
    const tree = await schematicRunner.runSchematic(
      'execution-view',
      executionViewOptions,
      appTree
    );

    const executionViewContent = tree.readContent(
      `${executionViewPath}/wizard-${strings.dasherize(
        executionViewOptions.name
      )}.component.ts`
    );
    expect(executionViewContent).toContain(
      `implements TransactionExecutionView, OnInit`
    );
    expect(executionViewContent).toContain(
      `public async prepareDataInput(): Promise<Cmf.Foundation.BusinessOrchestration.BaseInput[]> {`
    );
    expect(executionViewContent).toContain(
      `public async handleDataOutput(outputs: Cmf.Foundation.BusinessOrchestration.BaseOutput[], executionViewArgs?: ExecutionViewEventArgs): Promise<void> {`
    );
    expect(executionViewContent).toContain(
      `public async prepareTransactionInput(args: TransactionEventArgs): Promise<Cmf.Foundation.BusinessOrchestration.BaseInput> {`
    );
    expect(executionViewContent).toContain(
      `public async handleTransactionOutput(output: Cmf.Foundation.BusinessOrchestration.BaseOutput): Promise<void> {`
    );
    expect(executionViewContent).toContain(`public ngOnInit(): void {`);
  });

  it('should have the constructor receiving the ViewContainerRef, PageBag, UtilService, and EntityTypeService', async () => {
    const tree = await schematicRunner.runSchematic(
      'execution-view',
      executionViewOptions,
      appTree
    );

    const executionViewContent = tree.readContent(
      `${executionViewPath}/wizard-${strings.dasherize(
        executionViewOptions.name
      )}.component.ts`
    );
    expect(executionViewContent).toMatch(
      /constructor\(\s*((viewContainerRef: ViewContainerRef|private pageBag: PageBag|private util: UtilService|private entityTypes: EntityTypeService)\s*,?\s*){4}\)/gm
    );
    expect(executionViewContent).toContain('super(viewContainerRef);');
  });
});
