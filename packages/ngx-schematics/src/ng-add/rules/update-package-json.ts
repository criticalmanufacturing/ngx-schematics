import { Rule, Tree } from '@angular-devkit/schematics';
import { JSONFile } from '@criticalmanufacturing/schematics-devkit';

export function updatePackageJson(): Rule {
  return (tree: Tree) => {
    new JSONFile(tree, 'package.json').modify(['overrides'], {
      blockly: {
        jsdom: '$jsdom'
      }
    });
  };
}
