import { strings } from '@criticalmanufacturing/schematics-devkit';
import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
import { getAllFilesFromDir, normalize } from '@criticalmanufacturing/schematics-devkit/testing';
import { readFileSync } from 'node:fs';

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
    name: 'test-lib',
    skipPackageJson: false,
    skipTsConfig: false,
    skipInstall: false
  };

  const stepOptions = {
    name: 'TestWizardStep',
    stepType: 'Column View',
    project: libraryOptions.name
  };

  const fixturesPath = `${__dirname}/fixtures`;
  const libPath = `projects/${libraryOptions.name}`;
  const libMainPath = `${libPath}/src/lib`;
  const stepName = `step-${strings.dasherize(stepOptions.name)}`;

  const expectedFiles = {
    step: `${stepName}/${stepName}.component`
  };

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
    const files = getAllFilesFromDir(`${libMainPath}/${stepName}`, tree);

    expect(files).toEqual(
      expect.arrayContaining([
        `${libMainPath}/${expectedFiles.step}.less`,
        `${libMainPath}/${expectedFiles.step}.html`,
        `${libMainPath}/${expectedFiles.step}.ts`
      ])
    );
  });

  it('should create the step style file with other extension', async () => {
    const options = { ...stepOptions, style: 'css' };
    const tree = await schematicRunner.runSchematic('wizard-step', options, appTree);
    const files = getAllFilesFromDir(`${libMainPath}/${stepName}`, tree);

    expect(files).toEqual(expect.arrayContaining([`${libMainPath}/${expectedFiles.step}.css`]));
  });

  it('should not create the step style file', async () => {
    const options = { ...stepOptions, style: 'none' };
    const tree = await schematicRunner.runSchematic('wizard-step', options, appTree);
    const files = getAllFilesFromDir(`${libMainPath}/${stepName}`, tree);

    expect(files).not.toEqual(
      expect.arrayContaining([`${libMainPath}/${expectedFiles.step}.less`])
    );
  });

  it('should generate the step less file with the correct content', async () => {
    const tree = await schematicRunner.runSchematic('wizard-step', stepOptions, appTree);
    const actual = tree.readContent(`${libMainPath}/${expectedFiles.step}.less`);
    const expected = readFileSync(`${fixturesPath}/${expectedFiles.step}.less`, {
      encoding: 'utf-8'
    });

    expect(normalize(actual).split('\n')).toEqual(normalize(expected).split('\n'));
  });

  it('should generate the step ts file with the correct content', async () => {
    const tree = await schematicRunner.runSchematic('wizard-step', stepOptions, appTree);
    const actual = tree.readContent(`${libMainPath}/${expectedFiles.step}.ts`);
    const expected = readFileSync(`${fixturesPath}/${expectedFiles.step}.ts`, {
      encoding: 'utf-8'
    });

    expect(normalize(actual).split('\n')).toEqual(normalize(expected).split('\n'));
  });

  it('should generate the step html file with the correct content', async () => {
    const tree = await schematicRunner.runSchematic('wizard-step', stepOptions, appTree);
    const actual = tree.readContent(`${libMainPath}/${expectedFiles.step}.html`);
    const expected = readFileSync(`${fixturesPath}/${expectedFiles.step}.html`, {
      encoding: 'utf-8'
    });

    expect(normalize(actual).split('\n')).toEqual(normalize(expected).split('\n'));
  });
});
