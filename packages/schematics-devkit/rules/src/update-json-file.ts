import { isJsonArray, JsonArray, JsonValue } from '@angular-devkit/core';
import { Rule, Tree } from '@angular-devkit/schematics';
import {
  addToJsonArray,
  JSONFile,
  removeFromJsonArray
} from '@criticalmanufacturing/schematics-devkit';

/**
 * Update any *.json file with new configuration
 * @param rules rules to insert
 */
export function updateJsonFile(
  filePath: string,
  rules: (
    | { path: string[]; value: JsonArray; operation?: 'add' | 'remove' | 'replace' }
    | { path: string[]; value: JsonValue; operation?: 'replace' }
    | { path: string[]; value: undefined; operation?: 'remove' }
  )[]
): Rule {
  return (tree: Tree) => {
    if (!tree.exists(filePath)) {
      return;
    }

    const file = new JSONFile(tree, filePath);

    rules.forEach(({ path, value, operation }) => {
      const oldValue = file.get(path);
      let newValue: JsonValue | undefined;
      if (
        value === undefined ||
        operation === 'replace' ||
        !(isJsonArray(value) && oldValue && isJsonArray(oldValue))
      ) {
        newValue = value;
      } else {
        newValue = [...oldValue];

        if (operation === 'add') {
          addToJsonArray(newValue, value);
        } else {
          removeFromJsonArray(newValue, value);
        }
      }

      file.modify(path, newValue);
    });
  };
}
