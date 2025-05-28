import { strings } from '@criticalmanufacturing/schematics-devkit';
import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';

describe('Generate Step', () => {
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

  const stepOptions = {
    name: 'ParentMaterials',
    wizard: 'TransferMaterialsToMultiple',
    stepType: 'Column View',
    entityType: 'Material',
    project: libraryOptions.name,
    namespace: 'Navigo'
  };

  const stepPath = `projects/${libraryOptions.name}/src/lib/step-${strings.dasherize(
    stepOptions.name
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

  it('should create the step files', async () => {
    const tree = await schematicRunner.runSchematic('wizard-step', stepOptions, appTree);

    const dasherizedStepName = strings.dasherize(stepOptions.name);

    expect(tree.getDir(stepPath).subfiles).toEqual(
      jasmine.arrayContaining([
        `step-${dasherizedStepName}.component.less`,
        `step-${dasherizedStepName}.component.html`,
        `step-${dasherizedStepName}.component.ts`
      ])
    );
  });

  it('should create the step style file with other extension', async () => {
    const options = { ...stepOptions, style: 'css' };

    const tree = await schematicRunner.runSchematic('wizard-step', options, appTree);

    const dasherizedStepName = strings.dasherize(stepOptions.name);

    expect(tree.getDir(stepPath).subfiles).toEqual(
      jasmine.arrayContaining([`step-${dasherizedStepName}.component.css`])
    );
  });

  it('should not create the step style file', async () => {
    const options = { ...stepOptions, style: 'none' };

    const tree = await schematicRunner.runSchematic('wizard-step', options, appTree);

    const files = tree.getDir(stepPath).subfiles;

    expect(files).toHaveSize(2);
    expect(files).toEqual(
      jasmine.arrayContaining([
        `step-${strings.dasherize(stepOptions.name)}.component.html`,
        `step-${strings.dasherize(stepOptions.name)}.component.ts`
      ])
    );
  });

  it('should have the Component decorator with properties selector, templateUrl, styleUrl, and providers', async () => {
    const tree = await schematicRunner.runSchematic('wizard-step', stepOptions, appTree);

    const stepContent = tree.readContent(
      `${stepPath}/step-${strings.dasherize(stepOptions.name)}.component.ts`
    );
    expect(stepContent).toMatch(/@Component\(/);
    expect(stepContent).toContain(`standalone: true`);
    expect(stepContent).toContain(
      `selector: '${strings.dasherize(stepOptions.project)}-step-${strings.dasherize(stepOptions.name)}'`
    );
    expect(stepContent).toContain(
      `templateUrl: './step-${strings.dasherize(stepOptions.name)}.component.html'`
    );
    expect(stepContent).toContain(
      `styleUrl: './step-${strings.dasherize(stepOptions.name)}.component.less'`
    );
    expect(stepContent).toContain(
      `providers: [{ provide: HOST_VIEW_COMPONENT, useExisting: forwardRef(() => Step${strings.classify(
        stepOptions.name
      )}Component) }]`
    );
  });

  it('should extend CustomizableComponent', async () => {
    const tree = await schematicRunner.runSchematic('wizard-step', stepOptions, appTree);

    const stepContent = tree.readContent(
      `${stepPath}/step-${strings.dasherize(stepOptions.name)}.component.ts`
    );
    expect(stepContent).toContain(
      `export class Step${strings.classify(
        stepOptions.name
      )}Component extends CustomizableComponent`
    );
  });

  it('should inject the PageBag, UtilService, and EntityTypeService', async () => {
    const tree = await schematicRunner.runSchematic('wizard-step', stepOptions, appTree);

    const stepContent = tree.readContent(
      `${stepPath}/step-${strings.dasherize(stepOptions.name)}.component.ts`
    );

    expect(stepContent).toContain('protected readonly _util = inject(UtilService)');
  });
});
