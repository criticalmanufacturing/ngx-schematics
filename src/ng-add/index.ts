import {
  chain,
  externalSchematic,
  noop,
  Rule,
  SchematicContext,
  SchematicsException,
  Tree,
} from '@angular-devkit/schematics';

import { readWorkspace } from '@schematics/angular/utility';

import { NodePackageInstallTask } from '@angular-devkit/schematics/tasks';

import { JsonObject } from '@angular-devkit/core';

import { exec } from 'child_process';
import * as inquirer from 'inquirer';

import { CORE_BASE_MODULE, MES_BASE_MODULE } from './package-configs';

import { updateTsConfig } from '../utility/project';
import {
  addPackageJsonDependency,
  NodeDependency,
  NodeDependencyType,
} from '../utility/dependency';

import { version as pkgVersion, name as pkgName } from '../../package.json';
import { Schema } from './schema';
import { updateIndexFiles } from './rules/update-index';
import { updateBootstrapComponent } from './rules/update-bootstrap-component';
import { updateAppModule } from './rules/update-app-module';
import { updateMain } from './rules/update-main';
import { addConfigJson } from './rules/add-config-json';
import { updateWorkspace } from './rules/update-workspace';

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

/**
 * Updates main.ts file adding the load config method
 */
function installSchematics(options: Schema) {
  return async (tree: Tree, _context: SchematicContext) => {
    const workspace = await readWorkspace(tree);

    if (options.project) {
      const project = workspace.projects.get(options.project);

      if (!project) {
        throw new SchematicsException(
          `Project is not defined in this workspace.`
        );
      }

      if (project.extensions['projectType'] !== 'application') {
        throw new SchematicsException(
          `HTMLStarter requires a project type of "application".`
        );
      }

      // Find all the relevant targets for the project
      if (project.targets.size === 0) {
        throw new SchematicsException(
          `Targets are not defined for this project.`
        );
      }
    }

    if (!options.version) {
      const [appTags, pkgTags] = await Promise.all([
        listNpmReleaseTags(
          options.application === 'MES'
            ? MES_BASE_MODULE[0]
            : CORE_BASE_MODULE[0]
        ),
        listNpmReleaseTags(`${pkgName}@${pkgVersion}`),
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
        choices: valideTags,
      };

      options.version = (await inquirer.prompt([question])).distTag;
    }

    if (!options.version) {
      throw new SchematicsException('Option "version" is required.');
    }

    const dependencies = [];
    if (options.application === 'MES') {
      dependencies.push({
        type: NodeDependencyType.Default,
        name: MES_BASE_MODULE[0],
        version: options.version,
      });
    } else {
      dependencies.push({
        type: NodeDependencyType.Default,
        name: CORE_BASE_MODULE[0],
        version: options.version,
      });
    }

    return chain([
      ...(options.project
        ? [
            addConfigJson(options as Required<Schema>),
            updateIndexFiles(options as Required<Schema>),
            updateWorkspace(options as Required<Schema>),
            updateBootstrapComponent(),
            updateAppModule(options),
            updateMain(),
          ]
        : [noop()]),
      installDependencies(dependencies),
      updateTsConfig([
        [['compilerOptions', 'strictFunctionTypes'], false],
        [['compilerOptions', 'noImplicitAny'], false],
        [['compilerOptions', 'strictNullChecks'], false],
        [['compilerOptions', 'allowSyntheticDefaultImports'], true],
      ]),
    ]);
  };
}

// You don't have to export the function as default. You can also have more than one rule factory
// per file.
export default function (_options: Schema): Rule {
  return async (tree: Tree, _context: SchematicContext) => {
    const packjson = tree.readJson('package.json') as JsonObject;
    const allDeps = [
      ...Object.keys(packjson.dependencies as JsonObject),
      ...Object.keys(packjson.devDependencies as JsonObject),
    ];

    return chain([
      _options.project && !allDeps.includes('@angular/service-worker')
        ? externalSchematic('@angular/pwa', 'pwa', {
            project: _options.project,
          })
        : noop(),
      externalSchematic('@angular/localize', 'ng-add', {
        project: _options.project,
        useAtRuntime: true,
      }),
      _options.eslint
        ? externalSchematic('@angular-eslint/schematics', 'ng-add', {})
        : noop(),
      installSchematics(_options),
    ]);
  };
}
