import { JsonArray, JsonObject } from '@angular-devkit/core';
import { Rule, SchematicsException, Tree } from '@angular-devkit/schematics';
import { readWorkspace, writeWorkspace } from '@schematics/angular/utility';
import { getBuildTargets } from '@criticalmanufacturing/schematics-devkit';
import {
  PROJECT_ALLOWED_COMMONJS_DEPENDENCIES,
  PROJECT_CORE_ASSETS,
  PROJECT_CORE_STYLES,
  PROJECT_MES_ASSETS,
  PROJECT_MES_STYLES,
  PROJECT_POLYFILLS,
  PROJECT_SCRIPTS
} from '../package-configs.js';
import { Schema } from '../schema.js';
import { updateAppBuildTarget } from '@criticalmanufacturing/schematics-devkit/rules';

/**
 * Updates the angular.json file with all the relevant configuration
 */
export function updateWorkspace(options: {
  project?: string;
  application: Schema['application'];
}): Rule {
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

    if (!schematicCollections.includes('@criticalmanufacturing/ngx-schematics')) {
      schematicCollections.unshift('@criticalmanufacturing/ngx-schematics');
    }

    if (!options.project) {
      return;
    }
    const project = workspace.projects.get(options.project);

    // if there is no project defined, we are done.
    if (!project) {
      throw new SchematicsException(`Project "${options.project}" does not exist.`);
    }

    const buildTargets = getBuildTargets(project);

    // Configure project options
    for (const target of buildTargets) {
      // override configurations
      if (target.configurations && target.configurations['production']?.['budgets']) {
        const budgets = target.configurations['production']['budgets'] as JsonArray;

        const initialBudget = budgets.findIndex(
          (budget) => (budget as JsonObject).type === 'initial'
        );

        if (initialBudget >= 0) {
          // delete initial budget configuration
          budgets.splice(initialBudget, 1);
        }
      }
    }

    await writeWorkspace(tree, workspace);

    return updateAppBuildTarget(options.project, [
      // add preserve symlinks to install custom libraries like cutom lbos
      { path: ['preserveSymlinks'], value: true },
      // Add allowedCommonJsDependencies
      { path: ['allowedCommonJsDependencies'], value: PROJECT_ALLOWED_COMMONJS_DEPENDENCIES },
      // Add assets
      { path: ['assets'], value: undefined },
      {
        path: ['assets'],
        value: (options.application === 'MES'
          ? PROJECT_MES_ASSETS
          : PROJECT_CORE_ASSETS) as JsonArray
      },
      // Add styles
      {
        path: ['styles'],
        value: options.application === 'MES' ? PROJECT_MES_STYLES : PROJECT_CORE_STYLES
      },
      // Add scripts
      { path: ['scripts'], value: PROJECT_SCRIPTS },
      // Add polyfills
      { path: ['polyfills'], value: PROJECT_POLYFILLS },
      // update output path
      { path: ['outputPath'], value: { base: `dist/${options.project}`, browser: '' } }
    ]);
  };
}
