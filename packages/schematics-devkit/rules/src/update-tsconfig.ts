import { JsonArray, JsonValue } from '@angular-devkit/core';
import { Rule, SchematicsException, Tree } from '@angular-devkit/schematics';
import { readWorkspace } from '@schematics/angular/utility';
import { updateJsonFile } from './update-json-file';

/**
 * Update the root tsconfig.json file with the new configuration
 * @param rules rules to insert
 */
export function updateTsConfig(
  rules: (
    | { path: string[]; value: JsonArray; operation?: 'add' | 'remove' | 'replace' }
    | { path: string[]; value: JsonValue; operation?: 'replace' }
    | { path: string[]; value: undefined; operation?: 'remove' }
  )[],
  project?: string
): Rule {
  return async (tree: Tree) => {
    let tsConfig = 'tsconfig.json';

    if (project) {
      const workspace = await readWorkspace(tree);
      const projectDef = workspace.projects.get(project);

      if (!projectDef) {
        throw new SchematicsException(`Project is not defined in this workspace.`);
      }

      tsConfig =
        (projectDef.targets.get('build')?.configurations?.development?.tsConfig as
          string | undefined) ?? tsConfig;
    }

    return updateJsonFile(tsConfig, rules);
  };
}
