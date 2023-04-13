import { Rule, Tree } from '@angular-devkit/schematics';
import { JSONFile } from '@criticalmanufacturing/schematics-devkit';

/**
 * Update the root tsconfig.json file with the new configuration
 * @param rules rules to insert
 */
export function updateTsConfig(rules: [string[], any][]): Rule {
  return async (tree: Tree) => {
    if (!tree.exists('tsconfig.json')) {
      return;
    }

    const file = new JSONFile(tree, 'tsconfig.json');

    rules.forEach(([path, value]) => {
      const newValue = value;
      const oldValue = file.get(path);

      file.modify(path, Array.isArray(oldValue) ? [...oldValue, ...newValue] : newValue);
    });
  };
}
