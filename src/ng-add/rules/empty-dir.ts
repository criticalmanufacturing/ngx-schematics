import { join, normalize } from '@angular-devkit/core';
import { Rule, Tree } from '@angular-devkit/schematics';

/**
 * Adds a set of packages to the package.json in the given host tree.
 */
export function emptyDir(sourcePath: string): Rule {
  return (tree: Tree) => {
    tree.getDir(sourcePath).subfiles.forEach((path) => {
      tree.delete(join(normalize(sourcePath), path));
    });
  };
}
