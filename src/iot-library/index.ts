import {
  Rule,
  SchematicContext,
  SchematicsException,
  Tree,
  apply,
  applyTemplates,
  chain,
  externalSchematic,
  mergeWith,
  move,
  schematic,
  url
} from '@angular-devkit/schematics';
import { Schema } from './schema';
import {
  JsonArray,
  JsonObject,
  basename,
  join,
  normalize,
  strings
} from '@angular-devkit/core';
import { readWorkspace } from '@schematics/angular/utility';
import { relativePathToWorkspaceRoot, removeDir } from '../utility/workspace';
import { nameify } from '../utility/string';
import { JSONFile } from '../utility/json';
import {
  NodeDependency,
  NodeDependencyType,
  addPackageJsonDependency
} from '../utility/dependency';
import { NodePackageInstallTask } from '@angular-devkit/schematics/tasks';

/**
 * Installs application dependencies in package.json
 */
function installDependencies(dependencies: NodeDependency[]) {
  return (host: Tree, _context: SchematicContext) => {
    dependencies.forEach((dependency) =>
      addPackageJsonDependency(host, dependency)
    );
    _context.addTask(new NodePackageInstallTask());
    return host;
  };
}

function updatePackagejson(options: { project: string }) {
  return async (tree: Tree) => {
    const workspace = await readWorkspace(tree);
    const project = workspace.projects.get(options.project);

    if (!project) {
      throw new SchematicsException(
        `Project is not defined in this workspace.`
      );
    }

    const packJson = new JSONFile(
      tree,
      join(normalize(project.root), 'package.json')
    );

    packJson.modify(['scripts'], {
      ...(packJson.get(['scripts']) ?? {}),
      build:
        'concurrently "npm run build:designer" "npm run build:runtime" "npm run build:tests" -r',
      'build:designer': 'ng build --configuration=development',
      'build:runtime': 'tsc -p tsconfig.lib.runtime.json',
      'build:tests': 'tsc -p test/unit',
      test: 'mocha test/**/*.test.js --timeout 5000 --exit',
      'vs:buildAndTest': 'npm run build && npm run vs:test',
      'vs:test':
        'nyc -r cobertura -r lcov -r text-summary mocha test/**/*.test.js -- --timeout 5000 --exit -r mocha-multi-reporters -r mocha-junit-reporter --reporter-options mochaFile=./test/test-results.xml',
      pretest: 'npm run build',
      watch:
        'npm run build:runtime -- -w | mocha --timeout 5000 --exit --reporter min -w test/**/*.test.js'
    });
  };
}

function addIoTLibrary(options: { name: string; project: string }) {
  return async (tree: Tree) => {
    const workspace = await readWorkspace(tree);
    const project = workspace.projects.get(options.project);

    if (!project) {
      throw new SchematicsException(
        `Project is not defined in this workspace.`
      );
    }

    tree.delete(join(normalize(project.root), 'src', 'public-api-designer.ts'));

    const templateSource = apply(url('./files'), [
      applyTemplates({
        ...options,
        ...strings,
        nameify,
        entryFile: 'public-api',
        relativePathToWorkspaceRoot: relativePathToWorkspaceRoot(
          join(normalize(project!.root), 'metadata')
        ),
        metadatatDistRoot: join(basename(normalize(project.root)), 'metadata')
      }),
      move(join(normalize(project.root)))
    ]);

    const sourceDir = `${project.root}/src/lib`;

    const devDeps = {
      '@types/chai': '4.3.0',
      '@types/chai-spies': '1.0.3',
      '@types/mocha': '9.0.0',
      '@types/node-cron': '^2.0.5',
      chai: '4.3.4',
      'chai-spies': '1.0.0',
      mocha: '9.1.3',
      'mocha-junit-reporter': '2.0.2',
      'mocha-lcov-reporter': '1.3.0',
      'mocha-multi-reporters': '1.5.1',
      nyc: '15.1.0',
      concurrently: '^7.6.0'
    };

    return chain([
      mergeWith(templateSource),
      removeDir(sourceDir),
      updatePackagejson({ project: options.project }),
      schematic('iot-task', {
        path: `${sourceDir}/tasks`,
        project: options.project,
        name: options.name,
        hasInputs: false,
        hasOutputs: false,
        isForProtocol: false
      }),
      installDependencies(
        Object.entries(devDeps).map(([key, value]) => ({
          type: NodeDependencyType.Dev,
          name: key,
          version: value
        }))
      )
    ]);
  };
}

export default function (_options: Schema): Rule {
  return async (tree: Tree) => {
    if (!_options.prefix) {
      const folderName = _options.name.startsWith('@')
        ? _options.name.substring(1)
        : _options.name;

      if (/[A-Z]/.test(folderName)) {
        _options.prefix = strings.dasherize(folderName);
      }
    }

    const entryFile = 'public-api-designer';
    const workspace = await readWorkspace(tree);

    const lint = (
      (workspace.extensions.cli as JsonObject)
        ?.schematicCollections as JsonArray
    )?.includes('@angular-eslint/schematics');

    return chain([
      externalSchematic(
        lint ? '@angular-eslint/schematics' : '@schematics/angular',
        'library',
        { ..._options, entryFile }
      ),
      addIoTLibrary({
        name: /^@.*\/.*/.test(_options.name)
          ? _options.name.split('/')[1]
          : _options.name,
        project: _options.name
      })
    ]);
  };
}
