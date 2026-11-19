import { JsonArray, JsonValue } from '@angular-devkit/core';
import { Rule, SchematicsException, Tree } from '@angular-devkit/schematics';
import { AngularBuilder, readWorkspace } from '@schematics/angular/utility';
import { updateJsonFile } from './update-json-file';

/**
 * Updates the workspace tsconfig or the build tsconfig of a specified project.
 * Uses the development configuration when it defines a tsconfig, then the library builder's default tsconfig, then the workspace tsconfig.
 * @param rules JSON updates to apply.
 * @param project Optional workspace project name.
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

      const build = projectDef.targets.get('build');
      const projectTsConfig =
        build?.configurations?.development?.['tsConfig'] ??
        (build?.builder === AngularBuilder.BuildLibrary ? build.options?.['tsConfig'] : undefined);
      if (typeof projectTsConfig === 'string') {
        tsConfig = projectTsConfig;
      }
    }

    return updateJsonFile(tsConfig, rules);
  };
}
