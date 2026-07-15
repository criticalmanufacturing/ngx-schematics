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
import { JsonObject, JsonValue, basename, join, normalize } from '@angular-devkit/core';
import { readWorkspace } from '@schematics/angular/utility';
import { input } from '@inquirer/prompts';
import { JSONFile, relativeToRoot, strings } from '@criticalmanufacturing/schematics-devkit';
import {
  NodeDependencyType,
  removeDirectory,
  installDependencies,
  updateNgPackageJson,
  updateTsConfig
} from '@criticalmanufacturing/schematics-devkit/rules';
import { Schema } from './schema.js';
import { updateEslintConfig } from './update-eslint-config.js';

/**
 * Edits .vscode/settings.json file to ignore compiled output
 */
function editVsCodeSettings(): Rule {
  return async (tree: Tree) => {
    const workspace = await readWorkspace(tree);

    const root = (workspace.extensions['newProjectRoot'] as string | undefined) ?? 'projects';
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

    new JSONFile(tree, vscodeSettingsPath).modify(
      ['files.exclude'],
      JSON.parse(fileExclude) as JsonValue
    );
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
    const version = rootPack.get(['dependencies', 'cmf-core-connect-iot']) ?? '0.0.0';
    const peerDeps = packJson.get(['peerDependencies']) as JsonObject | undefined;
    const scripts = packJson.get(['scripts']) as JsonObject | undefined;

    packJson.modify(['peerDependencies'], {
      ...(peerDeps ?? {}),
      '@criticalmanufacturing/connect-iot-controller-engine': version,
      'cmf-core': version,
      'cmf-core-business-controls': version,
      'cmf-core-connect-iot': version,
      'cmf-core-controls': version
    });

    packJson.modify(['scripts'], {
      ...(scripts ?? {}),
      build:
        'concurrently "npm run build:designer" "npm run build:runtime" "npm run build:tests" -r',
      'build:designer': 'ng build --configuration=development',
      'build:runtime': 'tsc -p tsconfig.lib.runtime.json',
      'build:tests': 'tsc -p test/unit',
      test: 'mocha test/**/*.test.js --timeout 5000 --exit',
      'vs:buildAndTest': 'npm run build && npm run vs:test',
      'vs:test':
        'nyc -r cobertura -r lcov -r text-summary mocha test/**/*.test.js --timeout 5000 --exit -r mocha-multi-reporters -r mocha-junit-reporter --reporter-options mochaFile=./test/test-results.xml',
      pretest: 'npm run build',
      watch:
        'concurrently "npm run build:runtime -- -w" "mocha --timeout 5000 --exit --reporter min -w test/**/*.test.js"',
      lint: 'ng lint'
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
      '@types/chai': '5.2.3',
      '@types/chai-spies': '1.0.6',
      '@types/mocha': '10.0.10',
      chai: '6.2.2',
      'chai-spies': '1.1.0',
      mocha: '11.7.1',
      'mocha-junit-reporter': '2.2.1',
      'mocha-lcov-reporter': '1.3.0',
      'mocha-multi-reporters': '1.5.1',
      nyc: '18.0.0',
      concurrently: '10.0.3'
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
      updateTsConfig(
        [{ path: ['include'], value: ['**/*.ts'], operation: 'replace' }],
        options.project
      ),
      updateEslintConfig(options),
      options.skipInstall
        ? noop()
        : installDependencies(
            Object.entries(devDeps).map(([key, value]) => ({
              type: NodeDependencyType.Dev,
              name: key,
              version: value,
              overwrite: true
            }))
          )
    ]);
  };
}

export default function (_options: Schema): Rule {
  return async (tree: Tree) => {
    const entryFile = 'public-api-designer';
    const workspace = await readWorkspace(tree);

    // Retrieve namespace (i.e @criticalmanufacturing/test -> @criticalmanufacturing)
    let namespace = /^@.*\/.*/.test(_options.name)
      ? _options.name.split('/')[0]
      : _options.namespace;

    if (!namespace) {
      namespace = await input({
        message: 'What is your package namespace?',
        default: '@criticalmanufacturing'
      });
    }

    if (namespace != null && !/^(?:@[a-zA-Z0-9-*~][a-zA-Z0-9-*._~]*)$/.test(namespace)) {
      throw new SchematicsException(
        'Data path "/namespace" must match pattern "^(?:@[a-zA-Z0-9-*~][a-zA-Z0-9-*._~])$"'
      );
    }

    const lint = ((workspace.extensions.cli as JsonObject)?.schematicCollections as string[])?.find(
      (x) => ['@angular-eslint/schematics', 'angular-eslint'].includes(x)
    );

    const fullname =
      !/^@.*\/.*/.test(_options.name) && namespace
        ? strings.dasherize(namespace + '/' + _options.name)
        : strings.dasherize(_options.name);

    _options.name = /^@.*\/.*/.test(_options.name) ? _options.name.split('/')[1] : _options.name;

    // delete extra options
    delete _options.namespace;

    return chain([
      externalSchematic(lint ?? '@schematics/angular', 'library', {
        ..._options,
        prefix: _options.prefix ?? strings.dasherize(_options.name),
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
