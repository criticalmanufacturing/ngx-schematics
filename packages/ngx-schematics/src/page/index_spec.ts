import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
import { strings } from '@criticalmanufacturing/schematics-devkit';
import { getAllFilesFromDir } from '@criticalmanufacturing/schematics-devkit/testing';

describe('Generate Page', () => {
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

  const pageOptions = {
    name: 'TestPage',
    project: libraryOptions.name,
    pageId: 'Test.PageTest',
    iconClass: 'icon-test',
    menuGroupId: 'TestMenuGroup',
    menuSubGroupId: ''
  };

  const pagePath = `projects/${libraryOptions.name}/src/lib/page-${strings.dasherize(
    pageOptions.name
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

  it('should create the page files', async () => {
    const tree = await schematicRunner.runSchematic('page', pageOptions, appTree);
    const dasherizedName = strings.dasherize(pageOptions.name);
    const files = getAllFilesFromDir(
      `projects/${libraryOptions.name}/src/lib/page-${dasherizedName}`,
      tree
    );

    expect(files).toEqual(
      jasmine.arrayContaining([
        `${pagePath}/page-${dasherizedName}-routing.module.ts`,
        `${pagePath}/page-${dasherizedName}.component.html`,
        `${pagePath}/page-${dasherizedName}.component.less`,
        `${pagePath}/page-${dasherizedName}.component.ts`
      ])
    );
  });

  it('should generate the html file with `cmf-core-controls-base-page` component selector', async () => {
    const tree = await schematicRunner.runSchematic('page', pageOptions, appTree);
    const templateRegExp = new RegExp(
      `<cmf-core-controls-base-page\\s*` +
        `i18n-mainTitle="@@${strings.dasherize(pageOptions.project)}/page-${strings.dasherize(
          pageOptions.name
        )}#TITLE"\\s*` +
        `mainTitle="${strings.nameify(pageOptions.name)}"\\s*` +
        `icon="${pageOptions.iconClass}">\\s*` +
        `<cmf-core-controls-actionBar\\s+actionBar-id="${strings.classify(pageOptions.project)}\\.Page${strings.classify(pageOptions.name)}\\.ActionBar">\\s*` +
        `<!-- LAYOUT -->\\s*` +
        `<cmf-core-controls-actionGroup group-id="cmf-core-action-group-settings">\\s*` +
        `<!-- Save Layout -->\\s*` +
        `<cmf-core-controls-actionButton\\s*` +
        `\\*cmfCoreControlsRequiredFunctionalities="'GUI.SaveUserLayout OR GUI.SaveAllUsersLayout OR GUI.SaveRoleLayout'"\\s*` +
        `button-id="Generic.LayoutPersonalization.Save"\\s*` +
        `\\[lessRelevant\\]="true"\\s*` +
        `\\[build-context\\]="onBuildContextHandlerForSaveLayoutWizard">\\s*` +
        `</cmf-core-controls-actionButton>\\s*` +
        `<!-- Reset Layout -->\\s*` +
        `<cmf-core-controls-actionButton\\s*` +
        `\\*cmfCoreControlsRequiredFunctionalities="'GUI.ResetUserLayout OR GUI.ResetAllUsersLayout OR GUI.ResetRoleLayout'"\\s*` +
        `button-id="Generic.LayoutPersonalization.Reset"\\s*` +
        `\\[lessRelevant\\]="true"\\s*` +
        `\\[build-context\\]="onBuildContextHandlerForResetLayoutWizard">\\s*` +
        `</cmf-core-controls-actionButton>\\s*` +
        `</cmf-core-controls-actionGroup>\\s*` +
        `</cmf-core-controls-actionBar>\\s*` +
        `<cmf-core-controls-page-single-section>\\s*` +
        `<p>Page ${strings.nameify(pageOptions.name)} works!</p>\\s*` +
        `</cmf-core-controls-page-single-section>\\s*` +
        `</cmf-core-controls-base-page>`,
      'gm'
    );

    const pageTemplateContent = tree.readContent(
      `${pagePath}/page-${strings.dasherize(pageOptions.name)}.component.html`
    );
    expect(pageTemplateContent).toMatch(templateRegExp);
  });

  it('should have the Component decorator with properties selector, providers, templateUrl, standalone, and viewProviders', async () => {
    const tree = await schematicRunner.runSchematic('page', pageOptions, appTree);

    const pageContent = tree.readContent(
      `${pagePath}/page-${strings.dasherize(pageOptions.name)}.component.ts`
    );
    expect(pageContent).toMatch(/@Component\(/);
    expect(pageContent).toContain(
      `selector: '${strings.dasherize(pageOptions.project)}-page-${strings.dasherize(
        pageOptions.name
      )}'`
    );
    expect(pageContent).toContain(
      `templateUrl: './page-${strings.dasherize(pageOptions.name)}.component.html'`
    );
    expect(pageContent).toContain(
      `viewProviders: [{ provide: HOST_VIEW_COMPONENT, useExisting: forwardRef(() => Page${strings.classify(
        pageOptions.name
      )}Component) }]`
    );
    expect(pageContent).toContain('standalone: true');
  });

  it('should extend CustomizableComponent', async () => {
    const tree = await schematicRunner.runSchematic('page', pageOptions, appTree);

    const pageContent = tree.readContent(
      `${pagePath}/page-${strings.dasherize(pageOptions.name)}.component.ts`
    );
    expect(pageContent).toContain(
      `export class Page${strings.classify(
        pageOptions.name
      )}Component extends CustomizableComponent`
    );
  });

  it('should have the constructor receiving the ViewContainerRef and providing it to the super', async () => {
    const tree = await schematicRunner.runSchematic('page', pageOptions, appTree);

    const pageContent = tree.readContent(
      `${pagePath}/page-${strings.dasherize(pageOptions.name)}.component.ts`
    );

    expect(pageContent).toMatch(
      /constructor\(\s*((viewContainerRef: ViewContainerRef|private router: Router)\s*,?\s*){2}\)/gm
    );
    expect(pageContent).toContain('super(viewContainerRef);');
  });

  it('should import CommonModule and BasePageModule', async () => {
    const tree = await schematicRunner.runSchematic('page', pageOptions, appTree);

    const pageContent = tree.readContent(
      `${pagePath}/page-${strings.dasherize(pageOptions.name)}.component.ts`
    );

    expect(pageContent).toMatch(
      /imports: \[\s*((CommonModule|BasePageModule|ActionBarModule|ActionButtonModule|ActionGroupModule|RequiredFunctionalitiesModule)\s*,?\s*){6}\]/gm
    );
  });

  it('should declare the route in Routing Module', async () => {
    const tree = await schematicRunner.runSchematic('page', pageOptions, appTree);

    const routingModuleContent = tree.readContent(
      `${pagePath}/page-${strings.dasherize(pageOptions.name)}-routing.module.ts`
    );

    expect(routingModuleContent).toMatch(
      new RegExp(
        `const routes: Routes = \\[\\s+\\{\\s+path: '',\\s+component: Page${strings.classify(
          pageOptions.name
        )}Component\\s+}\\s+];`,
        'gm'
      )
    );
  });

  it('should import Router Module', async () => {
    const tree = await schematicRunner.runSchematic('page', pageOptions, appTree);

    const routingModuleContent = tree.readContent(
      `${pagePath}/page-${strings.dasherize(pageOptions.name)}-routing.module.ts`
    );

    const routingModulesImportsRegExp = new RegExp(
      `imports: \\[\\s*((RouterModule\\.forChild\\(routes\\))\\s*,?\\s*){1}\\]`,
      'gm'
    );
    expect(routingModuleContent).toMatch(routingModulesImportsRegExp);
  });

  it('should export the Routing Module', async () => {
    const tree = await schematicRunner.runSchematic('page', pageOptions, appTree);

    const routingModuleContent = tree.readContent(
      `${pagePath}/page-${strings.dasherize(pageOptions.name)}-routing.module.ts`
    );
    expect(routingModuleContent).toContain(
      `export class Page${strings.classify(pageOptions.name)}RoutingModule { }`
    );
  });
});
