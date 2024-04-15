import {
  chain,
  externalSchematic,
  noop,
  Rule,
  SchematicContext,
  SchematicsException,
  Tree
} from '@angular-devkit/schematics';

import { readWorkspace } from '@schematics/angular/utility';

import { JsonArray, JsonObject } from '@angular-devkit/core';

import inquirer, { ListQuestion } from 'inquirer';

import { CORE_BASE_MODULE, MES_BASE_MODULE } from './package-configs';

import {
  NodeDependency,
  NodeDependencyType,
  getInstalledDependency,
  installDependencies,
  updateTsConfig,
  installNpmPackages
} from '@criticalmanufacturing/schematics-devkit/rules';

import { version as pkgVersion, name as pkgName } from '../../package.json';
import { Schema } from './schema';
import { updateIndexFiles } from './rules/update-index';
import { updateBootstrapComponent } from './rules/update-bootstrap-component';
import { updateMain } from './rules/update-main';
import { addConfigJson } from './rules/add-config-json';
import { updateWorkspace } from './rules/update-workspace';
import { listNpmReleaseTags } from '@criticalmanufacturing/schematics-devkit';
import { updateAppModule } from './rules/update-app-module';
import { updateAppConfig } from './rules/update-app-config';
import { updateNgswConfig } from './rules/update-ngsw-config';

/**
 * Updates main.ts file adding the load config method
 */
function installSchematics(options: Schema) {
  return async (tree: Tree, _context: SchematicContext) => {
    if (options.project) {
      const workspace = await readWorkspace(tree);
      const project = workspace.projects.get(options.project);

      if (!project) {
        throw new SchematicsException(`Project is not defined in this workspace.`);
      }

      if (project.extensions['projectType'] !== 'application') {
        throw new SchematicsException(`HTMLStarter requires a project type of "application".`);
      }

      // Find all the relevant targets for the project
      if (project.targets.size === 0) {
        throw new SchematicsException(`Targets are not defined for this project.`);
      }
    }

    if (!options.version) {
      throw new SchematicsException('Option "version" is required.');
    }

    const dependencies: NodeDependency[] = [
      {
        name: pkgName,
        version: getInstalledDependency(tree, pkgName)?.version ?? pkgVersion,
        type: NodeDependencyType.Dev,
        overwrite: true
      },
      {
        name: options.application === 'MES' ? MES_BASE_MODULE[0] : CORE_BASE_MODULE[0],
        version: options.version,
        type: NodeDependencyType.Default
      }
    ];

    return chain([
      ...(options.project
        ? [
            addConfigJson(options as Required<Schema>),
            updateIndexFiles(options as Required<Schema>),
            updateBootstrapComponent({ project: options.project }),
            updateAppModule({ project: options.project, application: options.application }),
            updateAppConfig({ project: options.project, application: options.application }),
            updateMain({ project: options.project })
          ]
        : [noop()]),
      updateNgswConfig(options as Required<Schema>),
      updateWorkspace(options),
      installDependencies(dependencies),
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
  return async (tree: Tree, _context: SchematicContext) => {
    if (!_options.version) {
      const appPackage = _options.application === 'MES' ? MES_BASE_MODULE[0] : CORE_BASE_MODULE[0];

      const [appTags, pkgTags] = await Promise.all([
        listNpmReleaseTags(appPackage),
        listNpmReleaseTags(pkgName, pkgVersion)
      ]);

      const valideTags = pkgTags.filter((t) => appTags.includes(t)); // only include matching app package tags

      if (valideTags.length === 0) {
        throw new SchematicsException(
          `Unable to find compatible version of ${appPackage} with the current schematics version`
        );
      }

      const question: ListQuestion = {
        type: 'list',
        name: 'distTag',
        message: 'What is the distribution to utilize?',
        choices: valideTags
      };

      _options.version = (await inquirer.prompt([question])).distTag;
    }

    const packjson = tree.readJson('package.json') as JsonObject;
    const allDeps = [
      ...Object.keys(packjson.dependencies as JsonObject),
      ...Object.keys(packjson.devDependencies as JsonObject)
    ];

    const workspace = await readWorkspace(tree);
    _options.eslint =
      _options.eslint &&
      !((workspace.extensions.cli as JsonObject)?.schematicCollections as JsonArray)?.includes(
        '@angular-eslint/schematics'
      );

    const angularVersion = require('@angular/cli/package.json').version.replace(
      /^(.\d+)\.\d+\.\d+/,
      '$1'
    );

    await installNpmPackages([
      `@angular/pwa@${angularVersion}`,
      `@angular/localize@${angularVersion}`,
      _options.eslint ? `@angular-eslint/schematics@${angularVersion}` : ''
    ]);

    return chain([
      _options.project && !allDeps.includes('@angular/service-worker')
        ? externalSchematic('@angular/pwa', 'pwa', {
            project: _options.project
          })
        : noop(),
      _options.project
        ? externalSchematic('@angular/localize', 'ng-add', {
            project: _options.project,
            useAtRuntime: true
          })
        : noop(),
      _options.eslint ? externalSchematic('@angular-eslint/schematics', 'ng-add', {}) : noop(),
      installSchematics(_options)
    ]);
  };
}
