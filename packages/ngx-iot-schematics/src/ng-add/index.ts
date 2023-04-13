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

import { exec } from 'child_process';
import * as inquirer from 'inquirer';

import {
  updateTsConfig,
  NodeDependency,
  NodeDependencyType,
  installDependencies,
  getInstalledDependency
} from '@criticalmanufacturing/schematics-devkit/rules';

import { version as pkgVersion, name as pkgName } from '../../package.json';
import { Schema } from './schema';
import { CORE_IOT_PACKAGE, IOT_DEPENDENCIES } from './defenition';
import { JsonArray, JsonObject } from '@angular-devkit/core';
/**
 * List ngx-schematics release tags of the current version
 */
function listNpmReleaseTags(pkg: string) {
  return new Promise<string[]>((resolve, reject) => {
    exec(`npm dist-tag ls ${pkg}`, (error, stdout, stderr) => {
      if (error) {
        return reject(new Error(stderr));
      }

      return resolve(stdout.match(/^[^:]+/gm)?.reverse() ?? []);
    });
  });
}

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
 * Updates main.ts file adding the load config method
 */
function installSchematics(options: Schema) {
  return async (tree: Tree, _context: SchematicContext) => {
    const workspace = await readWorkspace(tree);

    if (options.project) {
      const project = workspace.projects.get(options.project);

      if (!project) {
        throw new SchematicsException(`Project is not defined in this workspace.`);
      }

      if (!options.version) {
        const [appTags, pkgTags] = await Promise.all([
          listNpmReleaseTags(CORE_IOT_PACKAGE),
          listNpmReleaseTags(`${pkgName}@${pkgVersion}`)
        ]);

        const valideTags = pkgTags.filter((t) => appTags.includes(t)); // only include matching app package tags

        if (valideTags.length === 0) {
          throw new SchematicsException(
            'There are no matching npm dist-tags for the current application'
          );
        }

        const question: inquirer.ListQuestion = {
          type: 'list',
          name: 'distTag',
          message: 'What is the distribution to utilize?',
          choices: valideTags
        };

        options.version = (await inquirer.prompt([question])).distTag;
      }

      if (!options.version) {
        throw new SchematicsException('Option "version" is required.');
      }

      const dependencies: NodeDependency[] = IOT_DEPENDENCIES.map((name) => ({
        name,
        type: NodeDependencyType.Default,
        version: options.version!
      }));

      dependencies.push({
        name: pkgName,
        version: getInstalledDependency(tree, pkgName)?.version ?? pkgVersion,
        type: NodeDependencyType.Dev,
        overwrite: true
      });

      return chain([
        updateWorkspace(),
        installDependencies(dependencies),
        updateTsConfig([
          [['compilerOptions', 'strictFunctionTypes'], false],
          [['compilerOptions', 'noImplicitAny'], false],
          [['compilerOptions', 'strictNullChecks'], false],
          [['compilerOptions', 'allowSyntheticDefaultImports'], true]
        ])
      ]);
    }
  };
}

// You don't have to export the function as default. You can also have more than one rule factory
// per file.
export default function (_options: Schema): Rule {
  return async (_: Tree, _context: SchematicContext) => {
    return chain([
      _options.eslint ? externalSchematic('@angular-eslint/schematics', 'ng-add', {}) : noop(),
      installSchematics(_options)
    ]);
  };
}
