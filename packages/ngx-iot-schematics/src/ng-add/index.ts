import {
  chain,
  externalSchematic,
  noop,
  Rule,
  SchematicContext,
  SchematicsException,
  Tree
} from '@angular-devkit/schematics';
import { readWorkspace, writeWorkspace } from '@schematics/angular/utility';
import { select } from '@inquirer/prompts';
import {
  updateTsConfig,
  NodeDependency,
  NodeDependencyType,
  installDependencies,
  getInstalledDependency,
  installNpmPackages
} from '@criticalmanufacturing/schematics-devkit/rules';
import { JsonArray, JsonObject } from '@angular-devkit/core';
import { JSONFile, listNpmReleaseTags } from '@criticalmanufacturing/schematics-devkit';

import pkg from '../../package.json';
import { Schema } from './schema.js';
import { CORE_IOT_PACKAGE, IOT_DEPENDENCIES } from './definition.js';

/**
 * Updates the angular.json file with all the relevant configuration
 */
export function updateWorkspace(): Rule {
  return async (tree: Tree) => {
    const workspace = await readWorkspace(tree);

    if (!workspace.extensions.cli) {
      workspace.extensions.cli = {};
    }

    // Add schematics to the schematic collections
    let schematicCollections = (workspace.extensions.cli as JsonObject).schematicCollections as
      | JsonArray
      | undefined;

    if (!schematicCollections) {
      schematicCollections = (workspace.extensions.cli as JsonObject).schematicCollections = [];
    }

    if (!schematicCollections.includes('@criticalmanufacturing/ngx-iot-schematics')) {
      schematicCollections.unshift('@criticalmanufacturing/ngx-iot-schematics');
    }

    await writeWorkspace(tree, workspace);
  };
}

/**
 * Updates the package.json adding the necessary properties
 */
function updatePackagejson(): Rule {
  return async (tree: Tree) => {
    const workspace = await readWorkspace(tree);
    const packJson = new JSONFile(tree, 'package.json');
    const newProjectRoot = (workspace.extensions.newProjectRoot as string) ?? 'projects';

    packJson.modify(['scripts'], {
      ...(packJson.get(['scripts']) ?? {}),
      lint: 'npm run lint -ws',
      build: 'npm run build -ws'
    });
    packJson.modify(['workspaces'], [`./${newProjectRoot}/*`]);
  };
}

/**
 * Updates main.ts file adding the load config method
 */
function installSchematics(options: Schema) {
  return async (tree: Tree, _context: SchematicContext) => {
    if (!options.version) {
      throw new SchematicsException('Option "version" is required.');
    }

    const dependencies: NodeDependency[] = [
      {
        name: pkg.name,
        version: getInstalledDependency(tree, pkg.name)?.version ?? pkg.version,
        type: NodeDependencyType.Dev,
        overwrite: true
      },
      ...IOT_DEPENDENCIES.map((name) => ({
        name,
        type: NodeDependencyType.Default,
        version: options.version!
      }))
    ];

    return chain([
      updateWorkspace(),
      installDependencies(dependencies),
      updatePackagejson(),
      updateTsConfig([
        [['compilerOptions', 'strictFunctionTypes'], false],
        [['compilerOptions', 'noImplicitAny'], false],
        [['compilerOptions', 'strictNullChecks'], false],
        [['compilerOptions', 'preserveSymlinks'], true]
      ])
    ]);
  };
}

// You don't have to export the function as default. You can also have more than one rule factory
// per file.
export default function (_options: Schema): Rule {
  return async (_: Tree, _context: SchematicContext) => {
    if (!_options.version) {
      const [appTags, pkgTags] = await Promise.all([
        listNpmReleaseTags(CORE_IOT_PACKAGE),
        listNpmReleaseTags(pkg.name, pkg.version)
      ]);

      const valideTags = pkgTags.filter((t) => appTags.includes(t)); // only include matching app package tags

      if (valideTags.length === 0) {
        throw new SchematicsException(
          `Unable to find compatible version of ${CORE_IOT_PACKAGE} with the current schematics version`
        );
      }

      _options.version = await select({
        message: 'What is the distribution to utilize?',
        choices: valideTags
      });
    }

    if (_options.eslint) {
      const angularVersion = require('@angular/cli/package.json').version.replace(
        /^(.\d+)\.\d+\.\d+/,
        '$1'
      );

      await installNpmPackages([`@angular-eslint/schematics@${angularVersion}`]);
    }

    return chain([
      _options.eslint ? externalSchematic('@angular-eslint/schematics', 'ng-add', {}) : noop(),
      installSchematics(_options)
    ]);
  };
}
