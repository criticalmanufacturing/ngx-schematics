import {
  Rule,
  SchematicsException,
  Tree,
  apply,
  applyTemplates,
  chain,
  externalSchematic,
  mergeWith,
  move,
  noop,
  schematic,
  url
} from '@angular-devkit/schematics';
import { Schema } from './schema';
import { JsonArray, JsonObject, basename, join, normalize } from '@angular-devkit/core';
import { readWorkspace } from '@schematics/angular/utility';
import * as inquirer from 'inquirer';
import { JSONFile, relativeToRoot, strings } from '@criticalmanufacturing/schematics-devkit';
import {
  NodeDependencyType,
  removeDirectory,
  installDependencies,
  updateNgPackageJson
} from '@criticalmanufacturing/schematics-devkit/rules';

/**
 * Edits .vscode/settings.json file to ignore compiled output
 */
function editVsCodeSettings(): Rule {
  return async (tree: Tree) => {
    const workspace = await readWorkspace(tree);

    const root = workspace.extensions['newProjectRoot'] ?? 'projects';
    const vscodeSettingsPath = join(normalize('.vscode'), 'settings.json');
    const fileExclude = `{
    "${root}/**/*.js": { "when": "$(basename).ts" },
    "${root}/**/*.d.ts": { "when": "$(basename).ts" },
    "${root}/**/*.js.map": true
  }`;

    if (!tree.exists(vscodeSettingsPath)) {
      tree.create(
        vscodeSettingsPath,
        `\
{
  "files.exclude": ${fileExclude}
}`
      );

      return;
    }

    new JSONFile(tree, vscodeSettingsPath).modify(['files.exclude'], JSON.parse(fileExclude));
  };
}

/**
 * Updates the package.json adding the necessary properties
 */
function updatePackagejson(options: { project: string; name: string }): Rule {
  return async (tree: Tree) => {
    const workspace = await readWorkspace(tree);
    const project = workspace.projects.get(options.project);

    if (!project) {
      throw new SchematicsException(`Project is not defined in this workspace.`);
    }

    const packJson = new JSONFile(tree, join(normalize(project.root), 'package.json'));

    if ((packJson.get(['name']) as string) !== options.name) {
      packJson.modify(['name'], options.name);
    }

    const rootPack = new JSONFile(tree, 'package.json');
    const version = rootPack.get(['dependencies', 'cmf-core-connect-iot']);

    packJson.modify(['peerDependencies'], {
      ...(packJson.get(['peerDependencies']) ?? {}),
      '@criticalmanufacturing/connect-iot-controller-engine': version,
      'cmf-core': version,
      'cmf-core-business-controls': version,
      'cmf-core-connect-iot': version,
      'cmf-core-controls': version
    });

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

/**
 * IoT Library generator
 */
function addIoTLibrary(options: { project: string; skipInstall: boolean; fullname: string }) {
  return async (tree: Tree) => {
    const workspace = await readWorkspace(tree);
    const project = workspace.projects.get(options.project);

    if (!project) {
      throw new SchematicsException(`Project is not defined in this workspace.`);
    }

    tree.delete(join(normalize(project.root), 'src', 'public-api-designer.ts'));

    const templateSource = apply(url('./files'), [
      applyTemplates({
        ...options,
        ...strings,
        entryFile: 'public-api',
        relativePathToWorkspaceRoot: relativeToRoot(join(normalize(project.root), 'metadata')),
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
      removeDirectory(sourceDir),
      updatePackagejson({
        project: options.project,
        name: options.fullname
      }),
      editVsCodeSettings(),
      schematic('task', {
        path: `${sourceDir}/tasks`,
        project: options.project,
        name: options.project,
        hasInputs: false,
        hasOutputs: false,
        isForProtocol: false
      }),
      options.skipInstall
        ? noop()
        : installDependencies(
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
    const entryFile = 'public-api-designer';
    const workspace = await readWorkspace(tree);

    let namespace = /^@.*\/.*/.test(_options.name)
      ? _options.name.split('/')[0]
      : _options.namespace;

    if (!namespace) {
      const question: inquirer.InputQuestion = {
        type: 'input',
        name: 'namespace',
        message: 'What is your package namespace?',
        default: '@criticalmanufacturing'
      };

      namespace = (await inquirer.prompt([question])).namespace;
    }

    if (namespace != null && !/^(?:@[a-zA-Z0-9-*~][a-zA-Z0-9-*._~]*)$/.test(namespace)) {
      throw new SchematicsException(
        'Data path "/namespace" must match pattern "^(?:@[a-zA-Z0-9-*~][a-zA-Z0-9-*._~])$"'
      );
    }

    const lint = (
      (workspace.extensions.cli as JsonObject)?.schematicCollections as JsonArray
    )?.includes('@angular-eslint/schematics');

    const fullname =
      !/^@.*\/.*/.test(_options.name) && namespace
        ? strings.dasherize(namespace + '/' + _options.name)
        : strings.dasherize(_options.name);

    _options.name = /^@.*\/.*/.test(_options.name) ? _options.name.split('/')[1] : _options.name;

    // delete extra options
    delete _options.namespace;

    return chain([
      externalSchematic(lint ? '@angular-eslint/schematics' : '@schematics/angular', 'library', {
        ..._options,
        entryFile
      }),
      updateNgPackageJson(_options),
      addIoTLibrary({
        project: _options.name,
        skipInstall: _options.skipInstall ?? false,
        fullname: fullname
      })
    ]);
  };
}
