import { Rule, SchematicsException, Tree } from '@angular-devkit/schematics';
import { readWorkspace, writeWorkspace } from '@schematics/angular/utility';
import {
  addToJsonArray,
  addToJsonObject,
  getBuildTargets,
  removeFromJsonArray,
  removeFromJsonObject
} from '@criticalmanufacturing/schematics-devkit';
import { isJsonArray, isJsonObject, JsonArray, JsonObject, JsonValue } from '@angular-devkit/core';

/**
 * Updates a record object with a new value for a specified key.
 */
function updateRecord(
  record: Record<string, JsonValue | undefined>,
  key: string,
  value: JsonValue | undefined,
  operation: 'add' | 'remove' | 'replace' = 'replace'
): void {
  if (value === undefined) {
    delete record[key];
    return;
  }

  const currValue = record[key];

  if (currValue != null && isJsonArray(currValue) && isJsonArray(value)) {
    if (operation === 'add') {
      addToJsonArray(currValue, value);
      return;
    } else if (operation === 'remove') {
      removeFromJsonArray(currValue, value);
      return;
    }
  }

  if (currValue != null && isJsonObject(currValue) && isJsonObject(value)) {
    if (operation === 'add') {
      addToJsonObject(currValue, value);
      return;
    } else if (operation === 'remove') {
      removeFromJsonObject(currValue, value);
      return;
    }
  }

  record[key] = value;
}

/**
 * Adds the assets to the desired application or to the default application project
 */
export function updateAppBuildTarget(
  project: string,
  options: (
    | { path: string[]; value: JsonArray | JsonObject; operation?: 'add' | 'remove' | 'replace' }
    | { path: string[]; value: JsonValue; operation?: 'replace' }
    | { path: string[]; value: undefined; operation?: 'remove' }
  )[]
): Rule {
  return async (tree: Tree) => {
    const workspace = await readWorkspace(tree);
    const projectDef = workspace.projects.get(project);

    // if there is no project defined, we are done.
    if (!projectDef) {
      throw new SchematicsException(`Project "${project}" does not exist.`);
    }

    const buildTargets = getBuildTargets(projectDef);

    // Configure project options
    for (const target of buildTargets) {
      // override options
      if (target.options) {
        for (const option of options) {
          const { path, value, operation } = option;
          const key = path.at(-1);
          if (!key) {
            return;
          }

          // fetch json value from path
          let record = target.options ?? {};
          for (let i = 0; i < path.length - 1; i++) {
            const segment = path[i];
            if (
              record[segment] &&
              !Array.isArray(record[segment]) &&
              typeof record[segment] === 'object'
            ) {
              record = record[segment];
            } else if (value !== undefined) {
              record = record[segment] = {};
            }
          }

          // update json key
          updateRecord(record, key, value, operation);
        }
      }
    }

    await writeWorkspace(tree, workspace);
  };
}
