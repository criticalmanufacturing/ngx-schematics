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
    return runner.runSchematic('update-super', options, tree);
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

  it(`should remove variable declarations without reference`, async () => {
    writeFile(
      '/dir.ts',
      [
        `import { Component } from '@angular/core';`,
        `import { ExtendableClass, Foo, Bar } from 'cmf-core';`,
        ``,
        `@Component()`,
        `class MyClass extends ExtendableClass {`,
        `  private foo: Foo;`,
        `  constructor() {`,
        `    const foo = inject(Foo);`,
        `    this.foo = foo;`,
        `    const bar = inject(Bar)`,
        `    super(foo, bar);`,
        `  }`,
        `}`
      ].join('\n')
    );

    await runMigration();

    expect(tree.readContent('/dir.ts').split('\n')).toEqual([
      `import { Component } from '@angular/core';`,
      `import { ExtendableClass, Foo, Bar } from 'cmf-core';`,
      ``,
      `@Component()`,
      `class MyClass extends ExtendableClass {`,
      `  private foo: Foo;`,
      `  constructor() {`,
      `    const foo = inject(Foo);`,
      `    this.foo = foo;`,
      `    super();`,
      `  }`,
      `}`
    ]);
  });

  it(`should delete constructor if it becomes empty`, async () => {
    writeFile(
      '/dir.ts',
      [
        `import { Component } from '@angular/core';`,
        `import { ExtendableClass, Foo, Bar } from 'cmf-core';`,
        ``,
        `@Component()`,
        `class MyClass extends ExtendableClass {`,
        `  constructor(foo: Foo, bar: Bar) {`,
        `    super(foo, bar);`,
        `  }`,
        `}`
      ].join('\n')
    );

    await runMigration();

    expect(tree.readContent('/dir.ts').split('\n')).toEqual([
      `import { Component } from '@angular/core';`,
      `import { ExtendableClass } from 'cmf-core';`,
      ``,
      `@Component()`,
      `class MyClass extends ExtendableClass {`,
      `}`
    ]);
  });

  it(`should not delete constructor used constructor paramters`, async () => {
    writeFile(
      '/dir.ts',
      [
        `import { Component } from '@angular/core';`,
        `import { ExtendableClass, Foo, Bar } from 'cmf-core';`,
        ``,
        `@Component()`,
        `class MyClass extends ExtendableClass {`,
        `  constructor(foo: Foo, bar: Bar) {`,
        `    super(foo, bar);`,
        `    bar.greeting = 'Hi!';`,
        `  }`,
        `}`
      ].join('\n')
    );

    await runMigration();

    expect(tree.readContent('/dir.ts').split('\n')).toEqual([
      `import { Component } from '@angular/core';`,
      `import { ExtendableClass, Bar } from 'cmf-core';`,
      ``,
      `@Component()`,
      `class MyClass extends ExtendableClass {`,
      `  constructor(bar: Bar) {`,
      `    super();`,
      `    bar.greeting = 'Hi!';`,
      `  }`,
      `}`
    ]);
  });

  it(`should not delete constructor arguments with modifiers`, async () => {
    writeFile(
      '/dir.ts',
      [
        `import { Component } from '@angular/core';`,
        `import { ExtendableClass, Foo, Bar } from 'cmf-core';`,
        ``,
        `@Component()`,
        `class MyClass extends ExtendableClass {`,
        `  constructor(foo: Foo, private bar: Bar, other: Other) {`,
        `    super(foo, bar);`,
        `  }`,
        `}`
      ].join('\n')
    );

    await runMigration();

    expect(tree.readContent('/dir.ts').split('\n')).toEqual([
      `import { Component } from '@angular/core';`,
      `import { ExtendableClass, Bar } from 'cmf-core';`,
      ``,
      `@Component()`,
      `class MyClass extends ExtendableClass {`,
      `  constructor(private bar: Bar, other: Other) {`,
      `    super();`,
      `  }`,
      `}`
    ]);
  });

  it(`should not delete constructor arguments with override`, async () => {
    writeFile(
      '/dir.ts',
      [
        `import { Component } from '@angular/core';`,
        `import { ExtendableClass, Foo } from 'cmf-core';`,
        ``,
        `@Component()`,
        `class MyClass extends ExtendableClass {`,
        `  constructor(override foo: Foo) {`,
        `    super(foo);`,
        `  }`,
        `}`
      ].join('\n')
    );

    await runMigration();

    expect(tree.readContent('/dir.ts').split('\n')).toEqual([
      `import { Component } from '@angular/core';`,
      `import { ExtendableClass, Foo } from 'cmf-core';`,
      ``,
      `@Component()`,
      `class MyClass extends ExtendableClass {`,
      `  constructor(override foo: Foo) {`,
      `    super();`,
      `  }`,
      `}`
    ]);
  });

  it(`should not delete a constructor with expressions`, async () => {
    writeFile(
      '/dir.ts',
      [
        `import { Component } from '@angular/core';`,
        `import { ExtendableClass, Foo } from 'cmf-core';`,
        ``,
        `@Component()`,
        `class MyClass extends ExtendableClass {`,
        `  constructor(foo: Foo) {`,
        `    super(foo);`,
        `    console.log('Hi!');`,
        `  }`,
        `}`
      ].join('\n')
    );

    await runMigration();

    expect(tree.readContent('/dir.ts').split('\n')).toEqual([
      `import { Component } from '@angular/core';`,
      `import { ExtendableClass } from 'cmf-core';`,
      ``,
      `@Component()`,
      `class MyClass extends ExtendableClass {`,
      `  constructor() {`,
      `    super();`,
      `    console.log('Hi!');`,
      `  }`,
      `}`
    ]);
  });

  it(`should not migrate other classes that are not from cmf packages`, async () => {
    writeFile(
      '/dir.ts',
      [
        `import { Component, ViewContainerRef } from '@angular/core';`,
        `import { OtherComponent } from './other-component';`,
        ``,
        `@Component()`,
        `class MyClass extends OtherComponent {`,
        `  constructor(foo: Foo) {`,
        `    super(foo);`,
        `  }`,
        `}`
      ].join('\n')
    );

    await runMigration();

    expect(tree.readContent('/dir.ts').split('\n')).toEqual([
      `import { Component, ViewContainerRef } from '@angular/core';`,
      `import { OtherComponent } from './other-component';`,
      ``,
      `@Component()`,
      `class MyClass extends OtherComponent {`,
      `  constructor(foo: Foo) {`,
      `    super(foo);`,
      `  }`,
      `}`
    ]);
  });
});
