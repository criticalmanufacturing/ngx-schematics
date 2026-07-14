import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
import { strings } from '@criticalmanufacturing/schematics-devkit';
import { getAllFilesFromDir, normalize } from '@criticalmanufacturing/schematics-devkit/testing';
import { readFileSync } from 'node:fs';

describe('Generate Task', () => {
  const schematicRunner = new SchematicTestRunner(
    '@criticalmanufacturing/ngx-iot-schematics',
    require.resolve('../collection.json')
  );

  const workspaceOptions = {
    name: 'workspace',
    newProjectRoot: 'projects',
    version: '12.0.0'
  };

  const libraryOptions = {
    name: 'testlib',
    skipPackageJson: false,
    skipTsConfig: false,
    skipInstall: false,
    namespace: '@testlib'
  };

  const taskOptions = {
    name: 'TestTask',
    project: libraryOptions.name
  };

  const fixturesPath = `${__dirname}/fixtures`;
  const libPath = `projects/${libraryOptions.name}`;
  const libMainPath = `${libPath}/src/lib`;
  const taskName = `${strings.dasherize(taskOptions.name)}`;

  const expectedFiles = {
    task: `${taskName}/${taskName}`
  };

  let appTree: UnitTestTree;

  beforeEach(async () => {
    appTree = await schematicRunner.runExternalSchematic(
      '@schematics/angular',
      'workspace',
      workspaceOptions
    );

    appTree = await schematicRunner.runSchematic('library', libraryOptions, appTree);
  });

  it('should create the task files', async () => {
    const tree = await schematicRunner.runSchematic('task', taskOptions, appTree);
    const files = getAllFilesFromDir(`${libMainPath}/tasks/${taskName}`, tree);

    expect(files).toEqual(
      expect.arrayContaining([
        `${libMainPath}/tasks/${expectedFiles.task}-settings.component.html`,
        `${libMainPath}/tasks/${expectedFiles.task}-settings.component.less`,
        `${libMainPath}/tasks/${expectedFiles.task}-settings.component.ts`,
        `${libMainPath}/tasks/${expectedFiles.task}.task-designer.ts`,
        `${libMainPath}/tasks/${expectedFiles.task}.task-module.ts`,
        `${libMainPath}/tasks/${expectedFiles.task}.task.ts`
      ])
    );
  });

  it('should generate the task settings html file with the correct content', async () => {
    const tree = await schematicRunner.runSchematic('task', taskOptions, appTree);
    const actual = tree.readContent(
      `${libMainPath}/tasks/${expectedFiles.task}-settings.component.html`
    );
    const expected = readFileSync(`${fixturesPath}/${expectedFiles.task}-settings.component.html`, {
      encoding: 'utf-8'
    });

    expect(normalize(actual)).toEqual(normalize(expected));
  });

  it('should generate the task settings ts file with the correct content', async () => {
    const tree = await schematicRunner.runSchematic('task', taskOptions, appTree);
    const actual = tree.readContent(
      `${libMainPath}/tasks/${expectedFiles.task}-settings.component.ts`
    );
    const expected = readFileSync(`${fixturesPath}/${expectedFiles.task}-settings.component.ts`, {
      encoding: 'utf-8'
    });

    expect(normalize(actual)).toEqual(normalize(expected));
  });

  it('should generate the task designer ts file with the correct content', async () => {
    const tree = await schematicRunner.runSchematic('task', taskOptions, appTree);
    const actual = tree.readContent(`${libMainPath}/tasks/${expectedFiles.task}.task-designer.ts`);
    const expected = readFileSync(`${fixturesPath}/${expectedFiles.task}.task-designer.ts`, {
      encoding: 'utf-8'
    });

    expect(normalize(actual)).toEqual(normalize(expected));
  });

  it('should generate the task module ts file with the correct content', async () => {
    const tree = await schematicRunner.runSchematic('task', taskOptions, appTree);
    const actual = tree.readContent(`${libMainPath}/tasks/${expectedFiles.task}.task-module.ts`);
    const expected = readFileSync(`${fixturesPath}/${expectedFiles.task}.task-module.ts`, {
      encoding: 'utf-8'
    });

    expect(normalize(actual)).toEqual(normalize(expected));
  });

  it('should generate the task ts file with the correct content', async () => {
    const tree = await schematicRunner.runSchematic('task', taskOptions, appTree);
    const actual = tree.readContent(`${libMainPath}/tasks/${expectedFiles.task}.task.ts`);
    const expected = readFileSync(`${fixturesPath}/${expectedFiles.task}.task.ts`, {
      encoding: 'utf-8'
    });

    expect(normalize(actual)).toEqual(normalize(expected));
  });

  it('should update the public-api-designer.ts file with the correct content', async () => {
    const tree = await schematicRunner.runSchematic('task', taskOptions, appTree);
    const actual = tree.readContent(`${libPath}/src/public-api-designer.ts`);
    const expected = readFileSync(`${fixturesPath}/public-api-designer.ts`, {
      encoding: 'utf-8'
    });

    expect(normalize(actual)).toEqual(normalize(expected));
  });

  it('should update the public-api-runtime.ts file with the correct content', async () => {
    const tree = await schematicRunner.runSchematic('task', taskOptions, appTree);
    const actual = tree.readContent(`${libPath}/src/public-api-runtime.ts`);
    const expected = readFileSync(`${fixturesPath}/public-api-runtime.ts`, {
      encoding: 'utf-8'
    });

    expect(normalize(actual)).toEqual(normalize(expected));
  });

  it('should update the metadata.ts file with the correct content', async () => {
    const tree = await schematicRunner.runSchematic('task', taskOptions, appTree);
    const actual = tree.readContent(`${libPath}/metadata/src/lib/metadata.ts`);
    const expected = readFileSync(`${fixturesPath}/metadata.ts`, {
      encoding: 'utf-8'
    });

    expect(normalize(actual)).toEqual(normalize(expected));
  });
});
