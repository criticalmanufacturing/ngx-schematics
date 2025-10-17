import { JsonArray, JsonObject } from '@angular-devkit/core';
import { Rule, SchematicsException, Tree } from '@angular-devkit/schematics';
import { readWorkspace, writeWorkspace } from '@schematics/angular/utility';
import { isDeepStrictEqual } from 'util';
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

/**
 * Adds elements to json array if not already present.
 * @param array array of elements
 * @param elementsToAdd elements to add to array
 */
function addToJsonArray(array: JsonArray, elementsToAdd: any[]) {
  elementsToAdd.forEach((toAdd) => {
    if (
      !array.some((existing) =>
        isDeepStrictEqual(typeof existing === 'object' ? { ...existing } : existing, toAdd)
      )
    ) {
      array.push(toAdd);
    }
  });
}

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

    if (options.project) {
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

        // override options
        if (target.options) {
          // add preserve symlinks to install custom libraries like cutom lbos
          target.options.preserveSymlinks = true;

          // Add allowedCommonJsDependencies
          target.options.allowedCommonJsDependencies ??= [];
          if (target.options.allowedCommonJsDependencies instanceof Array) {
            addToJsonArray(
              target.options.allowedCommonJsDependencies,
              PROJECT_ALLOWED_COMMONJS_DEPENDENCIES
            );
          } else {
            target.options.allowedCommonJsDependencies = PROJECT_ALLOWED_COMMONJS_DEPENDENCIES;
          }

          // Add assets
          target.options.assets = [];
          if (target.options.assets instanceof Array) {
            addToJsonArray(
              target.options.assets,
              options.application === 'MES' ? PROJECT_MES_ASSETS : PROJECT_CORE_ASSETS
            );
          }

          // Add styles
          target.options.styles ??= [];
          if (target.options.styles instanceof Array) {
            addToJsonArray(
              target.options.styles,
              options.application === 'MES' ? PROJECT_MES_STYLES : PROJECT_CORE_STYLES
            );
          }

          // Add scripts
          target.options.scripts ??= [];
          if (target.options.scripts instanceof Array) {
            addToJsonArray(target.options.scripts, PROJECT_SCRIPTS);
          }

          // Add polyfills
          target.options.polyfills ??= [];
          if (target.options.polyfills instanceof Array) {
            addToJsonArray(target.options.polyfills, PROJECT_POLYFILLS);
          }

          if (
            ['@angular-devkit/build-angular:application', '@angular/build:application'].some(
              (x) => x === target.builder
            )
          ) {
            target.options.outputPath = {
              base: `dist/${options.project}`,
              browser: ''
            };
          }
        }
      }
    }

    await writeWorkspace(tree, workspace);
  };
}
