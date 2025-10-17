import { Rule, SchematicsException, Tree } from '@angular-devkit/schematics';
import { JSONFile } from '@criticalmanufacturing/schematics-devkit';
import { readWorkspace } from '@schematics/angular/utility';

/**
 * Update the root tsconfig.json file with the new configuration
 * @param rules rules to insert
 */
export function updateTsConfig(rules: [string[], any][], project?: string): Rule {
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
          | string
          | undefined) ?? tsConfig;
    }

    if (!tree.exists(tsConfig)) {
      return;
    }

    const file = new JSONFile(tree, tsConfig);

    rules.forEach(([path, value]) => {
      const newValue = value;
      const oldValue = file.get(path);

      file.modify(
        path,
        Array.isArray(oldValue) && Array.isArray(newValue) ? [...oldValue, ...newValue] : newValue
      );
    });
  };
}
