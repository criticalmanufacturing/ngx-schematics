import { join, normalize } from '@angular-devkit/core';
import { Rule, Tree } from '@angular-devkit/schematics';

/**
 * Removes the specified directory
 * @param sourcePath the directory path to remove
 */
export function removeDirectory(sourcePath: string): Rule {
  return (tree: Tree) => {
    tree.getDir(sourcePath).subfiles.forEach((path) => {
      tree.delete(join(normalize(sourcePath), path));
    });
  };
}
