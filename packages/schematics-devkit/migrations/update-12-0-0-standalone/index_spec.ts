import { getSystemPath, normalize, virtualFs } from '@angular-devkit/core';
import { TempScopedNodeJsSyncHost } from '@angular-devkit/core/node/testing';
import { HostTree } from '@angular-devkit/schematics';
import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing/index.js';
import { rmSync } from 'node:fs';

describe('inject migration', () => {
  let runner: SchematicTestRunner;
  let host: TempScopedNodeJsSyncHost;
  let tree: UnitTestTree;
  let tmpDirPath: string;
  let previousWorkingDir: string;

  function writeFile(filePath: string, contents: string) {
    host.sync.write(normalize(filePath), virtualFs.stringToFileBuffer(contents));
  }

  function runMigration(options?: { path?: string }) {
    return runner.runSchematic('update-standalone', options, tree);
  }

  beforeEach(() => {
    runner = new SchematicTestRunner(
      '@criticalmanufacturing/ngx-schematics',
      require.resolve('../collection.json')
    );
    host = new TempScopedNodeJsSyncHost();
    tree = new UnitTestTree(new HostTree(host));

    writeFile('/tsconfig.json', '{}');
    writeFile(
      '/angular.json',
      JSON.stringify({
        version: 1,
        projects: {
          t: { root: '', architect: { build: { options: { tsConfig: './tsconfig.json' } } } }
        }
      })
    );

    previousWorkingDir = process.cwd();
    tmpDirPath = getSystemPath(host.root);
    process.chdir(tmpDirPath);
  });

  afterEach(() => {
    process.chdir(previousWorkingDir);
    rmSync(tmpDirPath, { recursive: true });
  });

  it(`should replace Module imports by the standalone import in component decorator`, async () => {
    writeFile(
      '/dir.ts',
      [
        `import { Component } from '@angular/core';`,
        `import { MyComponentModule } from 'cmf-core';`,
        ``,
        `@Component({`,
        `  template: '',`,
        `  imports: [MyComponentModule]`,
        `})`,
        `class MyClass {`,
        `}`
      ].join('\n')
    );

    await runMigration();

    expect(tree.readContent('/dir.ts').split('\n')).toEqual([
      `import { Component } from '@angular/core';`,
      `import { MyComponent } from 'cmf-core';`,
      ``,
      `@Component({`,
      `  template: '',`,
      `  imports: [MyComponent]`,
      `})`,
      `class MyClass {`,
      `}`
    ]);
  });

  it(`should remove module imports and not add duplicated named imports`, async () => {
    writeFile(
      '/dir.ts',
      [
        `import { Component, viewChild } from '@angular/core';`,
        `import { MyComponentModule, MyComponent } from 'cmf-core';`,
        ``,
        `@Component({`,
        `  template: '',`,
        `  imports: [MyComponentModule]`,
        `})`,
        `class MyClass {`,
        `  myComponent = viewChild(MyComponent);`,
        `}`
      ].join('\n')
    );

    await runMigration();

    expect(tree.readContent('/dir.ts').split('\n')).toEqual([
      `import { Component, viewChild } from '@angular/core';`,
      `import { MyComponent } from 'cmf-core';`,
      ``,
      `@Component({`,
      `  template: '',`,
      `  imports: [MyComponent]`,
      `})`,
      `class MyClass {`,
      `  myComponent = viewChild(MyComponent);`,
      `}`
    ]);
  });

  it(`should remove empty import declarations when duplicated`, async () => {
    writeFile(
      '/dir.ts',
      [
        `import { Component, viewChild } from '@angular/core';`,
        `import { MyComponentModule as MyModule } from 'cmf-core';`,
        `import { MyComponent } from 'cmf-core';`,
        ``,
        `@Component({`,
        `  template: '',`,
        `  imports: [MyModule]`,
        `})`,
        `class MyClass {`,
        `  myComponent = viewChild(MyComponent);`,
        `}`
      ].join('\n')
    );

    await runMigration();

    expect(tree.readContent('/dir.ts').split('\n')).toEqual([
      `import { Component, viewChild } from '@angular/core';`,
      `import { MyComponent } from 'cmf-core';`,
      ``,
      `@Component({`,
      `  template: '',`,
      `  imports: [MyComponent]`,
      `})`,
      `class MyClass {`,
      `  myComponent = viewChild(MyComponent);`,
      `}`
    ]);
  });

  it(`should update routing module imports in metadata`, async () => {
    writeFile(
      '/dir.ts',
      [
        `import { Injectable } from '@angular/core';`,
        `import { PackageMetadata, RouteConfig, KnownRoutes } from 'cmf-core';`,
        ``,
        `@Injectable()`,
        `class MyMetadataService extends PackageMetadata {`,
        `  public override get routes(): RouteConfig[] {`,
        `    return [{`,
        `      id: KnownRoutes.Page,`,
        `      routes: [`,
        `        {`,
        `          path: 'child-path',`,
        `          loadChildren: () => import(`,
        `            /* webpackExports: "PageViewerRoutingModule" */`,
        `            'cmf-core-dashboards').then(m => m.PageViewerRoutingModule)`,
        `        },`,
        `        {`,
        `          path: 'Entity/Checklist/:id',`,
        `          loadChildren: () => import(`,
        `            /* webpackExports: "PageChecklistRoutingModule" */`,
        `            'cmf-core-checklist').then(m => m.PageChecklistRoutingModule),`,
        `          data: {`,
        `            requiredFunctionalities: 'Checklist.Show'`,
        `          }`,
        `        },`,
        `      ]`,
        `    }`,
        `  }`,
        `}`
      ].join('\n')
    );

    await runMigration();

    expect(tree.readContent('/dir.ts').split('\n')).toEqual([
      `import { Injectable } from '@angular/core';`,
      `import { PackageMetadata, RouteConfig, KnownRoutes, EntityTypeMetadataService } from 'cmf-core';`,
      ``,
      `@Injectable()`,
      `class MyMetadataService extends PackageMetadata {`,
      `  public override get routes(): RouteConfig[] {`,
      `    return [{`,
      `      id: KnownRoutes.Page,`,
      `      routes: [`,
      `        {`,
      `          path: 'child-path',`,
      `          loadComponent: () => import(`,
      `            /* webpackExports: "PageViewer" */`,
      `            'cmf-core-dashboards').then(m => m.PageViewer)`,
      `        },`,
      `        {`,
      `          path: 'Entity/Checklist/:id',`,
      `          loadChildren: async () =>`,
      `            EntityTypeMetadataService.getRoutes(`,
      `              'Checklist',`,
      `              await import(`,
      `                /* webpackExports: "PageChecklist" */`,
      `                'cmf-core-checklist'`,
      `              ).then((m) => m.PageChecklist)`,
      `            ),`,
      `          data: {`,
      `            requiredFunctionalities: 'Checklist.Show'`,
      `          }`,
      `        },`,
      `      ]`,
      `    }`,
      `  }`,
      `}`
    ]);
  });

  it(`should add alias to imports that have the name duplicated`, async () => {
    writeFile(
      '/dir.ts',
      [
        `import { Component, viewChild, Input } from '@angular/core';`,
        `import { InputModule } from 'cmf-core';`,
        ``,
        `@Component({`,
        `  template: '',`,
        `  imports: [InputModule]`,
        `})`,
        `class MyClass {`,
        `  @Input() myInput: string;`,
        `}`
      ].join('\n')
    );

    await runMigration();

    expect(tree.readContent('/dir.ts').split('\n')).toEqual([
      `import { Component, viewChild, Input } from '@angular/core';`,
      `import { Input as Input_1 } from 'cmf-core';`,
      ``,
      `@Component({`,
      `  template: '',`,
      `  imports: [Input_1]`,
      `})`,
      `class MyClass {`,
      `  @Input() myInput: string;`,
      `}`
    ]);
  });

  it(`should remove all module imports`, async () => {
    writeFile(
      '/dir.ts',
      [
        `import { Component, viewChild } from '@angular/core';`,
        `import { MyComponentModule, MyComponent2Module } from 'cmf-core';`,
        ``,
        `@Component({`,
        `  template: '',`,
        `  imports: [MyComponentModule]`,
        `})`,
        `class MyClass {`,
        `}`
      ].join('\n')
    );

    await runMigration();

    expect(tree.readContent('/dir.ts').split('\n')).toEqual([
      `import { Component, viewChild } from '@angular/core';`,
      `import { MyComponent } from 'cmf-core';`,
      ``,
      `@Component({`,
      `  template: '',`,
      `  imports: [MyComponent]`,
      `})`,
      `class MyClass {`,
      `}`
    ]);
  });

  it(`should unwrap specific module imports in NgModules`, async () => {
    writeFile(
      '/dir.ts',
      [
        `import { Component, viewChild } from '@angular/core';`,
        `import { WizardModule } from 'cmf-core-controls';`,
        ``,
        `@Component({`,
        `  template: '<cmf-core-controls-wizard></cmf-core-controls-wizard>'`,
        `})`,
        `class MyClass {`,
        `}`,
        ``,
        `@NgModule({`,
        `  imports: [WizardModule],`,
        `  declarations: [MyClass],`,
        `  exports: [MyClass, WizardModule]`,
        `})`,
        `class MyModule {}`
      ].join('\n')
    );

    await runMigration();

    expect(tree.readContent('/dir.ts').split('\n')).toEqual([
      `import { Component, viewChild } from '@angular/core';`,
      `import { Wizard, WizardStep, WizardFooterContentDirective } from 'cmf-core-controls';`,
      ``,
      `@Component({`,
      `  template: '<cmf-core-controls-wizard></cmf-core-controls-wizard>'`,
      `})`,
      `class MyClass {`,
      `}`,
      ``,
      `@NgModule({`,
      `  imports: [Wizard, WizardStep, WizardFooterContentDirective],`,
      `  declarations: [MyClass],`,
      `  exports: [MyClass, Wizard, WizardStep, WizardFooterContentDirective]`,
      `})`,
      `class MyModule {}`
    ]);
  });

  it(`should unwrap specific module imports in standalone Components`, async () => {
    writeFile(
      '/dir.ts',
      [
        `import { Component } from '@angular/core';`,
        `import { WizardModule } from 'cmf-core-controls';`,
        ``,
        `@Component({`,
        `  template: \``,
        `    <cmf-core-controls-wizard>`,
        `      <cmf-core-controls-wizard-step></cmf-core-controls-wizard-step>`,
        `    </cmf-core-controls-wizard>\``,
        `  imports: [WizardModule]`,
        `})`,
        `class MyClass {`,
        `}`
      ].join('\n')
    );

    await runMigration();

    expect(tree.readContent('/dir.ts').split('\n')).toEqual([
      `import { Component } from '@angular/core';`,
      `import { Wizard, WizardStep } from 'cmf-core-controls';`,
      ``,
      `@Component({`,
      `  template: \``,
      `    <cmf-core-controls-wizard>`,
      `      <cmf-core-controls-wizard-step></cmf-core-controls-wizard-step>`,
      `    </cmf-core-controls-wizard>\``,
      `  imports: [Wizard, WizardStep]`,
      `})`,
      `class MyClass {`,
      `}`
    ]);
  });

  it(`should unwrap specific module imports in standalone Components`, async () => {
    writeFile(
      '/dir.html',
      [
        `<cmf-core-controls-wizard>`,
        `  <cmf-core-controls-wizard-step></cmf-core-controls-wizard-step>`,
        `</cmf-core-controls-wizard>\``
      ].join('\n')
    );

    writeFile(
      '/dir.ts',
      [
        `import { Component } from '@angular/core';`,
        `import { WizardModule } from 'cmf-core-controls';`,
        ``,
        `@Component({`,
        `  templateUrl: './dir.html',`,
        `  imports: [WizardModule]`,
        `})`,
        `class MyClass {`,
        `}`
      ].join('\n')
    );

    await runMigration();

    expect(tree.readContent('/dir.ts').split('\n')).toEqual([
      `import { Component } from '@angular/core';`,
      `import { Wizard, WizardStep } from 'cmf-core-controls';`,
      ``,
      `@Component({`,
      `  templateUrl: './dir.html',`,
      `  imports: [Wizard, WizardStep]`,
      `})`,
      `class MyClass {`,
      `}`
    ]);
  });

  it(`should unwrap specific module imports in standalone Components`, async () => {
    writeFile(
      '/dir.html',
      [
        `<cmf-core-controls-wizard [cmf-core-business-controls-transaction-wizard]>`,
        `  @if (true) {`,
        `    <cmf-core-controls-wizard-step></cmf-core-controls-wizard-step>`,
        `  }`,
        `</cmf-core-controls-wizard>\``
      ].join('\n')
    );

    writeFile(
      '/dir.ts',
      [
        `import { Component } from '@angular/core';`,
        `import { WizardModule } from 'cmf-core-controls';`,
        `import { TransactionWizardModule } from 'cmf-core-business-controls';`,
        ``,
        `@Component({`,
        `  templateUrl: './dir.html',`,
        `  imports: [WizardModule, TransactionWizardModule]`,
        `})`,
        `class MyClass {`,
        `}`
      ].join('\n')
    );

    await runMigration();

    expect(tree.readContent('/dir.ts').split('\n')).toEqual([
      `import { Component } from '@angular/core';`,
      `import { Wizard, WizardStep } from 'cmf-core-controls';`,
      `import { TransactionWizardDirective } from 'cmf-core-business-controls';`,
      ``,
      `@Component({`,
      `  templateUrl: './dir.html',`,
      `  imports: [Wizard, WizardStep, TransactionWizardDirective]`,
      `})`,
      `class MyClass {`,
      `}`
    ]);
  });

  it(`should use import alias of existing component imports`, async () => {
    writeFile(
      '/dir.html',
      [
        `<cmf-core-controls-wizard [cmf-core-business-controls-transaction-wizard]>`,
        `  @if (true) {`,
        `    <cmf-core-controls-wizard-step></cmf-core-controls-wizard-step>`,
        `  }`,
        `</cmf-core-controls-wizard>\``
      ].join('\n')
    );

    writeFile(
      '/dir.ts',
      [
        `import { Component, viewChild } from '@angular/core';`,
        `import { WizardModule, Wizard as WizardComponent } from 'cmf-core-controls';`,
        `import { TransactionWizardModule } from 'cmf-core-business-controls';`,
        ``,
        `@Component({`,
        `  templateUrl: './dir.html',`,
        `  imports: [WizardModule, TransactionWizardModule]`,
        `})`,
        `class MyClass {`,
        `  wizard = viewChild(WizardComponent);`,
        `}`
      ].join('\n')
    );

    await runMigration();

    expect(tree.readContent('/dir.ts').split('\n')).toEqual([
      `import { Component, viewChild } from '@angular/core';`,
      `import { Wizard as WizardComponent, WizardStep } from 'cmf-core-controls';`,
      `import { TransactionWizardDirective } from 'cmf-core-business-controls';`,
      ``,
      `@Component({`,
      `  templateUrl: './dir.html',`,
      `  imports: [WizardComponent, WizardStep, TransactionWizardDirective]`,
      `})`,
      `class MyClass {`,
      `  wizard = viewChild(WizardComponent);`,
      `}`
    ]);
  });
});
