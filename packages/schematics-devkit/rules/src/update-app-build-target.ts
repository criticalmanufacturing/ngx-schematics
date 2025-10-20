import { Rule, SchematicsException, Tree } from '@angular-devkit/schematics';
import { readWorkspace, writeWorkspace } from '@schematics/angular/utility';
import {
  addToJsonArray,
  getBuildTargets,
  removeFromJsonArray
} from '@criticalmanufacturing/schematics-devkit';
import { isJsonArray, JsonValue } from '@angular-devkit/core';

/**
 * Adds the assets to the desired application or to the default application project
 */
export function updateAppBuildTarget(
  project: string,
  options: [string[], JsonValue | undefined, boolean?][]
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
          const [path, value, remove] = option;
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
          if (value !== undefined) {
            const currValue = record[key];
            if (currValue && isJsonArray(currValue) && isJsonArray(value)) {
              if (remove !== true) {
                addToJsonArray(currValue, value);
              } else {
                removeFromJsonArray(currValue, value);
              }
            } else {
              record[key] = value;
            }
          } else {
            delete record[key];
          }
        }
      }
    }

    await writeWorkspace(tree, workspace);
  };
}
