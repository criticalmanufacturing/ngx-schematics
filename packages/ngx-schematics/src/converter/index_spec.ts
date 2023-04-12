import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
import { strings } from '@criticalmanufacturing/schematics-devkit';

describe('Generate Converter', () => {
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

  const converterOptions = {
    name: 'test',
    path: `projects/${libraryOptions.name}/src/lib`,
    project: libraryOptions.name
  };

  const defaultConverterFilePath = `projects/${libraryOptions.name}/src/lib/${converterOptions.name}-converter/${converterOptions.name}-converter.pipe.ts`;

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

  it('should create the converter file', async () => {
    const tree = await schematicRunner.runSchematic('converter', converterOptions, appTree);

    expect(
      tree.getDir(`${converterOptions.path}/${converterOptions.name}-converter`).subfiles
    ).toEqual(jasmine.arrayContaining([`${converterOptions.name}-converter.pipe.ts`]));
  });

  it('should have the Pipe and Converter decorators', async () => {
    const tree = await schematicRunner.runSchematic('converter', converterOptions, appTree);

    const pipeContent = tree.readContent(defaultConverterFilePath);

    expect(pipeContent).toMatch(
      /import \{\s*((PipeTransform|Pipe)\s*,?\s*){2}\} from '@angular\/core';/gm
    );
    expect(pipeContent).toMatch(/import \{\s*Converter\s*\} from 'cmf-core-dashboards';/gm);
    expect(pipeContent).toMatch(/@Pipe\(/);
    expect(pipeContent).toContain('standalone: true');
    expect(pipeContent).toMatch(/@Converter\(/g);
  });

  it('should have the name property in the Converter decorator', async () => {
    const tree = await schematicRunner.runSchematic('converter', converterOptions, appTree);

    const converterName = `${strings.nameify(converterOptions.name)} Converter`;

    const pipeContent = tree.readContent(defaultConverterFilePath);
    expect(pipeContent).toContain(
      `name: $localize\`:@@${strings.dasherize(converterOptions.project)}/${
        converterOptions.name
      }#NAME:${converterName}\``
    );
  });

  it('should have the name property in the Pipe decorator', async () => {
    const tree = await schematicRunner.runSchematic('converter', converterOptions, appTree);

    const converterName = `${strings.camelize(converterOptions.name)}`;

    const pipeContent = tree.readContent(defaultConverterFilePath);
    expect(pipeContent).toContain(`name: '${converterName}'`);
  });

  it('should implement PipeTransform', async () => {
    const tree = await schematicRunner.runSchematic('converter', converterOptions, appTree);

    const converterClassName = `${strings.classify(converterOptions.name)}`;

    const pipeContent = tree.readContent(defaultConverterFilePath);
    expect(pipeContent).toContain(
      `export class ${converterClassName}Converter implements PipeTransform {`
    );
    expect(pipeContent).toContain('transform(value: any, ...args: any[]): any');
  });
});
