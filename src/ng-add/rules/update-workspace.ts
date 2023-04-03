import { JsonArray, JsonObject } from '@angular-devkit/core';
import { Rule, SchematicsException, Tree } from '@angular-devkit/schematics';
import { readWorkspace, writeWorkspace } from '@schematics/angular/utility';
import { isDeepStrictEqual } from 'util';
import { getProjectBuildTargets } from '../../utility/workspace';
import {
  PROJECT_ALLOWED_COMMONJS_DEPENDENCIES,
  PROJECT_CORE_ASSETS,
  PROJECT_CORE_STYLES,
  PROJECT_MES_ASSETS,
  PROJECT_MES_STYLES,
  PROJECT_SCRIPTS
} from '../package-configs';
import { Schema } from '../schema';

/**
 * Adds elements to json array if not already present.
 * @param array array of elements
 * @param elementsToAdd elements to add to array
 */
function addToJsonArray(array: JsonArray, elementsToAdd: any[]) {
  elementsToAdd.forEach((toAdd) => {
    if (
      !array.some((existing) =>
        isDeepStrictEqual(
          typeof existing === 'object' ? { ...existing } : existing,
          toAdd
        )
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
    let schematicCollections = (workspace.extensions.cli as JsonObject)
      .schematicCollections as JsonArray | undefined;

    if (!schematicCollections) {
      schematicCollections = (
        workspace.extensions.cli as JsonObject
      ).schematicCollections = [];
    }

    if (
      !schematicCollections.includes('@criticalmanufacturing/ngx-schematics')
    ) {
      schematicCollections.unshift('@criticalmanufacturing/ngx-schematics');
    }

    if (options.project) {
      const project = workspace.projects.get(options.project);

      // if there is no project defined, we are done.
      if (!project) {
        throw new SchematicsException(
          `Project "${options.project}" does not exist.`
        );
      }

      const buildTargets = getProjectBuildTargets(project);

      // Configure project options
      for (const target of buildTargets) {
        // override configurations
        if (target.configurations) {
          const budgets = target.configurations!['production']?.['budgets'] as
            | JsonArray
            | undefined;
          const initialBudget = budgets?.findIndex(
            (budget) => (budget as JsonObject).type === 'initial'
          );

          if (budgets && initialBudget != null && initialBudget >= 0) {
            budgets[initialBudget] = {
              ...(budgets[initialBudget] as JsonObject),
              maximumWarning: options.application === 'MES' ? '11mb' : '10mb',
              maximumError: options.application === 'MES' ? '12mb' : '11mb'
            };
          }
        }

        // override options
        if (target.options) {
          // Add allowedCommonJsDependencies
          if (target.options.allowedCommonJsDependencies instanceof Array) {
            addToJsonArray(
              target.options.allowedCommonJsDependencies,
              PROJECT_ALLOWED_COMMONJS_DEPENDENCIES
            );
          } else {
            target.options.allowedCommonJsDependencies =
              PROJECT_ALLOWED_COMMONJS_DEPENDENCIES;
          }

          // Add assets
          if (target.options.assets instanceof Array) {
            const index = target.options.assets.indexOf('src/favicon.ico');
            if (index >= 0) {
              target.options.assets.splice(index, 1);
              if (tree.exists('src/favicon.ico')) {
                tree.delete('src/favicon.ico');
              }
            }

            addToJsonArray(
              target.options.assets,
              options.application === 'MES'
                ? PROJECT_MES_ASSETS
                : PROJECT_CORE_ASSETS
            );
          }

          // Add styles
          if (target.options.styles instanceof Array) {
            addToJsonArray(
              target.options.styles,
              options.application === 'MES'
                ? PROJECT_MES_STYLES
                : PROJECT_CORE_STYLES
            );
          }

          // Add scripts
          if (target.options.scripts instanceof Array) {
            addToJsonArray(target.options.scripts, PROJECT_SCRIPTS);
          }
        }
      }
    }

    await writeWorkspace(tree, workspace);
  };
}
