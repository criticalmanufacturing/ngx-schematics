import { getSystemPath, normalize, virtualFs } from '@angular-devkit/core';
import { TempScopedNodeJsSyncHost } from '@angular-devkit/core/node/testing';
import { HostTree } from '@angular-devkit/schematics';
import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing/index.js';
import { rmSync } from 'node:fs';

describe('LboService.call migration', () => {
  let runner: SchematicTestRunner;
  let host: TempScopedNodeJsSyncHost;
  let tree: UnitTestTree;
  let tmpDirPath: string;
  let previousWorkingDir: string;

  function writeFile(filePath: string, contents: string) {
    host.sync.write(normalize(filePath), virtualFs.stringToFileBuffer(contents));
  }

  function runMigration(options?: { path?: string }) {
    return runner.runSchematic('update-lbo-call', options, tree);
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

    // Add a cmf-core package to the test tree
    writeFile(
      '/node_modules/cmf-core/index.d.ts',
      `export declare class LboService { 
          call<T extends Cmf.Foundation.BusinessOrchestration.BaseInput>(input: T, timeout?: number): Promise<OutputOf<T>>; 
      }`
    );
    writeFile(
      '/package.json',
      JSON.stringify({
        dependencies: {
          'cmf-core': '1.0.0'
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

  it('should update usage of LboService.call when injecting via inject()', async () => {
    writeFile(
      '/dir.ts',
      [
        `import { Component } from '@angular/core';`,
        `import { LboService } from 'cmf-core';`,
        ``,
        `@Component({`,
        `  template: '',`,
        `})`,
        `class TestComponent {`,
        `  private lbo = inject(LboService);`,
        ``,
        `  someMethod() {`,
        `    const input = new Cmf.Foundation.BusinessOrchestration.BaseInput();`,
        `    const output = this.lbo.call<Cmf.Foundation.BusinessOrchestration.BaseOutput>(input);`,
        `    return output;`,
        `  }`,
        `}`
      ].join('\n')
    );

    const updatedTree = await runMigration({ path: '/dir.ts' });
    const content = updatedTree.readContent('/dir.ts');

    expect(content.split('\n')).toEqual([
      `import { Component } from '@angular/core';`,
      `import { LboService } from 'cmf-core';`,
      ``,
      `@Component({`,
      `  template: '',`,
      `})`,
      `class TestComponent {`,
      `  private lbo = inject(LboService);`,
      ``,
      `  someMethod() {`,
      `    const input = new Cmf.Foundation.BusinessOrchestration.BaseInput();`,
      `    const output = this.lbo.call(input);`,
      `    return output;`,
      `  }`,
      `}`
    ]);
  });

  it('should update usage of LboService.call when declaring property', async () => {
    writeFile(
      '/dir.ts',
      [
        `import { Component } from '@angular/core';`,
        `import { LboService } from 'cmf-core';`,
        ``,
        `@Component({`,
        `  template: '',`,
        `})`,
        `class TestComponent {`,
        `  private lbo: LboService;`,
        ``,
        `  someMethod() {`,
        `    const input = new Cmf.Foundation.BusinessOrchestration.BaseInput();`,
        `    const output = this.lbo.call<Cmf.Foundation.BusinessOrchestration.BaseOutput>(input);`,
        `    return output;`,
        `  }`,
        `}`
      ].join('\n')
    );

    const updatedTree = await runMigration({ path: '/dir.ts' });
    const content = updatedTree.readContent('/dir.ts');

    expect(content.split('\n')).toEqual([
      `import { Component } from '@angular/core';`,
      `import { LboService } from 'cmf-core';`,
      ``,
      `@Component({`,
      `  template: '',`,
      `})`,
      `class TestComponent {`,
      `  private lbo: LboService;`,
      ``,
      `  someMethod() {`,
      `    const input = new Cmf.Foundation.BusinessOrchestration.BaseInput();`,
      `    const output = this.lbo.call(input);`,
      `    return output;`,
      `  }`,
      `}`
    ]);
  });

  it('should update usage of LboService.call when injecting via constructor', async () => {
    writeFile(
      '/dir.ts',
      [
        `import { Component } from '@angular/core';`,
        `import { CustomizableComponent, LboService } from 'cmf-core';`,
        ``,
        `@Component({`,
        `  template: '',`,
        `})`,
        `class TestComponent extends CustomizableComponent {`,
        `  constructor(private util: any, options: any, private lbo: LboService, inputB: any) {`,
        `     super();`,
        `  }`,
        ``,
        `  someMethod() {`,
        `    const input = new Cmf.Foundation.BusinessOrchestration.BaseInput();`,
        `    const output = this.lbo.call<Cmf.Foundation.BusinessOrchestration.BaseOutput>(input);`,
        `    return output;`,
        `  }`,
        `}`
      ].join('\n')
    );

    const updatedTree = await runMigration({ path: '/dir.ts' });
    const content = updatedTree.readContent('/dir.ts');

    expect(content.split('\n')).toEqual([
      `import { Component } from '@angular/core';`,
      `import { CustomizableComponent, LboService } from 'cmf-core';`,
      ``,
      `@Component({`,
      `  template: '',`,
      `})`,
      `class TestComponent extends CustomizableComponent {`,
      `  constructor(private util: any, options: any, private lbo: LboService, inputB: any) {`,
      `     super();`,
      `  }`,
      ``,
      `  someMethod() {`,
      `    const input = new Cmf.Foundation.BusinessOrchestration.BaseInput();`,
      `    const output = this.lbo.call(input);`,
      `    return output;`,
      `  }`,
      `}`
    ]);
  });

  it('should update usage of LboService.call when passing in as parameter', async () => {
    writeFile(
      '/dir.ts',
      [
        `import { Component } from '@angular/core';`,
        `import { LboService } from 'cmf-core';`,
        ``,
        `class TestUtilsService {`,
        ``,
        `  static someMethod(inputA: any, lbo: LboService, inputB: any) {`,
        `    const input = new Cmf.Foundation.BusinessOrchestration.BaseInput();`,
        `    const output = lbo.call<Cmf.Foundation.BusinessOrchestration.BaseOutput>(input);`,
        `    return output;`,
        `  }`,
        `}`
      ].join('\n')
    );

    const updatedTree = await runMigration({ path: '/dir.ts' });
    const content = updatedTree.readContent('/dir.ts');

    expect(content.split('\n')).toEqual([
      `import { Component } from '@angular/core';`,
      `import { LboService } from 'cmf-core';`,
      ``,
      `class TestUtilsService {`,
      ``,
      `  static someMethod(inputA: any, lbo: LboService, inputB: any) {`,
      `    const input = new Cmf.Foundation.BusinessOrchestration.BaseInput();`,
      `    const output = lbo.call(input);`,
      `    return output;`,
      `  }`,
      `}`
    ]);
  });

  it('should update usage of LboService.call when calling another function that returns an object with a property of type LboService', async () => {
    writeFile(
      '/dir.ts',
      [
        `import { Component } from '@angular/core';`,
        `import { LboService } from 'cmf-core';`,
        ``,
        `class TestUtilsService {`,
        ``,
        ` static getDependencies(): { foo: string; lbo: LboService; } {`,
        `   return { foo: 'bar', lbo: new LboService() };`,
        ` }`,
        ``,
        `  static someMethod() {`,
        `    const { lbo } = this.getDependencies();`,
        `    const input = new Cmf.Foundation.BusinessOrchestration.BaseInput();`,
        `    const output = lbo.call<Cmf.Foundation.BusinessOrchestration.BaseOutput>(input);`,
        `    return output;`,
        `  }`,
        `}`
      ].join('\n')
    );

    const updatedTree = await runMigration({ path: '/dir.ts' });
    const content = updatedTree.readContent('/dir.ts');

    expect(content.split('\n')).toEqual([
      `import { Component } from '@angular/core';`,
      `import { LboService } from 'cmf-core';`,
      ``,
      `class TestUtilsService {`,
      ``,
      ` static getDependencies(): { foo: string; lbo: LboService; } {`,
      `   return { foo: 'bar', lbo: new LboService() };`,
      ` }`,
      ``,
      `  static someMethod() {`,
      `    const { lbo } = this.getDependencies();`,
      `    const input = new Cmf.Foundation.BusinessOrchestration.BaseInput();`,
      `    const output = lbo.call(input);`,
      `    return output;`,
      `  }`,
      `}`
    ]);
  });

  it('should update usage of LboService.call even when using an import alias', async () => {
    writeFile(
      '/dir.ts',
      [
        `import { Component } from '@angular/core';`,
        `import { LboService as Service } from 'cmf-core';`,
        ``,
        `@Component({`,
        `  template: '',`,
        `})`,
        `class TestComponent {`,
        `  private lbo = inject(Service);`,
        ``,
        `  someMethod() {`,
        `    const input = new Cmf.Foundation.BusinessOrchestration.BaseInput();`,
        `    const output = this.lbo.call<Cmf.Foundation.BusinessOrchestration.BaseOutput>(input);`,
        `    return output;`,
        `  }`,
        `}`
      ].join('\n')
    );

    const updatedTree = await runMigration({ path: '/dir.ts' });
    const content = updatedTree.readContent('/dir.ts');

    expect(content.split('\n')).toEqual([
      `import { Component } from '@angular/core';`,
      `import { LboService as Service } from 'cmf-core';`,
      ``,
      `@Component({`,
      `  template: '',`,
      `})`,
      `class TestComponent {`,
      `  private lbo = inject(Service);`,
      ``,
      `  someMethod() {`,
      `    const input = new Cmf.Foundation.BusinessOrchestration.BaseInput();`,
      `    const output = this.lbo.call(input);`,
      `    return output;`,
      `  }`,
      `}`
    ]);
  });

  it('should update usage of LboService.call when using a property from a base class that is of type LboService', async () => {
    writeFile(
      '/base.ts',
      [
        `import { inject } from '@angular/core';`,
        `import { LboService } from 'cmf-core';`,
        ``,
        `export class BaseComponent {`,
        `  protected readonly lbo = inject(LboService);`,
        `}`
      ].join('\n')
    );

    writeFile(
      '/dir.ts',
      [
        `import { Component } from '@angular/core';`,
        `import { BaseComponent } from './base';`,
        ``,
        `@Component({`,
        `  template: '',`,
        `})`,
        `class TestComponent extends BaseComponent {`,
        ``,
        `  someMethod() {`,
        `    const input = new Cmf.Foundation.BusinessOrchestration.BaseInput();`,
        `    const output = this.lbo.call<Cmf.Foundation.BusinessOrchestration.BaseOutput>(input);`,
        `    return output;`,
        `  }`,
        `}`
      ].join('\n')
    );

    const updatedTree = await runMigration();
    const baseContent = updatedTree.readContent('/base.ts');
    const content = updatedTree.readContent('/dir.ts');

    expect(baseContent.split('\n')).toEqual([
      `import { inject } from '@angular/core';`,
      `import { LboService } from 'cmf-core';`,
      ``,
      `export class BaseComponent {`,
      `  protected readonly lbo = inject(LboService);`,
      `}`
    ]);

    expect(content.split('\n')).toEqual([
      `import { Component } from '@angular/core';`,
      `import { BaseComponent } from './base';`,
      ``,
      `@Component({`,
      `  template: '',`,
      `})`,
      `class TestComponent extends BaseComponent {`,
      ``,
      `  someMethod() {`,
      `    const input = new Cmf.Foundation.BusinessOrchestration.BaseInput();`,
      `    const output = this.lbo.call(input);`,
      `    return output;`,
      `  }`,
      `}`
    ]);
  });
});
