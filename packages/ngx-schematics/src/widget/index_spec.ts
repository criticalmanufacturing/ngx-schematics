import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
import { getAllFilesFromDir } from '@criticalmanufacturing/schematics-devkit/testing';
import { strings } from '@criticalmanufacturing/schematics-devkit';

describe('Generate Widget', () => {
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

  const widgetOptions = {
    name: 'test',
    project: libraryOptions.name,
    style: 'less'
  };

  const defaultWidgetFilePath = `projects/${libraryOptions.name}/src/lib/${widgetOptions.name}-widget/${widgetOptions.name}-widget.component`;
  const defaultWidgetSettingsFilePath = `projects/${libraryOptions.name}/src/lib/${widgetOptions.name}-widget/${widgetOptions.name}-widget-settings/${widgetOptions.name}-widget-settings`;
  const defaultWidgetSettingsComponentFilePath = defaultWidgetSettingsFilePath + `.component`;

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

  it('should create the widget files', async () => {
    const tree = await schematicRunner.runSchematic('widget', widgetOptions, appTree);

    const files = getAllFilesFromDir(
      `projects/${libraryOptions.name}/src/lib/${widgetOptions.name}-widget`,
      tree
    );

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

    const tree = await schematicRunner.runSchematic('widget', options, appTree);

    const files = getAllFilesFromDir(
      `projects/${libraryOptions.name}/src/lib/${widgetOptions.name}-widget/${widgetOptions.name}-widget-settings`,
      tree
    );

    expect(files).toEqual(
      jasmine.arrayContaining([`${defaultWidgetSettingsComponentFilePath}.css`])
    );
  });

  it('should not create the widget style file', async () => {
    const options = { ...widgetOptions, style: 'none' };

    const tree = await schematicRunner.runSchematic('widget', options, appTree);

    const files = getAllFilesFromDir(
      `projects/${libraryOptions.name}/src/lib/${widgetOptions.name}-widget`,
      tree
    );
    expect(files).toHaveSize(5);
    expect(files).toEqual(
      jasmine.arrayContaining([
        `${defaultWidgetSettingsComponentFilePath}.html`,
        `${defaultWidgetSettingsComponentFilePath}.ts`,
        `${defaultWidgetSettingsFilePath}.service.ts`,
        `${defaultWidgetFilePath}.html`,
        `${defaultWidgetFilePath}.ts`
      ])
    );
  });

  it('should have the Component and Widget decorators', async () => {
    const tree = await schematicRunner.runSchematic('widget', widgetOptions, appTree);

    const widgetContent = tree.readContent(`${defaultWidgetFilePath}.ts`);
    expect(widgetContent).toMatch(/@Widget\(/);
    expect(widgetContent).toMatch(/@Component\(/);
  });

  it('should have the name, iconClass, and settingsComponent properties in the Widget decorator', async () => {
    const tree = await schematicRunner.runSchematic('widget', widgetOptions, appTree);

    const widgetContent = tree.readContent(`${defaultWidgetFilePath}.ts`);
    expect(widgetContent).toContain(
      `name: $localize\`:@@${strings.dasherize(widgetOptions.project)}/${strings.dasherize(
        widgetOptions.name
      )}-widget#NAME:${strings.nameify(widgetOptions.name)} Widget\``
    );
    expect(widgetContent).toContain(`iconClass: 'icon-core-st-lg-generic'`);
    expect(widgetContent).toMatch(
      new RegExp(
        `settingsComponent: {\\s*component: ${strings.classify(
          widgetOptions.name
        )}WidgetSettingsComponent\\s*}`,
        'gm'
      )
    );
  });

  it('should have the Component decorator having a different extension for the style file', async () => {
    const options = { ...widgetOptions, style: 'css' };

    const tree = await schematicRunner.runSchematic('widget', options, appTree);

    const widgetSettingsContent = tree.readContent(`${defaultWidgetFilePath}.ts`);
    expect(widgetSettingsContent).toContain(
      `styleUrls: ['./${strings.dasherize(widgetOptions.name)}-widget.component.${options.style}']`
    );
  });

  it('should have the Component decorator without property styleUrls', async () => {
    const options = { ...widgetOptions, style: 'none' };

    const tree = await schematicRunner.runSchematic('widget', options, appTree);

    const widgetContent = tree.readContent(`${defaultWidgetFilePath}.ts`);
    expect(widgetContent)
      .withContext('The styleUrls should not be fulfilled')
      .not.toMatch(/styleUrls: \['.\/(\w*-*)+-widget.component.\w*'\]/);
  });

  it('should have the selector, templateUrl, and styleUrls properties in the Component decorator', async () => {
    const tree = await schematicRunner.runSchematic('widget', widgetOptions, appTree);

    const widgetContent = tree.readContent(`${defaultWidgetFilePath}.ts`);
    expect(widgetContent).toContain(
      `selector: '${strings.dasherize(widgetOptions.project)}-${strings.dasherize(
        widgetOptions.name
      )}-widget'`
    );
    expect(widgetContent).toContain(
      `templateUrl: './${strings.dasherize(widgetOptions.name)}-widget.component.html'`
    );
    expect(widgetContent).toContain(
      `styleUrls: ['./${strings.dasherize(widgetOptions.name)}-widget.component.less']`
    );
  });

  it('should extend WidgetGeneric and implement WidgetRepresentation', async () => {
    const tree = await schematicRunner.runSchematic('widget', widgetOptions, appTree);

    const widgetClassName = `${strings.classify(widgetOptions.name)}Widget`;

    const widgetContent = tree.readContent(`${defaultWidgetFilePath}.ts`);
    expect(widgetContent).toContain(
      `export class ${widgetClassName} extends WidgetGeneric implements WidgetRepresentation {`
    );
  });

  it('should have the constructor receiving the ViewContainerRef, ElementRef and FeedbackService.', async () => {
    const tree = await schematicRunner.runSchematic('widget', widgetOptions, appTree);

    const widgetContent = tree.readContent(`${defaultWidgetFilePath}.ts`);
    expect(widgetContent).toMatch(
      /constructor\(\s*((viewContainerRef: ViewContainerRef|elementRef: ElementRef|feedback: FeedbackService)\s*,?\s*){3}\)/gm
    );
    expect(widgetContent).toContain('super(viewContainerRef, elementRef, feedback);');
  });

  describe('- Generate Widget Settings', () => {
    it('should create the widget settings file', async () => {
      const tree = await schematicRunner.runSchematic('widget', widgetOptions, appTree);

      const files = getAllFilesFromDir(
        `projects/${libraryOptions.name}/src/lib/${widgetOptions.name}-widget/${widgetOptions.name}-widget-settings`,
        tree
      );

      expect(files).toEqual(
        jasmine.arrayContaining([
          `${defaultWidgetSettingsComponentFilePath}.html`,
          `${defaultWidgetSettingsComponentFilePath}.ts`,
          `${defaultWidgetSettingsComponentFilePath}.less`
        ])
      );
    });

    it('should generate the html file with `cmf-core-dashboards-widgetSettings` component selector', async () => {
      const tree = await schematicRunner.runSchematic('widget', widgetOptions, appTree);

      const templateRegExp = new RegExp(
        `<cmf-core-dashboards-widgetSettings>\\s*\\` + `<\/cmf-core-dashboards-widgetSettings>`,
        'gm'
      );

      const widgetSettingsTemplateContent = tree.readContent(
        `${defaultWidgetSettingsComponentFilePath}.html`
      );
      expect(widgetSettingsTemplateContent).toMatch(templateRegExp);
    });

    it('should generate the style file empty', async () => {
      const tree = await schematicRunner.runSchematic('widget', widgetOptions, appTree);

      const widgetSettingsStyleContent = tree.readContent(
        `${defaultWidgetSettingsComponentFilePath}.less`
      );
      expect(widgetSettingsStyleContent).toEqual('');
    });

    it('should have the Component decorator with properties selector, templateUrl, and styleUrls', async () => {
      const tree = await schematicRunner.runSchematic('widget', widgetOptions, appTree);

      const widgetSettingsContent = tree.readContent(
        `${defaultWidgetSettingsComponentFilePath}.ts`
      );
      expect(widgetSettingsContent).toMatch(/@Component\(/);
      expect(widgetSettingsContent).toContain('standalone: true');
      expect(widgetSettingsContent).toContain(
        `selector: '${strings.dasherize(widgetOptions.project)}-${strings.dasherize(
          widgetOptions.name
        )}-widget-settings'`
      );
      expect(widgetSettingsContent).toContain('imports: [CommonModule, WidgetSettingsModule]');
      expect(widgetSettingsContent).toContain(
        `templateUrl: './${strings.dasherize(widgetOptions.name)}-widget-settings.component.html'`
      );
      expect(widgetSettingsContent).toContain(
        `styleUrls: ['./${strings.dasherize(widgetOptions.name)}-widget-settings.component.less']`
      );
    });

    it('should have the Component decorator having a different extension for the style file', async () => {
      const options = { ...widgetOptions, style: 'css' };

      const tree = await schematicRunner.runSchematic('widget', options, appTree);

      const widgetSettingsContent = tree.readContent(
        `${defaultWidgetSettingsComponentFilePath}.ts`
      );
      expect(widgetSettingsContent).toContain(
        `styleUrls: ['./${strings.dasherize(widgetOptions.name)}-widget-settings.component.${
          options.style
        }']`
      );
    });

    it('should have the Component decorator without property styleUrls', async () => {
      const options = { ...widgetOptions, style: 'none' };

      const tree = await schematicRunner.runSchematic('widget', options, appTree);

      const widgetSettingsContent = tree.readContent(
        `${defaultWidgetSettingsComponentFilePath}.ts`
      );
      expect(widgetSettingsContent)
        .withContext('The styleUrls should not be fulfilled')
        .not.toMatch(/styleUrls: \['.\/(\w*-*)+.component.\w*'\]/);
    });

    it('should extend CustomizableComponent', async () => {
      const tree = await schematicRunner.runSchematic('widget', widgetOptions, appTree);

      const widgetSettingsClassName = `${strings.classify(
        widgetOptions.name
      )}WidgetSettingsComponent`;

      const widgetSettingsContent = tree.readContent(
        `${defaultWidgetSettingsComponentFilePath}.ts`
      );
      expect(widgetSettingsContent).toContain(
        `export class ${widgetSettingsClassName} extends CustomizableComponent {`
      );
    });

    it('should have the constructor receiving the ViewContainerRef and providing it to the super', async () => {
      const tree = await schematicRunner.runSchematic('widget', widgetOptions, appTree);

      const widgetSettingsContent = tree.readContent(
        `${defaultWidgetSettingsComponentFilePath}.ts`
      );
      expect(widgetSettingsContent).toMatch(
        /constructor\(\s*viewContainerRef: ViewContainerRef,\s*@Inject\(WidgetSettingsService\) settings: TestWidgetSettingsService\s*\) {\s*super\(viewContainerRef\);/gm
      );
    });
  });
});
